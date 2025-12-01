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
  officeUpdateSchema,
  type DocumentCategoryType,
  type InsertPerson,
  type InsertRoleInOffice,
  type InsertConsent,
  type InsertRenewalAttachment,
  type PersonRoleTypeType,
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

  app.patch("/api/office/profile", ensureOffice, async (req, res) => {
    try {
      const user = (req as any).user;
      if (!user.officeId) {
        return res.status(404).json({ message: "No office associated" });
      }

      const parsed = officeUpdateSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid input", errors: parsed.error.errors });
      }

      const updatedOffice = await storage.updateOfficeProfile(user.officeId, parsed.data);
      res.json({ message: "Profile updated successfully", office: updatedOffice });
    } catch (error) {
      console.error("Profile update error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/office/change-password", ensureOffice, async (req, res) => {
    try {
      const user = (req as any).user;
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "Current and new password are required" });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ message: "New password must be at least 6 characters" });
      }

      const fullUser = await storage.getUser(user.id);
      if (!fullUser) {
        return res.status(404).json({ message: "User not found" });
      }

      const isValid = await bcrypt.compare(currentPassword, fullUser.passwordHash);
      if (!isValid) {
        return res.status(400).json({ message: "Current password is incorrect" });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await storage.updateUserPassword(user.id, hashedPassword);

      res.json({ message: "Password changed successfully" });
    } catch (error) {
      console.error("Password change error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
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
    const renewalId = parseInt(req.params.id);
    
    if (isNaN(renewalId)) {
      return res.status(400).json({ message: "Invalid renewal ID" });
    }
    
    const renewal = await storage.getRenewal(renewalId);
    
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
    const renewalId = parseInt(req.params.id);
    
    if (isNaN(renewalId)) {
      return res.status(400).json({ message: "Invalid renewal ID" });
    }
    
    const renewal = await storage.getRenewal(renewalId);

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
    const renewalId = parseInt(req.params.id);
    
    if (isNaN(renewalId)) {
      return res.status(400).json({ message: "Invalid renewal ID" });
    }
    
    const renewal = await storage.getRenewal(renewalId);

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

  app.get("/api/admin/audit-logs", ensureAdmin, async (req, res) => {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    
    const logs = await storage.getAuditLogs(limit, offset);
    const total = await storage.getAuditLogsCount();
    
    const logsWithUser = await Promise.all(
      logs.map(async (log) => {
        const user = await storage.getUser(log.userId);
        return { ...log, user: { email: user?.email } };
      })
    );
    
    res.json({ logs: logsWithUser, total, limit, offset });
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
    const officeId = parseInt(req.params.id);
    if (isNaN(officeId)) {
      return res.status(400).json({ message: "Invalid office ID" });
    }
    
    const office = await storage.getOffice(officeId);
    if (!office) {
      return res.status(404).json({ message: "Office not found" });
    }

    const branches = await storage.getBranches(office.id);
    const documents = await storage.getDocuments(office.id);

    res.json({ office, branches, documents });
  });

  app.post("/api/admin/offices/:id/approve", ensureAdmin, async (req, res) => {
    const user = (req as any).user;
    const officeId = parseInt(req.params.id);
    if (isNaN(officeId)) {
      return res.status(400).json({ message: "Invalid office ID" });
    }
    
    const office = await storage.getOffice(officeId);
    if (!office) {
      return res.status(404).json({ message: "Office not found" });
    }

    await storage.updateOfficeStatus(office.id, "ACTIVE");

    await storage.createAuditLog({
      userId: user.id,
      action: "OFFICE_APPROVED",
      targetType: "office",
      targetId: office.id,
      details: { officeName: office.tradeNameAr }
    });

    sendAccountApprovedEmail(office.mainEmail || "", office.tradeNameAr);

    res.json({ message: "Office approved successfully" });
  });

  app.post("/api/admin/offices/:id/reject", ensureAdmin, async (req, res) => {
    const user = (req as any).user;
    const officeId = parseInt(req.params.id);
    if (isNaN(officeId)) {
      return res.status(400).json({ message: "Invalid office ID" });
    }
    
    const office = await storage.getOffice(officeId);
    if (!office) {
      return res.status(404).json({ message: "Office not found" });
    }

    const { comment } = req.body;
    await storage.updateOfficeStatus(office.id, "REJECTED", comment);

    await storage.createAuditLog({
      userId: user.id,
      action: "OFFICE_REJECTED",
      targetType: "office",
      targetId: office.id,
      details: { officeName: office.tradeNameAr, comment }
    });

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

  app.get("/api/admin/staff", ensureAdmin, async (req, res) => {
    try {
      const offices = await storage.getAllOffices();
      const staffData: any[] = [];

      for (const office of offices) {
        const people = await storage.getPeopleByOffice(office.id);
        
        for (const person of people) {
          const roles = await storage.getRolesByPerson(person.id);
          
          for (const role of roles) {
            staffData.push({
              person,
              role,
              office,
            });
          }
        }
      }

      res.json(staffData);
    } catch (error) {
      console.error("Get admin staff error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // KPI Dashboard endpoint for admin - must be before :id route
  app.get("/api/admin/renewals/kpis", ensureAdmin, async (req, res) => {
    try {
      const kpis = await storage.getRenewalKPIs();
      res.json(kpis);
    } catch (error) {
      console.error("Get renewal KPIs error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/admin/renewals/:id", ensureAdmin, async (req, res) => {
    const renewalId = parseInt(req.params.id);
    if (isNaN(renewalId)) {
      return res.status(400).json({ message: "Invalid renewal ID" });
    }
    
    const renewal = await storage.getRenewal(renewalId);
    if (!renewal) {
      return res.status(404).json({ message: "Renewal not found" });
    }

    const office = await storage.getOffice(renewal.officeId);

    res.json({ renewal, office });
  });

  app.post("/api/admin/renewals/:id/approve-download", ensureAdmin, async (req, res) => {
    const user = (req as any).user;
    const renewalId = parseInt(req.params.id);
    if (isNaN(renewalId)) {
      return res.status(400).json({ message: "Invalid renewal ID" });
    }
    
    const renewal = await storage.getRenewal(renewalId);
    if (!renewal) {
      return res.status(404).json({ message: "Renewal not found" });
    }

    await storage.updateRenewalStatus(renewal.id, "APPROVED_FOR_DOWNLOAD");

    const office = await storage.getOffice(renewal.officeId);
    
    await storage.createAuditLog({
      userId: user.id,
      action: "RENEWAL_APPROVED_FOR_DOWNLOAD",
      targetType: "renewal",
      targetId: renewal.id,
      details: { officeName: office?.tradeNameAr, year: renewal.year }
    });

    sendRenewalApprovedForDownloadEmail(office?.mainEmail || "", office?.tradeNameAr || "", renewal.year);

    res.json({ message: "Renewal approved for download" });
  });

  app.post("/api/admin/renewals/:id/final-approve", ensureAdmin, async (req, res) => {
    const user = (req as any).user;
    const renewalId = parseInt(req.params.id);
    if (isNaN(renewalId)) {
      return res.status(400).json({ message: "Invalid renewal ID" });
    }
    
    const renewal = await storage.getRenewal(renewalId);
    if (!renewal) {
      return res.status(404).json({ message: "Renewal not found" });
    }

    await storage.updateRenewalStatus(renewal.id, "FINAL_APPROVED");

    const office = await storage.getOffice(renewal.officeId);
    
    await storage.createAuditLog({
      userId: user.id,
      action: "RENEWAL_FINAL_APPROVED",
      targetType: "renewal",
      targetId: renewal.id,
      details: { officeName: office?.tradeNameAr, year: renewal.year }
    });

    sendRenewalFinalApprovedEmail(office?.mainEmail || "", office?.tradeNameAr || "", renewal.year);

    res.json({ message: "Renewal fully approved" });
  });

  app.post("/api/admin/renewals/:id/reject", ensureAdmin, async (req, res) => {
    const user = (req as any).user;
    const renewalId = parseInt(req.params.id);
    if (isNaN(renewalId)) {
      return res.status(400).json({ message: "Invalid renewal ID" });
    }
    
    const renewal = await storage.getRenewal(renewalId);
    if (!renewal) {
      return res.status(404).json({ message: "Renewal not found" });
    }

    const { comment } = req.body;
    await storage.updateRenewalStatus(renewal.id, "REJECTED", comment);

    const office = await storage.getOffice(renewal.officeId);
    
    await storage.createAuditLog({
      userId: user.id,
      action: "RENEWAL_REJECTED",
      targetType: "renewal",
      targetId: renewal.id,
      details: { officeName: office?.tradeNameAr, year: renewal.year, comment }
    });

    sendRenewalRejectedEmail(office?.mainEmail || "", office?.tradeNameAr || "", renewal.year, comment);

    res.json({ message: "Renewal rejected" });
  });

  app.get("/api/documents/:id/download", ensureAuthenticated, async (req, res) => {
    const docId = parseInt(req.params.id);
    if (isNaN(docId)) {
      return res.status(400).json({ message: "Invalid document ID" });
    }
    
    const document = await storage.getDocument(docId);
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

  app.get("/api/documents/:id/preview", ensureAuthenticated, async (req, res) => {
    const docId = parseInt(req.params.id);
    if (isNaN(docId)) {
      return res.status(400).json({ message: "Invalid document ID" });
    }
    
    const document = await storage.getDocument(docId);
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

    const ext = path.extname(document.originalFilename).toLowerCase();
    const mimeTypes: Record<string, string> = {
      ".pdf": "application/pdf",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".gif": "image/gif",
      ".webp": "image/webp",
      ".txt": "text/plain",
    };

    const contentType = mimeTypes[ext] || "application/octet-stream";
    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Disposition", `inline; filename="${document.originalFilename}"`);
    
    const fileStream = fs.createReadStream(document.filePath);
    fileStream.pipe(res);
  });

  app.get("/api/documents/ministry/:renewalId/download", ensureAuthenticated, async (req, res) => {
    const renewalId = parseInt(req.params.renewalId);
    if (isNaN(renewalId)) {
      return res.status(400).json({ message: "Invalid renewal ID" });
    }
    
    const renewal = await storage.getRenewal(renewalId);
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

  // ==========================================
  // 2026 RENEWAL SYSTEM - Arabic Forms & New Workflow
  // ==========================================

  // Create renewal attachments directory
  const renewalDocsDir = path.join(uploadsDir, "renewal_2026");
  if (!fs.existsSync(renewalDocsDir)) fs.mkdirSync(renewalDocsDir, { recursive: true });

  const renewalUpload = multer({
    storage: multer.diskStorage({
      destination: renewalDocsDir,
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, uniqueSuffix + "-" + file.originalname);
      },
    }),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      const allowedTypes = [".pdf", ".jpg", ".jpeg", ".png", ".doc", ".docx"];
      const ext = path.extname(file.originalname).toLowerCase();
      if (allowedTypes.includes(ext)) {
        cb(null, true);
      } else {
        cb(new Error("Invalid file type. Allowed: PDF, JPG, PNG, DOC, DOCX"));
      }
    },
  });

  // Create new 2026 renewal for office
  app.post("/api/office/renewals-2026", ensureOffice, async (req, res) => {
    try {
      const user = (req as any).user;
      const currentYear = 2026;
      
      const existingRenewals = await storage.getRenewals(user.officeId);
      const hasActiveRenewal = existingRenewals.some(
        (r) => r.year === currentYear && r.status !== "REJECTED"
      );

      if (hasActiveRenewal) {
        return res.status(400).json({ message: "You already have an active renewal for 2026" });
      }

      const renewal = await storage.createRenewal({
        officeId: user.officeId,
        year: currentYear,
      });

      res.json(renewal);
    } catch (error) {
      console.error("Create renewal 2026 error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get renewal with full form data
  app.get("/api/office/renewals-2026/:id", ensureOffice, async (req, res) => {
    try {
      const user = (req as any).user;
      const renewalId = parseInt(req.params.id);
      
      if (isNaN(renewalId)) {
        return res.status(400).json({ message: "Invalid renewal ID" });
      }
      
      const renewal = await storage.getRenewal(renewalId);
      if (!renewal || renewal.officeId !== user.officeId) {
        return res.status(404).json({ message: "Renewal not found" });
      }

      const office = await storage.getOffice(user.officeId);
      const branches = await storage.getBranches(user.officeId);
      const peopleData = await storage.getPeopleByRenewal(renewalId);
      const rolesData = await storage.getRolesByRenewal(renewalId);
      const consentsData = await storage.getConsentsByRenewal(renewalId);
      const attachments = await storage.getRenewalAttachments(renewalId);

      res.json({
        renewal,
        office,
        branches,
        people: peopleData,
        roles: rolesData,
        consents: consentsData,
        attachments,
      });
    } catch (error) {
      console.error("Get renewal 2026 error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Form 1: Office Information 2026 - Save/Update
  app.post("/api/office/renewals-2026/:id/form-office", ensureOffice, async (req, res) => {
    try {
      const user = (req as any).user;
      const renewalId = parseInt(req.params.id);
      
      if (isNaN(renewalId)) {
        return res.status(400).json({ message: "Invalid renewal ID" });
      }
      
      const renewal = await storage.getRenewal(renewalId);
      if (!renewal || renewal.officeId !== user.officeId) {
        return res.status(404).json({ message: "Renewal not found" });
      }

      const { 
        officeData, 
        branches: branchesData 
      } = req.body;

      // Update office information using schema fields
      if (officeData) {
        await storage.updateOffice(user.officeId, {
          tradeNameAr: officeData.tradeNameAr,
          tradeNameEn: officeData.tradeNameEn,
          legalNameAr: officeData.legalNameAr,
          nationalEntityNo: officeData.nationalEntityNo,
          trademark: officeData.trademark,
          awqafApprovalNo: officeData.awqafApprovalNo,
          socialSecurityNumber: officeData.socialSecurityNumber,
          guaranteeExpiryDate: officeData.guaranteeExpiryDate,
          tourismActivities: officeData.tourismActivities,
          mainCity: officeData.mainCity,
          mainArea: officeData.mainArea,
          mainStreet: officeData.mainStreet,
          mainBuildingNumber: officeData.mainBuildingNumber,
          phone: officeData.phone,
          mobile: officeData.mobile,
          fax: officeData.fax,
          website: officeData.website,
          mainEmail: officeData.mainEmail,
          extraEmail: officeData.extraEmail,
          poBox: officeData.poBox,
          postalCode: officeData.postalCode,
        });
      }

      // Update branches - delete old and recreate
      if (Array.isArray(branchesData)) {
        await storage.deleteBranchesByOffice(user.officeId);
        for (const branch of branchesData) {
          await storage.createBranch({
            officeId: user.officeId,
            city: branch.city,
            area: branch.area,
            street: branch.street,
            buildingNumber: branch.buildingNumber,
            managerName: branch.managerName,
            managerMobile: branch.managerMobile,
            phone: branch.phone,
            fax: branch.fax,
          });
        }
      }

      // Mark office form as completed
      await storage.updateRenewal(renewalId, {
        officeFormCompleted: true,
      });

      res.json({ message: "Office form saved successfully" });
    } catch (error) {
      console.error("Form office save error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Form 2: Staff Information 2026 - Save/Update
  app.post("/api/office/renewals-2026/:id/form-staff", ensureOffice, async (req, res) => {
    try {
      const user = (req as any).user;
      const renewalId = parseInt(req.params.id);
      
      if (isNaN(renewalId)) {
        return res.status(400).json({ message: "Invalid renewal ID" });
      }
      
      const renewal = await storage.getRenewal(renewalId);
      if (!renewal || renewal.officeId !== user.officeId) {
        return res.status(404).json({ message: "Renewal not found" });
      }

      const { staffList } = req.body;

      if (!Array.isArray(staffList)) {
        return res.status(400).json({ message: "staffList must be an array" });
      }

      // Delete existing people and roles for this renewal
      await storage.deleteRolesByRenewal(renewalId);
      await storage.deletePeopleByRenewal(renewalId);

      // Create new people and roles using schema fields
      for (const staff of staffList) {
        const person = await storage.createPerson({
          officeId: user.officeId,
          renewalId: renewalId,
          fullNameAr: staff.fullNameAr,
          fullNameEn: staff.fullNameEn,
          nationalId: staff.nationalId,
          socialSecurityNo: staff.socialSecurityNo,
          nationality: staff.nationality,
          gender: staff.gender,
          motherName: staff.motherName,
          mobile: staff.mobile,
          birthDate: staff.birthDate,
          currentPosition: staff.currentPosition,
          startDate: staff.startDate,
          branch: staff.branch,
        });

        // Create role assignment
        await storage.createRoleInOffice({
          personId: person.id,
          officeId: user.officeId,
          renewalId: renewalId,
          roleType: staff.roleType as PersonRoleTypeType,
        });
      }

      // Mark staff form as completed
      await storage.updateRenewal(renewalId, {
        staffFormCompleted: true,
      });

      res.json({ message: "Staff form saved successfully" });
    } catch (error) {
      console.error("Form staff save error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Form 3: Commitment Form 2026 - Save
  app.post("/api/office/renewals-2026/:id/form-commitment", ensureOffice, async (req, res) => {
    try {
      const user = (req as any).user;
      const renewalId = parseInt(req.params.id);
      
      if (isNaN(renewalId)) {
        return res.status(400).json({ message: "Invalid renewal ID" });
      }
      
      const renewal = await storage.getRenewal(renewalId);
      if (!renewal || renewal.officeId !== user.officeId) {
        return res.status(404).json({ message: "Renewal not found" });
      }

      const { consents, complaintNumbers, notes } = req.body;
      const ipAddress = req.ip || req.socket?.remoteAddress || "unknown";
      const userAgent = req.headers["user-agent"] || "unknown";

      if (!Array.isArray(consents)) {
        return res.status(400).json({ message: "consents must be an array" });
      }

      // Create consent records using schema fields
      for (const consentType of consents) {
        await storage.createConsent({
          officeId: user.officeId,
          renewalId: renewalId,
          consentType: consentType,
          userId: user.id,
          ipAddress: ipAddress,
          userAgent: userAgent,
          payload: { complaintNumbers, notes },
        });
      }

      // Update renewal with commitment form completion
      await storage.updateRenewal(renewalId, {
        commitmentFormCompleted: true,
        reviewerNotes: notes,
      });

      res.json({ message: "Commitment form saved successfully" });
    } catch (error) {
      console.error("Form commitment save error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // ==========================================
  // STAFF FORM 2026 - Comprehensive Staff Data (Arabic)
  // POST /api/forms/staff-2026
  // ==========================================
  app.post("/api/forms/staff-2026", ensureOffice, async (req, res) => {
    try {
      const user = (req as any).user;
      const ipAddress = req.ip || req.socket?.remoteAddress || "unknown";
      const userAgent = req.headers["user-agent"] || "unknown";

      const { 
        officeId,
        ownersPartners = [],
        authorizedSignatories = [],
        dedicatedManagers = [],
        employees = [],
        consentAccepted
      } = req.body;

      // Validate office access
      if (officeId && officeId !== user.officeId) {
        return res.status(403).json({ message: "لا يمكنك الوصول إلى هذا المكتب" });
      }

      const targetOfficeId = officeId || user.officeId;

      // Validate consent
      if (!consentAccepted) {
        return res.status(400).json({ message: "يجب الموافقة على صحة البيانات قبل الحفظ" });
      }

      // Validate required managers
      if (dedicatedManagers.length === 0) {
        return res.status(400).json({ message: "مطلوب صف واحد على الأقل في مقطع المدير المتفرّغ" });
      }

      // Validate at least one owner/partner or authorized signatory
      if (ownersPartners.length === 0 && authorizedSignatories.length === 0) {
        return res.status(400).json({ 
          message: "مطلوب صف واحد على الأقل في مقطع المالك/الشركاء أو المفوّضين" 
        });
      }

      // Validate branches exist
      const branches = await storage.getBranches(targetOfficeId);
      const branchNames = branches.map(b => b.city || "الفرع الرئيسي");
      branchNames.push("الفرع الرئيسي"); // Always include main branch

      // Helper to validate and process person rows
      const validateRow = (row: any, section: string): string[] => {
        const errors: string[] = [];
        
        // Check if row has any data
        const hasData = Object.values(row).some(v => v && String(v).trim());
        if (!hasData) return errors; // Empty row is allowed (except for managers)

        // All-or-none validation: if any field has data, all required fields must be filled
        if (!row.fullNameAr || !row.fullNameAr.trim()) {
          errors.push(`${section}: الاسم الرباعي مطلوب`);
        } else {
          // Validate 4-part Arabic name
          const nameParts = row.fullNameAr.trim().split(/\s+/);
          if (nameParts.length < 4) {
            errors.push(`${section}: يرجى إدخال الاسم الرباعي كاملًا (4 أجزاء على الأقل)`);
          }
        }

        if (!row.fullNameEn || !row.fullNameEn.trim()) {
          errors.push(`${section}: الاسم باللغة الإنجليزية مطلوب`);
        } else if (!/^[a-zA-Z\s]+$/.test(row.fullNameEn)) {
          errors.push(`${section}: يرجى إدخال الاسم بالإنجليزية`);
        }

        if (!row.nationalId || !row.nationalId.trim()) {
          errors.push(`${section}: الرقم الوطني مطلوب`);
        } else if (!/^\d+$/.test(row.nationalId)) {
          errors.push(`${section}: الرقم الوطني يجب أن يكون أرقام فقط`);
        }

        if (!row.nationality || !row.nationality.trim()) {
          errors.push(`${section}: الجنسية مطلوبة`);
        }

        if (!row.gender || !row.gender.trim()) {
          errors.push(`${section}: الجنس مطلوب`);
        }

        if (!row.motherName || !row.motherName.trim()) {
          errors.push(`${section}: اسم الأم مطلوب`);
        }

        if (!row.mobile || !row.mobile.trim()) {
          errors.push(`${section}: رقم الموبايل مطلوب`);
        } else if (!/^07\d{8}$/.test(row.mobile)) {
          errors.push(`${section}: صيغة رقم الهاتف غير صحيحة (يجب أن يبدأ بـ 07 ويتكون من 10 أرقام)`);
        }

        if (!row.birthDate) {
          errors.push(`${section}: تاريخ الميلاد مطلوب`);
        } else if (new Date(row.birthDate) > new Date()) {
          errors.push(`${section}: تاريخ الميلاد لا يمكن أن يكون في المستقبل`);
        }

        if (!row.currentPosition || !row.currentPosition.trim()) {
          errors.push(`${section}: الوظيفة الحالية مطلوبة`);
        }

        if (!row.startDate) {
          errors.push(`${section}: تاريخ مباشرة العمل مطلوب`);
        } else if (new Date(row.startDate) > new Date()) {
          errors.push(`${section}: تاريخ مباشرة العمل لا يمكن أن يكون في المستقبل`);
        }

        return errors;
      };

      // Collect all validation errors
      const allErrors: string[] = [];
      const nationalIdSet = new Set<string>();

      // Process and validate all sections
      const processSection = (rows: any[], roleType: PersonRoleTypeType, sectionName: string) => {
        return rows.filter((row: any) => {
          const hasData = Object.values(row).some(v => v && String(v).trim());
          if (!hasData) return false;

          const errors = validateRow(row, sectionName);
          allErrors.push(...errors);

          // Check for duplicate national IDs
          if (row.nationalId) {
            if (nationalIdSet.has(row.nationalId)) {
              allErrors.push(`${sectionName}: الرقم الوطني ${row.nationalId} موجود مسبقًا`);
            } else {
              nationalIdSet.add(row.nationalId);
            }
          }

          return true;
        }).map((row: any) => ({ ...row, roleType }));
      };

      const validOwnersPartners = processSection(ownersPartners, "PARTNER", "المالك أو الشركاء");
      const validAuthorized = processSection(authorizedSignatories, "AUTHORIZED", "المفوّضون");
      const validManagers = processSection(dedicatedManagers, "DEDICATED_MANAGER", "المدير المتفرّغ");
      const validEmployees = processSection(employees, "EMPLOYEE", "الموظفون");

      // Return all validation errors
      if (allErrors.length > 0) {
        return res.status(400).json({ 
          message: "خطأ في التحقق من البيانات",
          errors: allErrors 
        });
      }

      // Combine all valid rows
      const allStaff = [
        ...validOwnersPartners,
        ...validAuthorized,
        ...validManagers,
        ...validEmployees,
      ];

      const upsertedPeople: any[] = [];

      // Upsert each person by national_id
      for (const staff of allStaff) {
        // Upsert person
        const person = await storage.upsertPersonByNationalId(targetOfficeId, staff.nationalId, {
          officeId: targetOfficeId,
          fullNameAr: staff.fullNameAr,
          fullNameEn: staff.fullNameEn,
          nationalId: staff.nationalId,
          socialSecurityNo: staff.socialSecurityNo || null,
          nationality: staff.nationality,
          gender: staff.gender,
          motherName: staff.motherName,
          mobile: staff.mobile,
          birthDate: staff.birthDate,
          currentPosition: staff.currentPosition,
          startDate: staff.startDate,
          branch: staff.branch || "الفرع الرئيسي",
        });

        // Delete existing roles for this person (to avoid duplicates)
        await storage.deleteRolesByPerson(person.id);

        // Create new role assignment
        await storage.createRoleInOffice({
          personId: person.id,
          officeId: targetOfficeId,
          roleType: staff.roleType as PersonRoleTypeType,
        });

        upsertedPeople.push(person);

        // Create audit log for upsert
        await storage.createAuditLog({
          userId: user.id,
          action: "PERSON_UPSERTED",
          targetType: "person",
          targetId: person.id,
          details: { 
            fullNameAr: staff.fullNameAr, 
            nationalId: staff.nationalId,
            roleType: staff.roleType,
            officeId: targetOfficeId,
          }
        });
      }

      // Log consent
      await storage.createConsent({
        officeId: targetOfficeId,
        userId: user.id,
        consentType: "DATA_ACCURACY",
        ipAddress: ipAddress,
        userAgent: userAgent,
        payload: { 
          formType: "staff-2026",
          staffCount: allStaff.length,
          sections: {
            ownersPartners: validOwnersPartners.length,
            authorizedSignatories: validAuthorized.length,
            dedicatedManagers: validManagers.length,
            employees: validEmployees.length,
          }
        },
      });

      // Create main audit log
      await storage.createAuditLog({
        userId: user.id,
        action: "STAFF_FORM_SAVED",
        targetType: "office",
        targetId: targetOfficeId,
        details: { 
          staffCount: allStaff.length,
          sections: {
            ownersPartners: validOwnersPartners.length,
            authorizedSignatories: validAuthorized.length,
            dedicatedManagers: validManagers.length,
            employees: validEmployees.length,
          }
        }
      });

      res.json({ 
        message: "تم حفظ نموذج معلومات العاملين بنجاح",
        savedCount: upsertedPeople.length,
        people: upsertedPeople,
      });
    } catch (error) {
      console.error("Staff form 2026 save error:", error);
      res.status(500).json({ message: "خطأ داخلي في الخادم" });
    }
  });

  // GET staff form data for an office
  app.get("/api/forms/staff-2026/:officeId", ensureAuthenticated, async (req, res) => {
    try {
      const user = (req as any).user;
      const officeId = parseInt(req.params.officeId);

      if (isNaN(officeId)) {
        return res.status(400).json({ message: "رقم المكتب غير صالح" });
      }

      // Check access
      if (user.role !== "ADMIN" && user.officeId !== officeId) {
        return res.status(403).json({ message: "لا يمكنك الوصول إلى هذا المكتب" });
      }

      const people = await storage.getPeopleByOffice(officeId);
      const roles = await storage.getRolesInOffice(officeId);
      const branches = await storage.getBranches(officeId);

      // Group people by role type
      const ownersPartners: any[] = [];
      const authorizedSignatories: any[] = [];
      const dedicatedManagers: any[] = [];
      const employees: any[] = [];

      for (const person of people) {
        const personRoles = roles.filter(r => r.personId === person.id);
        for (const role of personRoles) {
          const personData = {
            id: person.id,
            fullNameAr: person.fullNameAr,
            fullNameEn: person.fullNameEn,
            nationalId: person.nationalId,
            socialSecurityNo: person.socialSecurityNo,
            nationality: person.nationality,
            gender: person.gender,
            motherName: person.motherName,
            mobile: person.mobile,
            birthDate: person.birthDate,
            currentPosition: person.currentPosition,
            startDate: person.startDate,
            branch: person.branch,
          };

          switch (role.roleType) {
            case "PARTNER":
              ownersPartners.push(personData);
              break;
            case "AUTHORIZED":
              authorizedSignatories.push(personData);
              break;
            case "DEDICATED_MANAGER":
              dedicatedManagers.push(personData);
              break;
            case "EMPLOYEE":
              employees.push(personData);
              break;
          }
        }
      }

      res.json({
        officeId,
        ownersPartners,
        authorizedSignatories,
        dedicatedManagers,
        employees,
        branches: branches.map(b => ({ id: b.id, name: b.city || "الفرع الرئيسي" })),
      });
    } catch (error) {
      console.error("Get staff form data error:", error);
      res.status(500).json({ message: "خطأ داخلي في الخادم" });
    }
  });

  // DELETE a person from staff
  app.delete("/api/forms/staff-2026/person/:personId", ensureOffice, async (req, res) => {
    try {
      const user = (req as any).user;
      const personId = parseInt(req.params.personId);

      if (isNaN(personId)) {
        return res.status(400).json({ message: "رقم الشخص غير صالح" });
      }

      const person = await storage.getPerson(personId);
      if (!person || person.officeId !== user.officeId) {
        return res.status(404).json({ message: "الشخص غير موجود" });
      }

      // Delete roles first
      await storage.deleteRolesByPerson(personId);
      
      // Delete person
      await storage.deletePerson(personId);

      // Create audit log
      await storage.createAuditLog({
        userId: user.id,
        action: "PERSON_DELETED",
        targetType: "person",
        targetId: personId,
        details: { 
          fullNameAr: person.fullNameAr, 
          nationalId: person.nationalId,
          officeId: user.officeId,
        }
      });

      res.json({ message: "تم حذف الشخص بنجاح" });
    } catch (error) {
      console.error("Delete person error:", error);
      res.status(500).json({ message: "خطأ داخلي في الخادم" });
    }
  });

  // Upload renewal attachment
  app.post("/api/office/renewals-2026/:id/attachments", ensureOffice, renewalUpload.single("file"), async (req, res) => {
    try {
      const user = (req as any).user;
      const renewalId = parseInt(req.params.id);
      
      if (isNaN(renewalId)) {
        return res.status(400).json({ message: "Invalid renewal ID" });
      }
      
      const renewal = await storage.getRenewal(renewalId);
      if (!renewal || renewal.officeId !== user.officeId) {
        return res.status(404).json({ message: "Renewal not found" });
      }

      const file = req.file;
      if (!file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const { category } = req.body;
      const validCategories = [
        "PACK_1_FINANCIAL_DOCS",
        "PACK_2_LEGAL_DOCS", 
        "PACK_3_INSURANCE_DOCS",
        "PACK_4_EMPLOYEE_DOCS",
        "PACK_5_OTHER_DOCS",
      ];

      if (!validCategories.includes(category)) {
        fs.unlinkSync(file.path);
        return res.status(400).json({ message: "Invalid document category" });
      }

      // Use fileUrl and fileName per schema
      const attachment = await storage.createRenewalAttachment({
        renewalId: renewalId,
        officeId: user.officeId,
        category: category as DocumentCategoryType,
        fileUrl: file.path,
        fileName: file.originalname,
        fileSize: file.size,
        mimeType: file.mimetype,
        uploadedByUserId: user.id,
      });

      res.json(attachment);
    } catch (error) {
      console.error("Upload attachment error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get renewal attachments
  app.get("/api/office/renewals-2026/:id/attachments", ensureOffice, async (req, res) => {
    try {
      const user = (req as any).user;
      const renewalId = parseInt(req.params.id);
      
      if (isNaN(renewalId)) {
        return res.status(400).json({ message: "Invalid renewal ID" });
      }
      
      const renewal = await storage.getRenewal(renewalId);
      if (!renewal || renewal.officeId !== user.officeId) {
        return res.status(404).json({ message: "Renewal not found" });
      }

      const attachments = await storage.getRenewalAttachments(renewalId);
      res.json(attachments);
    } catch (error) {
      console.error("Get attachments error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Delete renewal attachment
  app.delete("/api/office/renewals-2026/:id/attachments/:attachmentId", ensureOffice, async (req, res) => {
    try {
      const user = (req as any).user;
      const renewalId = parseInt(req.params.id);
      const attachmentId = parseInt(req.params.attachmentId);
      
      if (isNaN(renewalId) || isNaN(attachmentId)) {
        return res.status(400).json({ message: "Invalid ID" });
      }
      
      const renewal = await storage.getRenewal(renewalId);
      if (!renewal || renewal.officeId !== user.officeId) {
        return res.status(404).json({ message: "Renewal not found" });
      }

      const attachments = await storage.getRenewalAttachments(renewalId);
      const attachment = attachments.find(a => a.id === attachmentId);
      
      if (!attachment) {
        return res.status(404).json({ message: "Attachment not found" });
      }

      // Delete file from disk (use fileUrl per schema)
      if (fs.existsSync(attachment.fileUrl)) {
        fs.unlinkSync(attachment.fileUrl);
      }

      await storage.deleteRenewalAttachment(attachmentId);
      res.json({ message: "Attachment deleted successfully" });
    } catch (error) {
      console.error("Delete attachment error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Submit renewal (final submission triggers n8n webhook)
  app.post("/api/office/renewals-2026/:id/submit", ensureOffice, async (req, res) => {
    try {
      const user = (req as any).user;
      const renewalId = parseInt(req.params.id);
      
      if (isNaN(renewalId)) {
        return res.status(400).json({ message: "Invalid renewal ID" });
      }
      
      const renewal = await storage.getRenewal(renewalId);
      if (!renewal || renewal.officeId !== user.officeId) {
        return res.status(404).json({ message: "Renewal not found" });
      }

      // Validate all forms are completed
      if (!renewal.officeFormCompleted || !renewal.staffFormCompleted || !renewal.commitmentFormCompleted) {
        return res.status(400).json({ 
          message: "Please complete all forms before submitting",
          incompleteFields: {
            officeForm: !renewal.officeFormCompleted,
            staffForm: !renewal.staffFormCompleted,
            commitmentForm: !renewal.commitmentFormCompleted,
          }
        });
      }

      // Validate attachments - check at least one in each required pack
      const attachments = await storage.getRenewalAttachments(renewalId);
      const hasFinancial = attachments.some(a => a.category === "PACK_1_FINANCIAL_DOCS");
      const hasLegal = attachments.some(a => a.category === "PACK_2_LEGAL_DOCS");
      const hasInsurance = attachments.some(a => a.category === "PACK_3_INSURANCE_DOCS");

      if (!hasFinancial || !hasLegal || !hasInsurance) {
        return res.status(400).json({ 
          message: "Please upload required documents in all mandatory packs",
          missingPacks: {
            pack1: !hasFinancial,
            pack2: !hasLegal,
            pack3: !hasInsurance,
          }
        });
      }

      // Update renewal status to submitted
      await storage.updateRenewal(renewalId, {
        status: "SUBMITTED",
      });

      const office = await storage.getOffice(user.officeId);
      const peopleData = await storage.getPeopleByRenewal(renewalId);

      // Trigger n8n webhook for new submission
      await triggerN8nWebhook("renewal_submitted", {
        renewalId: renewal.id,
        officeId: renewal.officeId,
        officeName: office?.tradeNameAr,
        year: renewal.year,
        staffCount: peopleData.length,
        submittedAt: new Date().toISOString(),
      });

      // Create audit log
      await storage.createAuditLog({
        userId: user.id,
        action: "RENEWAL_SUBMITTED",
        targetType: "renewal",
        targetId: renewal.id,
        details: { officeName: office?.tradeNameAr, year: renewal.year }
      });

      // Send notification email
      sendRenewalRequestedEmail("atallaabutaha@gmail.com", office?.tradeNameAr || "Unknown Office", renewal.year);

      res.json({ message: "Renewal submitted successfully" });
    } catch (error) {
      console.error("Submit renewal error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Admin: Get renewal 2026 with full data
  app.get("/api/admin/renewals-2026/:id", ensureAdmin, async (req, res) => {
    try {
      const renewalId = parseInt(req.params.id);
      if (isNaN(renewalId)) {
        return res.status(400).json({ message: "Invalid renewal ID" });
      }
      
      const renewal = await storage.getRenewal(renewalId);
      if (!renewal) {
        return res.status(404).json({ message: "Renewal not found" });
      }

      const office = await storage.getOffice(renewal.officeId);
      const branches = await storage.getBranches(renewal.officeId);
      const peopleData = await storage.getPeopleByRenewal(renewalId);
      const rolesData = await storage.getRolesByRenewal(renewalId);
      const consentsData = await storage.getConsentsByRenewal(renewalId);
      const attachments = await storage.getRenewalAttachments(renewalId);

      res.json({
        renewal,
        office,
        branches,
        people: peopleData,
        roles: rolesData,
        consents: consentsData,
        attachments,
      });
    } catch (error) {
      console.error("Admin get renewal 2026 error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // ============ Commitment Form Routes ============

  // Office: Get commitment form for office
  app.get("/api/office/commitment-form", ensureOffice, async (req, res) => {
    try {
      const user = (req as any).user;
      const renewalId = req.query.renewalId ? parseInt(req.query.renewalId as string) : undefined;
      
      const form = await storage.getCommitmentFormByOffice(user.officeId, renewalId);
      if (!form) {
        return res.json(null);
      }

      const complaints = await storage.getComplaintsByCommitment(form.id);
      res.json({ ...form, complaints });
    } catch (error) {
      console.error("Get commitment form error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Office: Submit commitment form
  app.post("/api/office/commitment-form", ensureOffice, async (req, res) => {
    try {
      const user = (req as any).user;
      const office = await storage.getOffice(user.officeId);
      if (!office) {
        return res.status(404).json({ message: "Office not found" });
      }

      const { officeName, licenseNo, contactName, contactEmail, contactMobile, hasComplaints, complaints, consentAccepted, renewalId } = req.body;

      if (!consentAccepted) {
        return res.status(400).json({ message: "يجب الموافقة على التعهد" });
      }

      // Check for existing commitment form for this office/renewal
      const existingForm = await storage.getCommitmentFormByOffice(user.officeId, renewalId);
      if (existingForm) {
        // Delete old complaints and update form
        await storage.deleteComplaintsByCommitment(existingForm.id);
      }

      // Create new commitment form
      const ipAddress = req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || '';
      const userAgent = req.headers['user-agent'] || '';

      const form = await storage.createCommitmentForm({
        officeId: user.officeId,
        renewalId: renewalId || null,
        officeName,
        licenseNo,
        contactName,
        contactEmail,
        contactMobile,
        hasComplaints: hasComplaints || false,
        consentAccepted: true,
        ipAddress,
        userAgent,
      });

      // Create complaints if any
      if (hasComplaints && complaints && complaints.length > 0) {
        for (const complaint of complaints) {
          await storage.createComplaint({
            officeId: user.officeId,
            renewalId: renewalId || null,
            commitmentId: form.id,
            complaintNumber: complaint.complaintNumber,
            authority: complaint.authority,
            notifiedAt: complaint.notifiedAt,
            summary: complaint.summary || null,
            proposedAction: complaint.proposedAction || null,
          });
        }
      }

      // Update renewal if linked
      if (renewalId) {
        await storage.updateRenewal(renewalId, { commitmentFormCompleted: true });
      }

      // Create consent record
      await storage.createConsent({
        officeId: user.officeId,
        renewalId: renewalId || null,
        userId: user.id,
        consentType: "COMPLAINT_COMMITMENT",
        ipAddress,
        userAgent,
        payload: {
          formId: form.id,
          hasComplaints,
          complaintsCount: complaints?.length || 0,
          commitmentText: "أوافق على بذل أقصى جهد لتسوية الشكوى/الشكاوى المقدَّمة إلى الجمعية/الوزارة بحق المكتب، وتزويد الجهة المختصة بما يثبت ذلك خلال مدة أقصاها 30 يومًا من تاريخ الإشعار، وتحت طائلة الإحالة إلى المجلس التأديبي في حال وجود شكاوى مُحِقّة بقرار من لجنة الشكاوى."
        },
      });

      // Create audit log
      await storage.createAuditLog({
        userId: user.id,
        action: "COMMITMENT_FORM_SUBMITTED",
        targetType: "commitment_form",
        targetId: form.id,
        details: { 
          officeName: office.tradeNameAr, 
          hasComplaints, 
          complaintsCount: complaints?.length || 0 
        }
      });

      // Trigger n8n webhook
      await triggerN8nWebhook("commitment_form_submitted", {
        formId: form.id,
        officeId: user.officeId,
        officeName: office.tradeNameAr,
        hasComplaints,
        complaintsCount: complaints?.length || 0,
        submittedAt: new Date().toISOString(),
      });

      res.json({ ok: true, data: { commitmentId: form.id } });
    } catch (error) {
      console.error("Submit commitment form error:", error);
      res.status(500).json({ ok: false, error: { code: "INTERNAL_ERROR", message: "Internal server error" } });
    }
  });

  // Admin: Get all commitment forms
  app.get("/api/admin/commitment-forms", ensureAdmin, async (req, res) => {
    try {
      const forms = await storage.getAllCommitmentForms();
      
      const formsWithDetails = await Promise.all(
        forms.map(async (form) => {
          const office = await storage.getOffice(form.officeId);
          const complaints = await storage.getComplaintsByCommitment(form.id);
          return { ...form, office, complaints };
        })
      );
      
      res.json(formsWithDetails);
    } catch (error) {
      console.error("Get commitment forms error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Admin: Get commitment form by ID
  app.get("/api/admin/commitment-forms/:id", ensureAdmin, async (req, res) => {
    try {
      const formId = parseInt(req.params.id);
      if (isNaN(formId)) {
        return res.status(400).json({ message: "Invalid form ID" });
      }
      
      const form = await storage.getCommitmentForm(formId);
      if (!form) {
        return res.status(404).json({ message: "Form not found" });
      }

      const office = await storage.getOffice(form.officeId);
      const complaints = await storage.getComplaintsByCommitment(form.id);
      
      res.json({ ...form, office, complaints });
    } catch (error) {
      console.error("Get commitment form error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Admin: Get commitment form by office ID
  app.get("/api/admin/offices/:id/commitment-form", ensureAdmin, async (req, res) => {
    try {
      const officeId = parseInt(req.params.id);
      if (isNaN(officeId)) {
        return res.status(400).json({ message: "Invalid office ID" });
      }
      
      const form = await storage.getCommitmentFormByOffice(officeId);
      if (!form) {
        return res.json(null);
      }

      const complaints = await storage.getComplaintsByCommitment(form.id);
      res.json({ ...form, complaints });
    } catch (error) {
      console.error("Get office commitment form error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // n8n webhook trigger helper function
  async function triggerN8nWebhook(eventType: string, data: any) {
    const webhookUrl = process.env.N8N_WEBHOOK_URL;
    if (!webhookUrl) {
      console.log(`[n8n] Webhook not configured. Event: ${eventType}`, data);
      return;
    }

    try {
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          eventType,
          timestamp: new Date().toISOString(),
          ...data,
        }),
      });
      
      if (!response.ok) {
        console.error(`[n8n] Webhook failed: ${response.status}`);
      } else {
        console.log(`[n8n] Webhook sent: ${eventType}`);
      }
    } catch (error) {
      console.error(`[n8n] Webhook error:`, error);
    }
  }

  const httpServer = createServer(app);
  return httpServer;
}
