import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import multer from "multer";
import path from "path";
import fs from "fs";
import bcrypt from "bcryptjs";
import { storage } from "./storage";
import { generateRenewalPDF } from "./pdf";
import {
  sendAccountApprovedEmail,
  sendAccountRejectedEmail,
  sendRenewalRequestedEmail,
  sendRenewalApprovedForDownloadEmail,
  sendMinistryDocUploadedEmail,
  sendRenewalFinalApprovedEmail,
  sendRenewalRejectedEmail,
} from "./email";
import {
  registerSchema,
  loginSchema,
  officeInfoSchema,
  type DocumentCategoryType,
} from "@shared/schema";

declare module "express-session" {
  interface SessionData {
    userId?: number;
  }
}

const uploadsDir = path.join(process.cwd(), "uploads");
const initialDir = path.join(uploadsDir, "initial");
const ministryDir = path.join(uploadsDir, "ministry_docs");

if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
if (!fs.existsSync(initialDir)) fs.mkdirSync(initialDir, { recursive: true });
if (!fs.existsSync(ministryDir)) fs.mkdirSync(ministryDir, { recursive: true });

const initialUpload = multer({
  storage: multer.diskStorage({
    destination: initialDir,
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      cb(null, uniqueSuffix + "-" + file.originalname);
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
});

const ministryUpload = multer({
  storage: multer.diskStorage({
    destination: ministryDir,
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      cb(null, uniqueSuffix + "-" + file.originalname);
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
});

async function ensureAuthenticated(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  const user = await storage.getUser(req.session.userId);
  if (!user) {
    return res.status(401).json({ message: "User not found" });
  }
  (req as any).user = user;
  next();
}

async function ensureAdmin(req: Request, res: Response, next: NextFunction) {
  await ensureAuthenticated(req, res, () => {
    const user = (req as any).user;
    if (user?.role !== "ADMIN") {
      return res.status(403).json({ message: "Admin access required" });
    }
    next();
  });
}

async function ensureOffice(req: Request, res: Response, next: NextFunction) {
  await ensureAuthenticated(req, res, async () => {
    const user = (req as any).user;
    if (user?.role !== "OFFICE") {
      return res.status(403).json({ message: "Office access required" });
    }
    if (user.officeId) {
      const office = await storage.getOffice(user.officeId);
      if (office?.status !== "ACTIVE") {
        return res.status(403).json({ message: "Your office is not active. Please wait for approval." });
      }
    }
    next();
  });
}

export async function registerRoutes(app: Express): Promise<Server> {
  await storage.seedAdminUser();

  app.use(
    session({
      secret: process.env.SESSION_SECRET || "tourism-portal-secret-key-change-in-production",
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: false,
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000,
      },
    })
  );

  app.get("/api/auth/me", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const user = await storage.getUser(req.session.userId);
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    let office = null;
    if (user.officeId) {
      office = await storage.getOffice(user.officeId);
    }

    res.json({
      id: user.id,
      email: user.email,
      role: user.role,
      officeId: user.officeId,
      office,
    });
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const parsed = loginSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid input", errors: parsed.error.errors });
      }

      const { email, password } = parsed.data;
      const user = await storage.getUserByEmail(email);

      if (!user) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      const isValid = await bcrypt.compare(password, user.passwordHash);
      if (!isValid) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      if (user.role === "OFFICE" && user.officeId) {
        const office = await storage.getOffice(user.officeId);
        if (office?.status !== "ACTIVE") {
          return res.status(403).json({ 
            message: "Your account is pending approval. Please wait for the association to activate your account." 
          });
        }
      }

      req.session.userId = user.id;

      let office = null;
      if (user.officeId) {
        office = await storage.getOffice(user.officeId);
      }

      res.json({
        message: "Login successful",
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          officeId: user.officeId,
          office,
        },
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/auth/register", initialUpload.array("documents", 20), async (req, res) => {
    try {
      const accountData = JSON.parse(req.body.account);
      const officeData = JSON.parse(req.body.office);
      const branchesData = JSON.parse(req.body.branches || "[]");
      const documentCategories = req.body.documentCategories 
        ? (Array.isArray(req.body.documentCategories) ? req.body.documentCategories : [req.body.documentCategories])
        : [];

      const accountParsed = registerSchema.safeParse(accountData);
      if (!accountParsed.success) {
        return res.status(400).json({ message: "Invalid account data", errors: accountParsed.error.errors });
      }

      const officeParsed = officeInfoSchema.safeParse(officeData);
      if (!officeParsed.success) {
        return res.status(400).json({ message: "Invalid office data", errors: officeParsed.error.errors });
      }

      const existingUser = await storage.getUserByEmail(accountParsed.data.email);
      if (existingUser) {
        return res.status(400).json({ message: "An account with this email already exists" });
      }

      const office = await storage.createOffice(officeParsed.data);

      const passwordHash = await bcrypt.hash(accountParsed.data.password, 10);
      const user = await storage.createUser({
        email: accountParsed.data.email,
        passwordHash,
        role: "OFFICE",
        officeId: office.id,
      });

      for (const branch of branchesData) {
        await storage.createBranch({
          ...branch,
          officeId: office.id,
        });
      }

      const files = req.files as Express.Multer.File[];
      if (files && files.length > 0) {
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const category = documentCategories[i] || "INITIAL_FIRST_FORMS";
          await storage.createDocument({
            officeId: office.id,
            renewalId: null,
            category: category as DocumentCategoryType,
            filePath: file.path,
            originalFilename: file.originalname,
            uploadedByUserId: user.id,
          });
        }
      }

      res.json({
        message: "Registration submitted successfully",
        officeId: office.id,
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Failed to logout" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/office/profile", ensureOffice, async (req, res) => {
    const user = (req as any).user;
    if (!user.officeId) {
      return res.status(404).json({ message: "No office associated" });
    }
    const office = await storage.getOffice(user.officeId);
    res.json(office);
  });

  app.get("/api/office/documents", ensureOffice, async (req, res) => {
    const user = (req as any).user;
    const documents = await storage.getDocuments(user.officeId);
    res.json(documents);
  });

  app.get("/api/office/renewals", ensureOffice, async (req, res) => {
    const user = (req as any).user;
    const renewals = await storage.getRenewals(user.officeId);
    res.json(renewals);
  });

  app.get("/api/office/renewals/:id", ensureOffice, async (req, res) => {
    const user = (req as any).user;
    const renewal = await storage.getRenewal(parseInt(req.params.id));
    
    if (!renewal || renewal.officeId !== user.officeId) {
      return res.status(404).json({ message: "Renewal not found" });
    }
    
    res.json(renewal);
  });

  app.post("/api/office/renewals", ensureOffice, async (req, res) => {
    const user = (req as any).user;
    const currentYear = new Date().getFullYear();

    const existingRenewals = await storage.getRenewals(user.officeId);
    const hasActiveRenewal = existingRenewals.some(
      (r) => r.year === currentYear && r.status !== "REJECTED"
    );

    if (hasActiveRenewal) {
      return res.status(400).json({ message: "You already have an active renewal for this year" });
    }

    const renewal = await storage.createRenewal({
      officeId: user.officeId,
      year: currentYear,
    });

    const office = await storage.getOffice(user.officeId);
    sendRenewalRequestedEmail("atallaabutaha@gmail.com", office?.tradeNameAr || "Unknown Office", currentYear);

    res.json(renewal);
  });

  app.get("/api/office/renewals/:id/download", ensureOffice, async (req, res) => {
    const user = (req as any).user;
    const renewal = await storage.getRenewal(parseInt(req.params.id));

    if (!renewal || renewal.officeId !== user.officeId) {
      return res.status(404).json({ message: "Renewal not found" });
    }

    if (renewal.status !== "APPROVED_FOR_DOWNLOAD") {
      return res.status(400).json({ message: "Renewal is not approved for download yet" });
    }

    const office = await storage.getOffice(user.officeId);
    if (!office) {
      return res.status(404).json({ message: "Office not found" });
    }

    const pdfStream = generateRenewalPDF(office, renewal);
    
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=renewal-${renewal.year}-${office.id}.pdf`);
    
    pdfStream.pipe(res);
  });

  app.post("/api/office/renewals/:id/upload-ministry-doc", ensureOffice, ministryUpload.single("document"), async (req, res) => {
    const user = (req as any).user;
    const renewal = await storage.getRenewal(parseInt(req.params.id));

    if (!renewal || renewal.officeId !== user.officeId) {
      return res.status(404).json({ message: "Renewal not found" });
    }

    if (renewal.status !== "APPROVED_FOR_DOWNLOAD" && renewal.status !== "MINISTRY_DOC_UPLOADED") {
      return res.status(400).json({ message: "Cannot upload ministry document at this stage" });
    }

    const file = req.file;
    if (!file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    await storage.updateRenewalMinistryDoc(renewal.id, file.path);

    const office = await storage.getOffice(user.officeId);
    sendMinistryDocUploadedEmail("atallaabutaha@gmail.com", office?.tradeNameAr || "Unknown Office", renewal.year);

    res.json({ message: "Ministry document uploaded successfully" });
  });

  app.get("/api/admin/stats", ensureAdmin, async (req, res) => {
    const stats = await storage.getStats();
    res.json(stats);
  });

  app.get("/api/admin/offices", ensureAdmin, async (req, res) => {
    const status = req.query.status as string | undefined;
    
    let offices;
    if (status && status !== "all") {
      offices = await storage.getOfficesByStatus(status as any);
    } else {
      offices = await storage.getAllOffices();
    }
    
    res.json(offices);
  });

  app.get("/api/admin/offices/:id", ensureAdmin, async (req, res) => {
    const office = await storage.getOffice(parseInt(req.params.id));
    if (!office) {
      return res.status(404).json({ message: "Office not found" });
    }

    const branches = await storage.getBranches(office.id);
    const documents = await storage.getDocuments(office.id);

    res.json({ office, branches, documents });
  });

  app.post("/api/admin/offices/:id/approve", ensureAdmin, async (req, res) => {
    const office = await storage.getOffice(parseInt(req.params.id));
    if (!office) {
      return res.status(404).json({ message: "Office not found" });
    }

    await storage.updateOfficeStatus(office.id, "ACTIVE");

    sendAccountApprovedEmail(office.mainEmail || "", office.tradeNameAr);

    res.json({ message: "Office approved successfully" });
  });

  app.post("/api/admin/offices/:id/reject", ensureAdmin, async (req, res) => {
    const office = await storage.getOffice(parseInt(req.params.id));
    if (!office) {
      return res.status(404).json({ message: "Office not found" });
    }

    const { comment } = req.body;
    await storage.updateOfficeStatus(office.id, "REJECTED", comment);

    sendAccountRejectedEmail(office.mainEmail || "", office.tradeNameAr, comment);

    res.json({ message: "Office rejected" });
  });

  app.get("/api/admin/renewals", ensureAdmin, async (req, res) => {
    const pending = req.query.pending === "true";
    
    let renewals;
    if (pending) {
      renewals = await storage.getPendingRenewals();
    } else {
      renewals = await storage.getAllRenewals();
    }

    const renewalsWithOffice = await Promise.all(
      renewals.map(async (renewal) => {
        const office = await storage.getOffice(renewal.officeId);
        return { ...renewal, office };
      })
    );

    res.json(renewalsWithOffice);
  });

  app.get("/api/admin/renewals/:id", ensureAdmin, async (req, res) => {
    const renewal = await storage.getRenewal(parseInt(req.params.id));
    if (!renewal) {
      return res.status(404).json({ message: "Renewal not found" });
    }

    const office = await storage.getOffice(renewal.officeId);

    res.json({ renewal, office });
  });

  app.post("/api/admin/renewals/:id/approve-download", ensureAdmin, async (req, res) => {
    const renewal = await storage.getRenewal(parseInt(req.params.id));
    if (!renewal) {
      return res.status(404).json({ message: "Renewal not found" });
    }

    await storage.updateRenewalStatus(renewal.id, "APPROVED_FOR_DOWNLOAD");

    const office = await storage.getOffice(renewal.officeId);
    sendRenewalApprovedForDownloadEmail(office?.mainEmail || "", office?.tradeNameAr || "", renewal.year);

    res.json({ message: "Renewal approved for download" });
  });

  app.post("/api/admin/renewals/:id/final-approve", ensureAdmin, async (req, res) => {
    const renewal = await storage.getRenewal(parseInt(req.params.id));
    if (!renewal) {
      return res.status(404).json({ message: "Renewal not found" });
    }

    await storage.updateRenewalStatus(renewal.id, "FINAL_APPROVED");

    const office = await storage.getOffice(renewal.officeId);
    sendRenewalFinalApprovedEmail(office?.mainEmail || "", office?.tradeNameAr || "", renewal.year);

    res.json({ message: "Renewal fully approved" });
  });

  app.post("/api/admin/renewals/:id/reject", ensureAdmin, async (req, res) => {
    const renewal = await storage.getRenewal(parseInt(req.params.id));
    if (!renewal) {
      return res.status(404).json({ message: "Renewal not found" });
    }

    const { comment } = req.body;
    await storage.updateRenewalStatus(renewal.id, "REJECTED", comment);

    const office = await storage.getOffice(renewal.officeId);
    sendRenewalRejectedEmail(office?.mainEmail || "", office?.tradeNameAr || "", renewal.year, comment);

    res.json({ message: "Renewal rejected" });
  });

  app.get("/api/documents/:id/download", ensureAuthenticated, async (req, res) => {
    const document = await storage.getDocument(parseInt(req.params.id));
    if (!document) {
      return res.status(404).json({ message: "Document not found" });
    }

    const user = (req as any).user;
    if (user.role !== "ADMIN" && document.officeId !== user.officeId) {
      return res.status(403).json({ message: "Access denied" });
    }

    if (!fs.existsSync(document.filePath)) {
      return res.status(404).json({ message: "File not found on server" });
    }

    res.download(document.filePath, document.originalFilename);
  });

  app.get("/api/documents/ministry/:renewalId/download", ensureAuthenticated, async (req, res) => {
    const renewal = await storage.getRenewal(parseInt(req.params.renewalId));
    if (!renewal || !renewal.ministryDocumentPath) {
      return res.status(404).json({ message: "Ministry document not found" });
    }

    const user = (req as any).user;
    if (user.role !== "ADMIN" && renewal.officeId !== user.officeId) {
      return res.status(403).json({ message: "Access denied" });
    }

    if (!fs.existsSync(renewal.ministryDocumentPath)) {
      return res.status(404).json({ message: "File not found on server" });
    }

    res.download(renewal.ministryDocumentPath);
  });

  const httpServer = createServer(app);
  return httpServer;
}
