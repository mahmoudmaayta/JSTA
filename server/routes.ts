import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import multer from "multer";
import path from "path";
import fs from "fs";
import bcrypt from "bcryptjs";
import { storage, pool } from "./storage";
import { generateRenewalPDF } from "./pdf";
import {
  loginRateLimiter,
  uploadRateLimiter,
  rateLimitMiddleware,
  getClientIp,
  validateFileMimeType,
  sanitizeFileName,
} from "./middleware/security";
import { env } from "./config/env";
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
  validateInvitationToken,
  redeemInvitationToken,
  createRenewalInvitation,
  sendBulkInvitations,
  resendInvitation,
  getInvitationStats,
  getOfficeRenewalStatus,
} from "./services/renewalInvitation";
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

async function ensureCanTransact2026(req: Request, res: Response, next: NextFunction) {
  await ensureOffice(req, res, async () => {
    const user = (req as any).user;
    if (!user?.officeId) {
      return res.status(403).json({ message: "Office not associated with user" });
    }

    const currentYear = new Date().getFullYear();
    if (currentYear < 2026) {
      return next();
    }

    const renewal = await storage.getRenewalByOfficeAndYear(user.officeId, 2026);
    
    if (!renewal || !renewal.canTransact2026) {
      return res.status(403).json({ 
        message: "2026 license renewal required",
        renewalRequired: true,
        redirectUrl: "/office/renewal-2026"
      });
    }
    
    next();
  });
}

export async function registerRoutes(app: Express): Promise<Server> {
  await storage.seedAdminUser();

  // Initialize PostgreSQL session store
  const PgStore = connectPgSimple(session);

  app.use(
    session({
      store: new PgStore({
        pool: pool,
        tableName: 'session',
        createTableIfMissing: true,
        // Cleanup expired sessions every hour
        pruneSessionInterval: 60 * 60, // 1 hour in seconds
      }),
      secret: env.SESSION_SECRET, // From validated environment
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: env.isProduction, // HTTP in dev, HTTPS in production
        httpOnly: true,
        sameSite: 'strict', // Strict CSRF protection
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
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

  app.post("/api/auth/login", rateLimitMiddleware(loginRateLimiter), async (req, res) => {
    try {
      const parsed = loginSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid input", errors: parsed.error.errors });
      }

      const { email, password } = parsed.data;
      const user = await storage.getUserByEmail(email);

      // Always perform bcrypt comparison to prevent timing attacks
      // Use a fake hash if user doesn't exist to maintain consistent timing
      const isValid = user
        ? await bcrypt.compare(password, user.passwordHash)
        : await bcrypt.compare(password, "$2a$10$invalidhashxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx");

      if (!user || !isValid) {
        // Log failed attempt for security monitoring
        await storage.createAuditLog({
          userId: user?.id || 0,
          action: "LOGIN_FAILED",
          targetType: "user",
          targetId: user?.id || 0,
          details: {
            email,
            ip: getClientIp(req),
            timestamp: new Date().toISOString(),
            userAgent: req.headers['user-agent'] || 'unknown'
          }
        });

        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Check office status for OFFICE role users
      if (user.role === "OFFICE" && user.officeId) {
        const office = await storage.getOffice(user.officeId);
        if (office?.status !== "ACTIVE") {
          await storage.createAuditLog({
            userId: user.id,
            action: "LOGIN_FAILED",
            targetType: "user",
            targetId: user.id,
            details: {
              email,
              ip: getClientIp(req),
              reason: "Office not active",
              officeStatus: office?.status,
              timestamp: new Date().toISOString()
            }
          });

          return res.status(403).json({
            message: "Your account is pending approval. Please wait for the association to activate your account."
          });
        }
      }

      req.session.userId = user.id;

      // Log successful login
      await storage.createAuditLog({
        userId: user.id,
        action: "LOGIN_SUCCESS",
        targetType: "user",
        targetId: user.id,
        details: {
          email,
          ip: getClientIp(req),
          timestamp: new Date().toISOString(),
          userAgent: req.headers['user-agent'] || 'unknown'
        }
      });

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

  // Helper function to sanitize strings by removing null bytes
  function sanitizeString(str: string | null | undefined): string {
    if (str === null || str === undefined) return '';
    // Remove null bytes and other problematic characters for UTF8
    return String(str).replace(/\x00/g, '');
  }

  function sanitizeObject<T extends Record<string, any>>(obj: T): T {
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        result[key] = sanitizeString(value);
      } else if (value === null || value === undefined) {
        result[key] = value;
      } else if (typeof value === 'object' && !Array.isArray(value)) {
        result[key] = sanitizeObject(value);
      } else if (Array.isArray(value)) {
        result[key] = value.map(item => 
          typeof item === 'object' && item !== null ? sanitizeObject(item) : 
          typeof item === 'string' ? sanitizeString(item) : item
        );
      } else {
        result[key] = value;
      }
    }
    return result as T;
  }

  app.post("/api/auth/register", rateLimitMiddleware(uploadRateLimiter), initialUpload.array("documents", 20), async (req, res) => {
    try {
      // Sanitize raw body strings before parsing to remove null bytes
      const sanitizedAccount = (req.body.account || '').replace(/\x00/g, '');
      const sanitizedOffice = (req.body.office || '').replace(/\x00/g, '');
      const sanitizedBranches = (req.body.branches || '[]').replace(/\x00/g, '');
      
      const accountData = sanitizeObject(JSON.parse(sanitizedAccount));
      const officeData = sanitizeObject(JSON.parse(sanitizedOffice));
      const branchesData = JSON.parse(sanitizedBranches).map((b: any) => sanitizeObject(b));
      const documentCategories = req.body.documentCategories 
        ? (Array.isArray(req.body.documentCategories) ? req.body.documentCategories : [req.body.documentCategories])
        : [];

      const accountParsed = registerSchema.safeParse(accountData);
      if (!accountParsed.success) {
        return res.status(400).json({ message: "Invalid account data", errors: accountParsed.error.errors });
      }

      const officeParsed = officeInfoSchema.safeParse(officeData);
      if (!officeParsed.success) {
        console.log("[Registration] Office validation failed:", JSON.stringify(officeParsed.error.errors, null, 2));
        console.log("[Registration] Office data received:", JSON.stringify(officeData, null, 2));
        return res.status(400).json({ 
          message: "Invalid office data", 
          errors: officeParsed.error.errors,
          details: officeParsed.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
        });
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

          // Validate MIME type matches file extension
          if (!validateFileMimeType(file.originalname, file.mimetype)) {
            // Delete already uploaded files
            files.forEach(f => {
              if (fs.existsSync(f.path)) fs.unlinkSync(f.path);
            });
            return res.status(400).json({
              message: `Invalid file type: ${file.originalname}. File extension doesn't match content type.`
            });
          }

          const category = documentCategories[i] || "INITIAL_FIRST_FORMS";
          await storage.createDocument({
            officeId: office.id,
            renewalId: null,
            category: category as DocumentCategoryType,
            filePath: file.path,
            originalFilename: sanitizeFileName(file.originalname),
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

  app.get("/api/office/form-completion-status", ensureOffice, async (req, res) => {
    try {
      const user = (req as any).user;
      if (!user.officeId) {
        return res.status(404).json({ message: "No office associated" });
      }

      const officeInfoForm = await storage.getOfficeInfoFormByOffice(user.officeId);
      const people = await storage.getPeopleByOffice(user.officeId);
      const roles = await storage.getRolesInOffice(user.officeId);
      const commitmentForm = await storage.getCommitmentFormByOffice(user.officeId);

      const officeInfoFormCompleted = !!officeInfoForm;
      const staffFormCompleted = people.length > 0 && roles.length > 0;
      const commitmentFormCompleted = !!commitmentForm;
      const allFormsCompleted = officeInfoFormCompleted && staffFormCompleted && commitmentFormCompleted;

      res.json({
        officeInfoFormCompleted,
        staffFormCompleted,
        commitmentFormCompleted,
        allFormsCompleted,
      });
    } catch (error) {
      console.error("Form status check error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
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

      // Log password change for security monitoring
      await storage.createAuditLog({
        userId: user.id,
        action: "PASSWORD_CHANGED",
        targetType: "user",
        targetId: user.id,
        details: {
          ip: getClientIp(req),
          timestamp: new Date().toISOString(),
          userAgent: req.headers['user-agent'] || 'unknown'
        }
      });

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

  app.post("/api/office/renewals/:id/upload-ministry-doc", ensureOffice, rateLimitMiddleware(uploadRateLimiter), ministryUpload.single("document"), async (req, res) => {
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

  app.get("/api/admin/analytics", ensureAdmin, async (req, res) => {
    const offices = await storage.getAllOffices();
    
    const categoryBreakdown: Record<string, number> = {};
    const cityBreakdown: Record<string, number> = {};
    let iataCount = 0;
    let uftaaCount = 0;
    let astaCount = 0;
    let wtoCount = 0;
    
    for (const office of offices) {
      const cat = office.licenseCategory || 'Unknown';
      categoryBreakdown[cat] = (categoryBreakdown[cat] || 0) + 1;
      
      const city = office.mainCity || 'Unknown';
      cityBreakdown[city] = (cityBreakdown[city] || 0) + 1;
      
      if (office.isIata) iataCount++;
      if (office.isUftaa) uftaaCount++;
      if (office.isAsta) astaCount++;
      if (office.isWto) wtoCount++;
    }
    
    const renewalYears: Record<number, number> = {};
    for (const office of offices) {
      if (office.lastRenewalYear) {
        renewalYears[office.lastRenewalYear] = (renewalYears[office.lastRenewalYear] || 0) + 1;
      }
    }
    
    res.json({
      totalOffices: offices.length,
      byCategory: Object.entries(categoryBreakdown)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value),
      byCity: Object.entries(cityBreakdown)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 10),
      memberships: {
        iata: iataCount,
        uftaa: uftaaCount,
        asta: astaCount,
        wto: wtoCount
      },
      byRenewalYear: Object.entries(renewalYears)
        .map(([year, count]) => ({ year: parseInt(year), count }))
        .sort((a, b) => b.year - a.year)
        .slice(0, 5)
    });
  });

  // Staff analytics endpoint
  app.get("/api/admin/staff-analytics", ensureAdmin, async (req, res) => {
    try {
      const analytics = await storage.getStaffAnalytics();
      res.json(analytics);
    } catch (error) {
      console.error("Staff analytics error:", error);
      res.status(500).json({ message: "Failed to fetch staff analytics" });
    }
  });

  // Reports & Statistics endpoints
  app.get("/api/admin/reports/activity-types", ensureAdmin, async (req, res) => {
    try {
      const offices = await storage.getAllOffices();
      
      const activityCounts = {
        hajjUmrah: 0,
        inboundTourism: 0,
        outboundTourism: 0,
        domesticTourism: 0,
        airlineTickets: 0,
        imported: 0
      };
      
      for (const office of offices) {
        if (office.hajjUmrah) activityCounts.hajjUmrah++;
        if (office.tourismImported || office.imported) activityCounts.inboundTourism++;
        if (office.outboundTourism) activityCounts.outboundTourism++;
        if (office.domesticTourism) activityCounts.domesticTourism++;
        if (office.tickets) activityCounts.airlineTickets++;
        if (office.imported) activityCounts.imported++;
      }
      
      res.json({
        total: offices.length,
        activities: [
          { name: "الحج والعمرة", nameEn: "Hajj & Umrah", count: activityCounts.hajjUmrah },
          { name: "السياحة الواردة", nameEn: "Inbound Tourism", count: activityCounts.inboundTourism },
          { name: "السياحة الصادرة", nameEn: "Outbound Tourism", count: activityCounts.outboundTourism },
          { name: "السياحة الداخلية", nameEn: "Domestic Tourism", count: activityCounts.domesticTourism },
          { name: "تذاكر الطيران", nameEn: "Airline Tickets", count: activityCounts.airlineTickets }
        ]
      });
    } catch (error) {
      console.error("Activity types report error:", error);
      res.status(500).json({ message: "Failed to fetch activity types report" });
    }
  });

  app.get("/api/admin/reports/payments-summary", ensureAdmin, async (req, res) => {
    try {
      const payments = await storage.getAllPayments();
      
      const monthlyData: Record<string, { pending: number; approved: number; rejected: number; total: number }> = {};
      let totalPending = 0;
      let totalApproved = 0;
      let totalRejected = 0;
      let totalAmount = 0;
      
      for (const payment of payments) {
        const date = new Date(payment.createdAt);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        
        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = { pending: 0, approved: 0, rejected: 0, total: 0 };
        }
        
        const amount = payment.finalAmount || payment.amount;
        monthlyData[monthKey].total += amount;
        
        if (payment.status === 'PENDING') {
          monthlyData[monthKey].pending += amount;
          totalPending += amount;
        } else if (payment.status === 'APPROVED') {
          monthlyData[monthKey].approved += amount;
          totalApproved += amount;
        } else if (payment.status === 'REJECTED') {
          monthlyData[monthKey].rejected += amount;
          totalRejected += amount;
        }
        
        totalAmount += amount;
      }
      
      const monthlyArray = Object.entries(monthlyData)
        .map(([month, data]) => ({ month, ...data }))
        .sort((a, b) => b.month.localeCompare(a.month))
        .slice(0, 12);
      
      res.json({
        summary: {
          totalPayments: payments.length,
          totalAmount,
          totalPending,
          totalApproved,
          totalRejected
        },
        monthly: monthlyArray
      });
    } catch (error) {
      console.error("Payments summary report error:", error);
      res.status(500).json({ message: "Failed to fetch payments summary" });
    }
  });

  app.get("/api/admin/reports/expiring-licenses", ensureAdmin, async (req, res) => {
    try {
      const offices = await storage.getAllOffices();
      const now = new Date();
      const currentYear = now.getFullYear();
      
      const expired: typeof offices = [];
      const expiring30: typeof offices = [];
      const expiring60: typeof offices = [];
      const expiring90: typeof offices = [];
      
      for (const office of offices) {
        if (!office.lastRenewalYear) {
          expired.push(office);
          continue;
        }
        
        const renewalYear = office.lastRenewalYear;
        const expiryDate = new Date(renewalYear, 11, 31);
        const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysUntilExpiry < 0) {
          expired.push(office);
        } else if (daysUntilExpiry <= 30) {
          expiring30.push(office);
        } else if (daysUntilExpiry <= 60) {
          expiring60.push(office);
        } else if (daysUntilExpiry <= 90) {
          expiring90.push(office);
        }
      }
      
      res.json({
        expired: expired.map(o => ({ id: o.id, name: o.tradeNameAr, lastRenewal: o.lastRenewalYear, city: o.mainCity })),
        expiring30Days: expiring30.map(o => ({ id: o.id, name: o.tradeNameAr, lastRenewal: o.lastRenewalYear, city: o.mainCity })),
        expiring60Days: expiring60.map(o => ({ id: o.id, name: o.tradeNameAr, lastRenewal: o.lastRenewalYear, city: o.mainCity })),
        expiring90Days: expiring90.map(o => ({ id: o.id, name: o.tradeNameAr, lastRenewal: o.lastRenewalYear, city: o.mainCity })),
        summary: {
          expired: expired.length,
          expiring30: expiring30.length,
          expiring60: expiring60.length,
          expiring90: expiring90.length,
          total: offices.length
        }
      });
    } catch (error) {
      console.error("Expiring licenses report error:", error);
      res.status(500).json({ message: "Failed to fetch expiring licenses report" });
    }
  });

  // Notifications/Alerts endpoint
  app.get("/api/admin/notifications/alerts", ensureAdmin, async (req, res) => {
    try {
      const offices = await storage.getAllOffices();
      const payments = await storage.getAllPayments();
      const now = new Date();
      const currentYear = now.getFullYear();
      
      const licenseExpiry: any[] = [];
      const paymentDue: any[] = [];
      const socialSecurityExpiry: any[] = [];
      const guaranteeExpiry: any[] = [];
      
      let critical = 0;
      let warning = 0;
      let info = 0;
      
      for (const office of offices) {
        const renewalYear = office.lastRenewalYear || 0;
        const expiryDate = new Date(renewalYear, 11, 31);
        const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysUntilExpiry < 0 || !office.lastRenewalYear) {
          licenseExpiry.push({
            id: office.id,
            type: "license_expiry",
            severity: "critical",
            title: "رخصة منتهية",
            description: `الترخيص منتهي منذ ${office.lastRenewalYear || 'غير محدد'}`,
            officeId: office.id,
            officeName: office.tradeNameAr || office.legalNameAr || `Office #${office.id}`,
            dueDate: office.lastRenewalYear ? `${office.lastRenewalYear}` : null
          });
          critical++;
        } else if (daysUntilExpiry <= 30) {
          licenseExpiry.push({
            id: office.id,
            type: "license_expiry",
            severity: "critical",
            title: "رخصة على وشك الانتهاء",
            description: `تنتهي خلال ${daysUntilExpiry} يوم`,
            officeId: office.id,
            officeName: office.tradeNameAr || office.legalNameAr || `Office #${office.id}`,
            dueDate: expiryDate.toISOString().split('T')[0]
          });
          critical++;
        } else if (daysUntilExpiry <= 60) {
          licenseExpiry.push({
            id: office.id,
            type: "license_expiry",
            severity: "warning",
            title: "رخصة تنتهي قريباً",
            description: `تنتهي خلال ${daysUntilExpiry} يوم`,
            officeId: office.id,
            officeName: office.tradeNameAr || office.legalNameAr || `Office #${office.id}`,
            dueDate: expiryDate.toISOString().split('T')[0]
          });
          warning++;
        }
        
        if (office.guaranteeExpiryDate) {
          const guaranteeDate = new Date(office.guaranteeExpiryDate);
          const guaranteeDays = Math.ceil((guaranteeDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          
          if (guaranteeDays < 0) {
            guaranteeExpiry.push({
              id: office.id,
              type: "guarantee_expiry",
              severity: "critical",
              title: "كفالة بنكية منتهية",
              description: "الكفالة البنكية منتهية الصلاحية",
              officeId: office.id,
              officeName: office.tradeNameAr || office.legalNameAr || `Office #${office.id}`,
              dueDate: office.guaranteeExpiryDate
            });
            critical++;
          } else if (guaranteeDays <= 30) {
            guaranteeExpiry.push({
              id: office.id,
              type: "guarantee_expiry",
              severity: "warning",
              title: "كفالة بنكية تنتهي قريباً",
              description: `تنتهي خلال ${guaranteeDays} يوم`,
              officeId: office.id,
              officeName: office.tradeNameAr || office.legalNameAr || `Office #${office.id}`,
              dueDate: office.guaranteeExpiryDate
            });
            warning++;
          }
        }
      }
      
      for (const payment of payments) {
        if (payment.status === 'PENDING') {
          const createdAt = new Date(payment.createdAt);
          const daysPending = Math.ceil((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
          const office = offices.find(o => o.id === payment.officeId);
          
          if (daysPending > 7) {
            paymentDue.push({
              id: payment.id,
              type: "payment_due",
              severity: daysPending > 14 ? "critical" : "warning",
              title: "دفعة معلقة",
              description: `معلقة منذ ${daysPending} يوم`,
              officeId: payment.officeId,
              officeName: office?.tradeNameAr || office?.legalNameAr || `Office #${payment.officeId}`,
              amount: payment.finalAmount || payment.amount,
              dueDate: createdAt.toISOString().split('T')[0]
            });
            if (daysPending > 14) critical++;
            else warning++;
          }
        }
      }
      
      res.json({
        licenseExpiry: licenseExpiry.slice(0, 50),
        paymentDue: paymentDue.slice(0, 50),
        socialSecurityExpiry: socialSecurityExpiry.slice(0, 50),
        guaranteeExpiry: guaranteeExpiry.slice(0, 50),
        summary: {
          critical,
          warning,
          info,
          total: critical + warning + info
        }
      });
    } catch (error) {
      console.error("Notifications alerts error:", error);
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  // User manual PDF download
  app.get("/api/admin/user-manual", ensureAdmin, async (req, res) => {
    const filePath = path.join(process.cwd(), "public", "JSTA_Portal_User_Manual.pdf");
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: "User manual not found" });
    }
    
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=JSTA_Portal_User_Manual.pdf");
    
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
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

  // Get renewal steps/timeline for an office
  app.get("/api/admin/offices/:id/renewal-steps", ensureAdmin, async (req, res) => {
    const officeId = parseInt(req.params.id);
    if (isNaN(officeId)) {
      return res.status(400).json({ message: "Invalid office ID" });
    }
    
    const steps = await storage.getRenewalStepsByOfficeId(officeId);
    res.json(steps);
  });

  app.get("/api/admin/offices/:id/employees", ensureAdmin, async (req, res) => {
    const officeId = parseInt(req.params.id);
    if (isNaN(officeId)) {
      return res.status(400).json({ message: "Invalid office ID" });
    }
    
    const office = await storage.getOffice(officeId);
    if (!office) {
      return res.status(404).json({ message: "Office not found" });
    }

    const employees = await storage.getEmployeesByOffice(officeId);
    res.json({ office, employees });
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

    const emailRecipient = office.mainEmail || "";
    const emailSent = !!emailRecipient;
    
    await storage.createAuditLog({
      userId: user.id,
      action: "OFFICE_APPROVED",
      targetType: "office",
      targetId: office.id,
      details: { officeName: office.tradeNameAr, emailSent, emailRecipient: emailSent ? emailRecipient : undefined }
    });

    if (emailSent) {
      sendAccountApprovedEmail(emailRecipient, office.tradeNameAr);
    }

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
    
    // Rejection note is mandatory
    if (!comment || !comment.trim()) {
      return res.status(400).json({ message: "Rejection reason is required" });
    }
    
    await storage.updateOfficeStatus(office.id, "REJECTED", comment);

    const emailRecipient = office.mainEmail || "";
    const emailSent = !!emailRecipient;
    
    await storage.createAuditLog({
      userId: user.id,
      action: "OFFICE_REJECTED",
      targetType: "office",
      targetId: office.id,
      details: { officeName: office.tradeNameAr, comment, emailSent, emailRecipient: emailSent ? emailRecipient : undefined }
    });

    if (emailSent) {
      sendAccountRejectedEmail(emailRecipient, office.tradeNameAr, comment);
    }

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
      // Use pagination for large datasets
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = (page - 1) * limit;
      const search = (req.query.search as string) || "";
      const officeSearch = (req.query.officeSearch as string) || "";
      
      // Build dynamic query with office name search
      let paramIndex = 3;
      const params: any[] = [limit, offset];
      let officeCondition = '';
      let searchCondition = '';
      
      if (officeSearch) {
        officeCondition = `AND (o.trade_name_ar ILIKE $${paramIndex} OR o.trade_name_en ILIKE $${paramIndex})`;
        params.push(`%${officeSearch}%`);
        paramIndex++;
      }
      
      if (search) {
        searchCondition = `AND (p.full_name_ar ILIKE $${paramIndex} OR p.full_name_en ILIKE $${paramIndex} OR p.national_id ILIKE $${paramIndex} OR p.mobile ILIKE $${paramIndex})`;
        params.push(`%${search}%`);
      }
      
      // Get all employees with work history (legacy imported data) - direct DB query for performance
      const result = await pool.query(`
        SELECT DISTINCT ON (p.id)
          p.*,
          ewh.date_in, ewh.date_out, ewh.job_title as wh_job_title, ewh.description as wh_description,
          o.trade_name_ar as office_name_ar, o.trade_name_en as office_name_en, o.registration_number, o.id as office_id
        FROM people p
        LEFT JOIN employee_work_history ewh ON p.id = ewh.person_id
        LEFT JOIN offices o ON ewh.office_id = o.id
        WHERE p.legacy_id IS NOT NULL
          ${officeCondition}
          ${searchCondition}
        ORDER BY p.id, ewh.date_in DESC NULLS LAST
        LIMIT $1 OFFSET $2
      `, params);
      
      // Get total count with same filters
      const countParams: any[] = [];
      let countParamIndex = 1;
      let countOfficeCondition = '';
      let countSearchCondition = '';
      
      if (officeSearch) {
        countOfficeCondition = `AND (o.trade_name_ar ILIKE $${countParamIndex} OR o.trade_name_en ILIKE $${countParamIndex})`;
        countParams.push(`%${officeSearch}%`);
        countParamIndex++;
      }
      
      if (search) {
        countSearchCondition = `AND (p.full_name_ar ILIKE $${countParamIndex} OR p.full_name_en ILIKE $${countParamIndex} OR p.national_id ILIKE $${countParamIndex} OR p.mobile ILIKE $${countParamIndex})`;
        countParams.push(`%${search}%`);
      }
      
      const countResult = await pool.query(`
        SELECT COUNT(DISTINCT p.id) as total
        FROM people p
        LEFT JOIN employee_work_history ewh ON p.id = ewh.person_id
        LEFT JOIN offices o ON ewh.office_id = o.id
        WHERE p.legacy_id IS NOT NULL
          ${countOfficeCondition}
          ${countSearchCondition}
      `, countParams);
      
      const staffData = result.rows.map(row => ({
        person: {
          id: row.id,
          legacyId: row.legacy_id,
          fullNameAr: row.full_name_ar,
          fullNameEn: row.full_name_en,
          firstName: row.first_name,
          lastName: row.last_name,
          nationalId: row.national_id,
          nationality: row.nationality,
          gender: row.gender,
          mobile: row.mobile,
          email: row.email,
          job: row.job,
          qualification: row.qualification,
          jstaIdNum: row.jsta_id_num,
          birthDate: row.birth_date,
        },
        role: {
          roleType: row.job || 'EMPLOYEE',
          description: row.wh_description,
        },
        office: {
          id: row.office_id,
          tradeNameAr: row.office_name_ar,
          tradeNameEn: row.office_name_en,
          registrationNumber: row.registration_number,
        },
        workHistory: {
          dateIn: row.date_in,
          dateOut: row.date_out,
          jobTitle: row.wh_job_title,
          description: row.wh_description,
        },
      }));

      res.json({
        data: staffData,
        total: parseInt(countResult.rows[0]?.total || '0'),
        page,
        limit,
        totalPages: Math.ceil(parseInt(countResult.rows[0]?.total || '0') / limit)
      });
    } catch (error) {
      console.error("Get admin staff error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Export all staff matching filters (no pagination) for CSV download
  app.get("/api/admin/staff/export", ensureAdmin, async (req, res) => {
    try {
      const search = (req.query.search as string) || "";
      const officeSearch = (req.query.officeSearch as string) || "";
      
      // Build dynamic query with office name search
      let paramIndex = 1;
      const params: any[] = [];
      let officeCondition = '';
      let searchCondition = '';
      
      if (officeSearch) {
        officeCondition = `AND (o.trade_name_ar ILIKE $${paramIndex} OR o.trade_name_en ILIKE $${paramIndex})`;
        params.push(`%${officeSearch}%`);
        paramIndex++;
      }
      
      if (search) {
        searchCondition = `AND (p.full_name_ar ILIKE $${paramIndex} OR p.full_name_en ILIKE $${paramIndex} OR p.national_id ILIKE $${paramIndex} OR p.mobile ILIKE $${paramIndex})`;
        params.push(`%${search}%`);
      }
      
      // Get all employees matching filters without pagination
      const result = await pool.query(`
        SELECT DISTINCT ON (p.id)
          p.*,
          ewh.date_in, ewh.date_out, ewh.job_title as wh_job_title, ewh.description as wh_description,
          o.trade_name_ar as office_name_ar, o.trade_name_en as office_name_en, o.registration_number, o.id as office_id
        FROM people p
        LEFT JOIN employee_work_history ewh ON p.id = ewh.person_id
        LEFT JOIN offices o ON ewh.office_id = o.id
        WHERE p.legacy_id IS NOT NULL
          ${officeCondition}
          ${searchCondition}
        ORDER BY p.id, ewh.date_in DESC NULLS LAST
      `, params);
      
      const staffData = result.rows.map(row => ({
        person: {
          id: row.id,
          legacyId: row.legacy_id,
          fullNameAr: row.full_name_ar,
          fullNameEn: row.full_name_en,
          firstName: row.first_name,
          lastName: row.last_name,
          nationalId: row.national_id,
          nationality: row.nationality,
          gender: row.gender,
          mobile: row.mobile,
          motherName: row.mother_name,
          email: row.email,
          job: row.job,
          qualification: row.qualification,
          jstaIdNum: row.jsta_id_num,
          birthDate: row.birth_date,
          socialSecurityNo: row.social_security_no,
        },
        role: {
          roleType: row.job || 'EMPLOYEE',
          description: row.wh_description,
        },
        office: {
          id: row.office_id,
          tradeNameAr: row.office_name_ar,
          tradeNameEn: row.office_name_en,
          registrationNumber: row.registration_number,
        },
        workHistory: {
          dateIn: row.date_in,
          dateOut: row.date_out,
          jobTitle: row.wh_job_title,
          description: row.wh_description,
        },
      }));

      res.json({ data: staffData });
    } catch (error) {
      console.error("Export admin staff error:", error);
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
    const emailRecipient = office?.mainEmail || "";
    const emailSent = !!emailRecipient;
    
    await storage.createAuditLog({
      userId: user.id,
      action: "RENEWAL_APPROVED_FOR_DOWNLOAD",
      targetType: "renewal",
      targetId: renewal.id,
      details: { officeName: office?.tradeNameAr, year: renewal.year, emailSent, emailRecipient: emailSent ? emailRecipient : undefined }
    });

    if (emailSent) {
      sendRenewalApprovedForDownloadEmail(emailRecipient, office?.tradeNameAr || "", renewal.year);
    }

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
    const emailRecipient = office?.mainEmail || "";
    const emailSent = !!emailRecipient;
    
    await storage.createAuditLog({
      userId: user.id,
      action: "RENEWAL_FINAL_APPROVED",
      targetType: "renewal",
      targetId: renewal.id,
      details: { officeName: office?.tradeNameAr, year: renewal.year, emailSent, emailRecipient: emailSent ? emailRecipient : undefined }
    });

    if (emailSent) {
      sendRenewalFinalApprovedEmail(emailRecipient, office?.tradeNameAr || "", renewal.year);
    }

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
    
    // Rejection note is mandatory
    if (!comment || !comment.trim()) {
      return res.status(400).json({ message: "Rejection reason is required" });
    }
    
    await storage.updateRenewalStatus(renewal.id, "REJECTED", comment);

    const office = await storage.getOffice(renewal.officeId);
    const emailRecipient = office?.mainEmail || "";
    const emailSent = !!emailRecipient;
    
    await storage.createAuditLog({
      userId: user.id,
      action: "RENEWAL_REJECTED",
      targetType: "renewal",
      targetId: renewal.id,
      details: { officeName: office?.tradeNameAr, year: renewal.year, comment, emailSent, emailRecipient: emailSent ? emailRecipient : undefined }
    });

    if (emailSent) {
      sendRenewalRejectedEmail(emailRecipient, office?.tradeNameAr || "", renewal.year, comment);
    }

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

  // Preview ministry document
  app.get("/api/documents/ministry/:renewalId/preview", ensureAuthenticated, async (req, res) => {
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

    const ext = path.extname(renewal.ministryDocumentPath).toLowerCase().replace(".", "");
    const mimeTypes: Record<string, string> = {
      pdf: "application/pdf",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      gif: "image/gif",
      webp: "image/webp",
    };
    
    const contentType = mimeTypes[ext] || "application/octet-stream";
    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Disposition", `inline; filename="ministry-document.${ext}"`);
    
    const fileStream = fs.createReadStream(renewal.ministryDocumentPath);
    fileStream.pipe(res);
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
            geographyLink: branch.geographyLink,
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

      // Validate required managers (at least one full-time manager)
      if (dedicatedManagers.length === 0) {
        return res.status(400).json({ message: "مطلوب مدير متفرّغ واحد على الأقل" });
      }

      // Validate at least one owner/partner or authorized signatory
      if (ownersPartners.length === 0 && authorizedSignatories.length === 0) {
        return res.status(400).json({ 
          message: "مطلوب صف واحد على الأقل في مقطع المالك/الشركاء أو المفوّضين" 
        });
      }

      // Validate minimum 3 employees total (across all categories)
      const totalStaff = ownersPartners.length + authorizedSignatories.length + dedicatedManagers.length + employees.length;
      if (totalStaff < 3) {
        return res.status(400).json({ 
          message: "مطلوب 3 موظفين على الأقل في المجموع (بما في ذلك المدير المتفرّغ)" 
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
        } else if (!/^[a-zA-Z\s.',-]+$/.test(row.fullNameEn)) {
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

      // Track person IDs already added (from roles_in_office)
      const addedPersonIds = new Set<number>();

      for (const person of people) {
        const personRoles = roles.filter(r => r.personId === person.id);
        for (const role of personRoles) {
          addedPersonIds.add(person.id);
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

      // Also fetch employees from work history (legacy imported data)
      const workHistoryEmployees = await storage.getEmployeesByOffice(officeId);
      for (const { person, workHistory } of workHistoryEmployees) {
        // Skip if already added via roles
        if (addedPersonIds.has(person.id)) continue;
        
        // Get the most recent work history record
        const latestWH = workHistory.sort((a, b) => {
          const dateA = a.dateIn ? new Date(a.dateIn).getTime() : 0;
          const dateB = b.dateIn ? new Date(b.dateIn).getTime() : 0;
          return dateB - dateA;
        })[0];

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
          currentPosition: person.job || latestWH?.description || person.currentPosition,
          startDate: latestWH?.dateIn || person.startDate,
          branch: person.branch,
          isLegacy: true, // Flag to indicate this is imported legacy data
        };

        // Add to employees array (legacy staff don't have specific roles)
        employees.push(personData);
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
  app.post("/api/office/renewals-2026/:id/attachments", ensureOffice, rateLimitMiddleware(uploadRateLimiter), renewalUpload.single("file"), async (req, res) => {
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

      // Validate MIME type matches file extension
      if (!validateFileMimeType(file.originalname, file.mimetype)) {
        fs.unlinkSync(file.path);
        return res.status(400).json({
          message: `Invalid file type: ${file.originalname}. File extension doesn't match content type.`
        });
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
        fileName: sanitizeFileName(file.originalname),
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

  // Submit renewal (final submission)
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

  // Office Info Form 2026 Routes
  app.post("/api/office-info-form", ensureOffice, async (req, res) => {
    try {
      const user = (req as any).user;
      if (!user.officeId) {
        return res.status(400).json({ message: "No office linked to user" });
      }

      const { renewalId, ...formData } = req.body;
      
      const form = await storage.createOfficeInfoForm({
        officeId: user.officeId,
        renewalId: renewalId || null,
        ...formData,
        ipAddress: req.ip || null,
        userAgent: req.get("User-Agent") || null
      });

      // Update renewal to mark office form as completed
      if (renewalId) {
        await storage.updateRenewal(renewalId, { officeFormCompleted: true });
      }

      // Create audit log
      await storage.createAuditLog({
        userId: user.id,
        action: "OFFICE_INFO_FORM_SUBMITTED",
        targetType: "office_info_form",
        targetId: form.id,
        details: { officeId: user.officeId, renewalId }
      });

      res.json(form);
    } catch (error) {
      console.error("Create office info form error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/office-info-form", ensureOffice, async (req, res) => {
    try {
      const user = (req as any).user;
      if (!user.officeId) {
        return res.status(400).json({ message: "No office linked to user" });
      }

      const renewalId = req.query.renewalId ? parseInt(req.query.renewalId as string) : undefined;
      const form = await storage.getOfficeInfoFormByOffice(user.officeId, renewalId);
      res.json(form || null);
    } catch (error) {
      console.error("Get office info form error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Admin: Get all office info forms
  app.get("/api/admin/office-info-forms", ensureAdmin, async (req, res) => {
    try {
      const forms = await storage.getAllOfficeInfoForms();
      
      const formsWithDetails = await Promise.all(
        forms.map(async (form) => {
          const office = await storage.getOffice(form.officeId);
          return { ...form, office };
        })
      );
      
      res.json(formsWithDetails);
    } catch (error) {
      console.error("Get office info forms error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Admin: Get office info form by ID
  app.get("/api/admin/office-info-forms/:id", ensureAdmin, async (req, res) => {
    try {
      const formId = parseInt(req.params.id);
      if (isNaN(formId)) {
        return res.status(400).json({ message: "Invalid form ID" });
      }
      
      const form = await storage.getOfficeInfoForm(formId);
      if (!form) {
        return res.status(404).json({ message: "Form not found" });
      }

      const office = await storage.getOffice(form.officeId);
      res.json({ ...form, office });
    } catch (error) {
      console.error("Get office info form error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Admin: Get office info form by office ID
  app.get("/api/admin/offices/:id/office-info-form", ensureAdmin, async (req, res) => {
    try {
      const officeId = parseInt(req.params.id);
      if (isNaN(officeId)) {
        return res.status(400).json({ message: "Invalid office ID" });
      }
      
      const form = await storage.getOfficeInfoFormByOffice(officeId);
      res.json(form || null);
    } catch (error) {
      console.error("Get office info form error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // ========== PAYMENT ROUTES ==========

  // Setup payment uploads directory
  const paymentDir = path.join(uploadsDir, "payment_proofs");
  if (!fs.existsSync(paymentDir)) fs.mkdirSync(paymentDir, { recursive: true });

  const paymentUpload = multer({
    storage: multer.diskStorage({
      destination: paymentDir,
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, uniqueSuffix + "-" + sanitizeFileName(file.originalname));
      },
    }),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      const allowedMimeTypes = [
        "image/jpeg",
        "image/png",
        "image/gif",
        "application/pdf",
      ];
      if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error("Invalid file type. Only images and PDF allowed."));
      }
    },
  });

  // Get current payment for office
  app.get("/api/payments/current", ensureOffice, async (req, res) => {
    try {
      const user = (req as any).user;
      if (!user.officeId) {
        return res.status(400).json({ message: "No office linked to user" });
      }
      
      const renewalId = req.query.renewalId ? parseInt(req.query.renewalId as string) : undefined;
      const payment = await storage.getPaymentByOffice(user.officeId, renewalId);
      res.json(payment || null);
    } catch (error) {
      console.error("Get payment error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get all payments for office
  app.get("/api/payments", ensureOffice, async (req, res) => {
    try {
      const user = (req as any).user;
      if (!user.officeId) {
        return res.status(400).json({ message: "No office linked to user" });
      }
      
      const payments = await storage.getPaymentsByOffice(user.officeId);
      res.json(payments);
    } catch (error) {
      console.error("Get payments error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Create or initialize a payment
  app.post("/api/payments", ensureOffice, async (req, res) => {
    try {
      const user = (req as any).user;
      if (!user.officeId) {
        return res.status(400).json({ message: "No office linked to user" });
      }
      
      const { renewalId, amount } = req.body;
      
      // Check if payment already exists
      const existingPayment = await storage.getPaymentByOffice(user.officeId, renewalId);
      if (existingPayment) {
        return res.json(existingPayment);
      }
      
      const payment = await storage.createPayment({
        officeId: user.officeId,
        renewalId: renewalId || null,
        amount: amount || 350, // Default JSTA membership fee
        status: 'PENDING',
      });
      
      res.json(payment);
    } catch (error) {
      console.error("Create payment error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Upload payment proof
  app.post("/api/payments/:id/upload-proof", ensureOffice, paymentUpload.single("file"), async (req, res) => {
    try {
      const user = (req as any).user;
      if (!user.officeId) {
        return res.status(400).json({ message: "No office linked to user" });
      }
      
      const paymentId = parseInt(req.params.id);
      if (isNaN(paymentId)) {
        return res.status(400).json({ message: "Invalid payment ID" });
      }
      
      const payment = await storage.getPayment(paymentId);
      if (!payment) {
        return res.status(404).json({ message: "Payment not found" });
      }
      
      if (payment.officeId !== user.officeId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const file = req.file;
      if (!file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      
      // Update payment with proof file
      const updatedPayment = await storage.updatePayment(paymentId, {
        proofFileUrl: `/uploads/payment_proofs/${file.filename}`,
        proofFileName: file.originalname,
        status: 'UPLOADED',
      });
      
      // Create audit log
      await storage.createAuditLog({
        userId: user.id,
        action: 'PAYMENT_PROOF_UPLOADED',
        targetType: 'payment',
        targetId: paymentId,
        details: { fileName: file.originalname },
      });
      
      res.json(updatedPayment);
    } catch (error) {
      console.error("Upload payment proof error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Admin: Get all payments
  app.get("/api/admin/payments", ensureAdmin, async (req, res) => {
    try {
      const allPayments = await storage.getAllPayments();
      
      const paymentsWithDetails = await Promise.all(
        allPayments.map(async (payment) => {
          const office = await storage.getOffice(payment.officeId);
          return { ...payment, office };
        })
      );
      
      res.json(paymentsWithDetails);
    } catch (error) {
      console.error("Get all payments error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Admin: Get payment by ID
  app.get("/api/admin/payments/:id", ensureAdmin, async (req, res) => {
    try {
      const paymentId = parseInt(req.params.id);
      if (isNaN(paymentId)) {
        return res.status(400).json({ message: "Invalid payment ID" });
      }
      
      const payment = await storage.getPayment(paymentId);
      if (!payment) {
        return res.status(404).json({ message: "Payment not found" });
      }
      
      const office = await storage.getOffice(payment.officeId);
      res.json({ ...payment, office });
    } catch (error) {
      console.error("Get payment error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Admin: Get payment for specific office
  app.get("/api/admin/offices/:id/payment", ensureAdmin, async (req, res) => {
    try {
      const officeId = parseInt(req.params.id);
      if (isNaN(officeId)) {
        return res.status(400).json({ message: "Invalid office ID" });
      }
      
      const renewalId = req.query.renewalId ? parseInt(req.query.renewalId as string) : undefined;
      const payment = await storage.getPaymentByOffice(officeId, renewalId);
      res.json(payment || null);
    } catch (error) {
      console.error("Get office payment error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Admin: Approve payment
  app.post("/api/admin/payments/:id/approve", ensureAdmin, async (req, res) => {
    try {
      const user = (req as any).user;
      const paymentId = parseInt(req.params.id);
      if (isNaN(paymentId)) {
        return res.status(400).json({ message: "Invalid payment ID" });
      }
      
      const payment = await storage.getPayment(paymentId);
      if (!payment) {
        return res.status(404).json({ message: "Payment not found" });
      }
      
      await storage.updatePaymentStatus(paymentId, 'APPROVED', undefined, user.id);
      
      // Create audit log
      await storage.createAuditLog({
        userId: user.id,
        action: 'PAYMENT_APPROVED',
        targetType: 'payment',
        targetId: paymentId,
        details: { officeId: payment.officeId },
      });
      
      const updatedPayment = await storage.getPayment(paymentId);
      res.json(updatedPayment);
    } catch (error) {
      console.error("Approve payment error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Admin: Reject payment
  app.post("/api/admin/payments/:id/reject", ensureAdmin, async (req, res) => {
    try {
      const user = (req as any).user;
      const paymentId = parseInt(req.params.id);
      if (isNaN(paymentId)) {
        return res.status(400).json({ message: "Invalid payment ID" });
      }
      
      const { reason } = req.body;
      if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
        return res.status(400).json({ message: "Rejection reason is required" });
      }
      
      const payment = await storage.getPayment(paymentId);
      if (!payment) {
        return res.status(404).json({ message: "Payment not found" });
      }
      
      await storage.updatePaymentStatus(paymentId, 'REJECTED', reason.trim());
      
      // Create audit log
      await storage.createAuditLog({
        userId: user.id,
        action: 'PAYMENT_REJECTED',
        targetType: 'payment',
        targetId: paymentId,
        details: { officeId: payment.officeId, reason: reason.trim() },
      });
      
      const updatedPayment = await storage.getPayment(paymentId);
      res.json(updatedPayment);
    } catch (error) {
      console.error("Reject payment error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Admin: Get all inspections
  app.get("/api/admin/inspections", ensureAdmin, async (req, res) => {
    try {
      const allInspections = await storage.getAllInspections();
      
      const inspectionsWithDetails = await Promise.all(
        allInspections.map(async (inspection) => {
          const office = await storage.getOffice(inspection.officeId);
          return { 
            ...inspection, 
            officeName: office?.tradeNameAr,
            officeNameEn: office?.tradeNameEn
          };
        })
      );
      
      res.json(inspectionsWithDetails);
    } catch (error) {
      console.error("Get all inspections error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Admin: Create new inspection
  app.post("/api/admin/inspections", ensureAdmin, async (req, res) => {
    try {
      const user = (req as any).user;
      const { officeId, inspectorName, scheduledDate, notes } = req.body;
      
      if (!officeId) {
        return res.status(400).json({ message: "Office ID is required" });
      }
      
      const office = await storage.getOffice(officeId);
      if (!office) {
        return res.status(404).json({ message: "Office not found" });
      }
      
      const inspection = await storage.createInspection({
        officeId,
        inspectorName: inspectorName || null,
        inspectorUserId: user.id,
        scheduledDate: scheduledDate || null,
        notes: notes || null,
        status: 'PENDING',
        city: office.mainCity || null,
        region: office.area || null,
        street: office.street || null,
        buildingNumber: office.buildingNumber || null
      });
      
      // Create audit log
      await storage.createAuditLog({
        userId: user.id,
        action: 'INSPECTION_CREATED',
        targetType: 'inspection',
        targetId: inspection.id,
        details: { officeId, inspectorName, scheduledDate },
      });
      
      res.json(inspection);
    } catch (error) {
      console.error("Create inspection error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Admin: Get inspection by ID
  app.get("/api/admin/inspections/:id", ensureAdmin, async (req, res) => {
    try {
      const inspectionId = parseInt(req.params.id);
      if (isNaN(inspectionId)) {
        return res.status(400).json({ message: "Invalid inspection ID" });
      }
      
      const inspection = await storage.getInspection(inspectionId);
      if (!inspection) {
        return res.status(404).json({ message: "Inspection not found" });
      }
      
      const office = await storage.getOffice(inspection.officeId);
      res.json({ 
        ...inspection, 
        officeName: office?.tradeNameAr,
        officeNameEn: office?.tradeNameEn
      });
    } catch (error) {
      console.error("Get inspection error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Admin: Update inspection status
  app.patch("/api/admin/inspections/:id/status", ensureAdmin, async (req, res) => {
    try {
      const user = (req as any).user;
      const inspectionId = parseInt(req.params.id);
      const { status } = req.body;
      
      if (isNaN(inspectionId)) {
        return res.status(400).json({ message: "Invalid inspection ID" });
      }
      
      const inspection = await storage.getInspection(inspectionId);
      if (!inspection) {
        return res.status(404).json({ message: "Inspection not found" });
      }
      
      const validStatuses = ['PENDING', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }
      
      const updateData: any = { status };
      if (status === 'IN_PROGRESS' || status === 'COMPLETED') {
        updateData.visitDate = new Date().toISOString().split('T')[0];
      }
      
      await storage.updateInspection(inspectionId, updateData);
      
      // Create audit log
      await storage.createAuditLog({
        userId: user.id,
        action: 'INSPECTION_STATUS_UPDATED',
        targetType: 'inspection',
        targetId: inspectionId,
        details: { oldStatus: inspection.status, newStatus: status },
      });
      
      const updatedInspection = await storage.getInspection(inspectionId);
      res.json(updatedInspection);
    } catch (error) {
      console.error("Update inspection status error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Admin: Update inspection details
  app.patch("/api/admin/inspections/:id", ensureAdmin, async (req, res) => {
    try {
      const user = (req as any).user;
      const inspectionId = parseInt(req.params.id);
      
      if (isNaN(inspectionId)) {
        return res.status(400).json({ message: "Invalid inspection ID" });
      }
      
      const inspection = await storage.getInspection(inspectionId);
      if (!inspection) {
        return res.status(404).json({ message: "Inspection not found" });
      }
      
      const updatedInspection = await storage.updateInspection(inspectionId, req.body);
      
      // Create audit log
      await storage.createAuditLog({
        userId: user.id,
        action: 'INSPECTION_UPDATED',
        targetType: 'inspection',
        targetId: inspectionId,
        details: req.body,
      });
      
      res.json(updatedInspection);
    } catch (error) {
      console.error("Update inspection error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Promo code validation endpoint
  app.post("/api/promo-codes/validate", ensureOffice, async (req, res) => {
    try {
      const { code, amount } = req.body;
      
      if (!code || typeof code !== 'string') {
        return res.status(400).json({ message: "Promo code is required", valid: false });
      }
      
      const promoCode = await storage.getPromoCodeByCode(code.trim());
      
      if (!promoCode) {
        return res.status(404).json({ message: "Invalid promo code", valid: false });
      }
      
      // Check if promo code is active
      if (!promoCode.isActive) {
        return res.status(400).json({ message: "This promo code is no longer active", valid: false });
      }
      
      // Check max uses
      if (promoCode.maxUses !== null && promoCode.currentUses >= promoCode.maxUses) {
        return res.status(400).json({ message: "This promo code has reached its usage limit", valid: false });
      }
      
      // Check validity dates
      const now = new Date();
      if (promoCode.validFrom && new Date(promoCode.validFrom) > now) {
        return res.status(400).json({ message: "This promo code is not yet valid", valid: false });
      }
      if (promoCode.validUntil && new Date(promoCode.validUntil) < now) {
        return res.status(400).json({ message: "This promo code has expired", valid: false });
      }
      
      // Calculate discount
      const baseAmount = amount || 350;
      let discountAmount = 0;
      let finalAmount = baseAmount;
      
      switch (promoCode.discountType) {
        case 'PERCENT':
          discountAmount = Math.round((baseAmount * promoCode.discountValue) / 100);
          finalAmount = baseAmount - discountAmount;
          break;
        case 'FIXED':
          discountAmount = Math.min(promoCode.discountValue, baseAmount);
          finalAmount = baseAmount - discountAmount;
          break;
        case 'FREE':
          discountAmount = baseAmount;
          finalAmount = 0;
          break;
      }
      
      res.json({
        valid: true,
        promoCodeId: promoCode.id,
        code: promoCode.code,
        discountType: promoCode.discountType,
        discountValue: promoCode.discountValue,
        discountAmount,
        originalAmount: baseAmount,
        finalAmount,
      });
    } catch (error) {
      console.error("Validate promo code error:", error);
      res.status(500).json({ message: "Internal server error", valid: false });
    }
  });

  // Apply promo code to payment
  app.post("/api/payments/:id/apply-promo", ensureOffice, async (req, res) => {
    try {
      const user = (req as any).user;
      if (!user.officeId) {
        return res.status(400).json({ message: "No office linked to user" });
      }
      
      const paymentId = parseInt(req.params.id);
      if (isNaN(paymentId)) {
        return res.status(400).json({ message: "Invalid payment ID" });
      }
      
      const { code } = req.body;
      if (!code || typeof code !== 'string') {
        return res.status(400).json({ message: "Promo code is required" });
      }
      
      const payment = await storage.getPayment(paymentId);
      if (!payment) {
        return res.status(404).json({ message: "Payment not found" });
      }
      
      if (payment.officeId !== user.officeId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Can't change promo if already approved
      if (payment.status === 'APPROVED') {
        return res.status(400).json({ message: "Cannot modify an approved payment" });
      }
      
      const promoCode = await storage.getPromoCodeByCode(code.trim());
      if (!promoCode || !promoCode.isActive) {
        return res.status(400).json({ message: "Invalid or inactive promo code" });
      }
      
      // Check max uses
      if (promoCode.maxUses !== null && promoCode.currentUses >= promoCode.maxUses) {
        return res.status(400).json({ message: "This promo code has reached its usage limit" });
      }
      
      // Check validity dates
      const now = new Date();
      if (promoCode.validFrom && new Date(promoCode.validFrom) > now) {
        return res.status(400).json({ message: "This promo code is not yet valid" });
      }
      if (promoCode.validUntil && new Date(promoCode.validUntil) < now) {
        return res.status(400).json({ message: "This promo code has expired" });
      }
      
      // Calculate discount
      const baseAmount = payment.amount;
      let discountAmount = 0;
      let finalAmount = baseAmount;
      
      switch (promoCode.discountType) {
        case 'PERCENT':
          discountAmount = Math.round((baseAmount * promoCode.discountValue) / 100);
          finalAmount = baseAmount - discountAmount;
          break;
        case 'FIXED':
          discountAmount = Math.min(promoCode.discountValue, baseAmount);
          finalAmount = baseAmount - discountAmount;
          break;
        case 'FREE':
          discountAmount = baseAmount;
          finalAmount = 0;
          break;
      }
      
      // Update payment with promo code
      const updatedPayment = await storage.updatePayment(paymentId, {
        promoCodeId: promoCode.id,
        discountAmount,
        finalAmount,
      });
      
      // Increment promo code usage
      await storage.incrementPromoCodeUses(promoCode.id);
      
      res.json(updatedPayment);
    } catch (error) {
      console.error("Apply promo code error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Remove promo code from payment
  app.post("/api/payments/:id/remove-promo", ensureOffice, async (req, res) => {
    try {
      const user = (req as any).user;
      if (!user.officeId) {
        return res.status(400).json({ message: "No office linked to user" });
      }
      
      const paymentId = parseInt(req.params.id);
      if (isNaN(paymentId)) {
        return res.status(400).json({ message: "Invalid payment ID" });
      }
      
      const payment = await storage.getPayment(paymentId);
      if (!payment) {
        return res.status(404).json({ message: "Payment not found" });
      }
      
      if (payment.officeId !== user.officeId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      if (payment.status === 'APPROVED') {
        return res.status(400).json({ message: "Cannot modify an approved payment" });
      }
      
      // Remove promo code and reset amounts
      const updatedPayment = await storage.updatePayment(paymentId, {
        promoCodeId: null,
        discountAmount: 0,
        finalAmount: payment.amount,
      });
      
      res.json(updatedPayment);
    } catch (error) {
      console.error("Remove promo code error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Admin: Get all promo codes
  app.get("/api/admin/promo-codes", ensureAdmin, async (req, res) => {
    try {
      const promoCodes = await storage.getAllPromoCodes();
      res.json(promoCodes);
    } catch (error) {
      console.error("Get promo codes error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Admin: Create promo code
  app.post("/api/admin/promo-codes", ensureAdmin, async (req, res) => {
    try {
      const { code, discountType, discountValue, maxUses, validFrom, validUntil, isActive } = req.body;
      
      if (!code || !discountType || discountValue === undefined) {
        return res.status(400).json({ message: "Code, discount type, and discount value are required" });
      }
      
      // Check if code already exists
      const existingCode = await storage.getPromoCodeByCode(code);
      if (existingCode) {
        return res.status(400).json({ message: "Promo code already exists" });
      }
      
      const promoCode = await storage.createPromoCode({
        code: code.toUpperCase(),
        discountType,
        discountValue,
        maxUses: maxUses || null,
        validFrom: validFrom ? new Date(validFrom) : null,
        validUntil: validUntil ? new Date(validUntil) : null,
        isActive: isActive !== false,
      });
      
      res.json(promoCode);
    } catch (error) {
      console.error("Create promo code error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Admin: Update promo code
  app.patch("/api/admin/promo-codes/:id", ensureAdmin, async (req, res) => {
    try {
      const promoCodeId = parseInt(req.params.id);
      if (isNaN(promoCodeId)) {
        return res.status(400).json({ message: "Invalid promo code ID" });
      }
      
      const existingCode = await storage.getPromoCode(promoCodeId);
      if (!existingCode) {
        return res.status(404).json({ message: "Promo code not found" });
      }
      
      const updates: any = {};
      const { discountType, discountValue, maxUses, validFrom, validUntil, isActive } = req.body;
      
      if (discountType !== undefined) updates.discountType = discountType;
      if (discountValue !== undefined) updates.discountValue = discountValue;
      if (maxUses !== undefined) updates.maxUses = maxUses;
      if (validFrom !== undefined) updates.validFrom = validFrom ? new Date(validFrom) : null;
      if (validUntil !== undefined) updates.validUntil = validUntil ? new Date(validUntil) : null;
      if (isActive !== undefined) updates.isActive = isActive;
      
      const updatedCode = await storage.updatePromoCode(promoCodeId, updates);
      res.json(updatedCode);
    } catch (error) {
      console.error("Update promo code error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // ========================================
  // 2026 Renewal Workflow API Endpoints
  // ========================================

  // Public: Validate renewal invitation token
  app.get("/api/renew/validate/:token", async (req, res) => {
    try {
      const { token } = req.params;
      const result = await validateInvitationToken(token);
      
      if (!result.valid) {
        return res.status(400).json({ valid: false, message: result.error });
      }

      // Get office info for display
      const office = await storage.getOffice(result.officeId!);
      
      res.json({
        valid: true,
        officeId: result.officeId,
        renewalId: result.renewalId,
        officeName: office?.tradeNameEn || office?.tradeNameAr
      });
    } catch (error) {
      console.error("Token validation error:", error);
      res.status(500).json({ valid: false, message: "Server error" });
    }
  });

  // Public: Redeem token and start renewal workflow
  app.post("/api/renew/redeem/:token", async (req, res) => {
    try {
      const { token } = req.params;
      const ipAddress = getClientIp(req);
      const userAgent = req.headers['user-agent'];

      const result = await redeemInvitationToken(token, ipAddress, userAgent);
      
      if (!result.valid) {
        return res.status(400).json({ success: false, message: result.error });
      }

      res.json({
        success: true,
        officeId: result.officeId,
        renewalId: result.renewalId,
        message: "Token redeemed successfully. Please set your password."
      });
    } catch (error) {
      console.error("Token redemption error:", error);
      res.status(500).json({ success: false, message: "Server error" });
    }
  });

  // Protected: Update credentials during renewal (requires redeemed token)
  app.post("/api/renew/:renewalId/credentials", async (req, res) => {
    try {
      const renewalId = parseInt(req.params.renewalId);
      const { email, password, token } = req.body;

      if (!email || !password || !token) {
        return res.status(400).json({ success: false, message: "Email, password, and token required" });
      }

      if (password.length < 8) {
        return res.status(400).json({ success: false, message: "Password must be at least 8 characters" });
      }

      // Validate the token matches this renewal (even if consumed)
      const tokenValidation = await validateInvitationToken(token);
      
      // Get renewal to find office
      const renewal = await storage.getLicenseRenewal(renewalId);
      if (!renewal) {
        return res.status(404).json({ success: false, message: "Renewal not found" });
      }

      // Verify renewal is in the correct state for credential update
      if (renewal.renewalState !== 'ACCESS_GRANTED' && renewal.renewalState !== 'CREDENTIALS_UPDATED') {
        return res.status(403).json({ 
          success: false, 
          message: "Invalid renewal state. Please redeem your invitation link first." 
        });
      }

      // Extra check: if token was provided and valid, verify it matches the renewal
      if (tokenValidation.valid && tokenValidation.renewalId !== renewalId) {
        return res.status(403).json({ success: false, message: "Token does not match renewal" });
      }

      // Find user for this office
      const user = await storage.getUserByOfficeId(renewal.officeId);
      if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
      }

      // Check for duplicate email (if changing email)
      if (email !== user.email) {
        const existingUser = await storage.getUserByEmail(email);
        if (existingUser && existingUser.id !== user.id) {
          return res.status(400).json({ success: false, message: "Email already in use" });
        }
      }

      // Update user credentials
      const passwordHash = await bcrypt.hash(password, 10);
      await storage.updateUser(user.id, { 
        email, 
        passwordHash 
      });

      // Update renewal state
      await storage.updateLicenseRenewal(renewalId, {
        renewalState: 'CREDENTIALS_UPDATED',
        credentialsUpdated: true
      });

      // Log the step
      await storage.createRenewalStep({
        renewalId,
        officeId: renewal.officeId,
        stepType: 'CREDENTIALS_RESET',
        ipAddress: getClientIp(req),
        userAgent: req.headers['user-agent']
      });

      // Audit log: Credentials set
      await storage.createAuditLog({
        userId: user.id,
        action: 'RENEWAL_CREDENTIALS_SET',
        targetType: 'renewal',
        targetId: renewalId,
        details: { officeId: renewal.officeId, emailChanged: email !== user.email }
      });

      res.json({ success: true, message: "Credentials updated successfully" });
    } catch (error) {
      console.error("Credential update error:", error);
      res.status(500).json({ success: false, message: "Server error" });
    }
  });

  // Public: Get office info for renewal review (requires valid token in query)
  app.get("/api/renew/:renewalId/office-info", async (req, res) => {
    try {
      const renewalId = parseInt(req.params.renewalId);
      const token = req.query.token as string;
      
      // Require token for security
      if (!token) {
        return res.status(401).json({ error: "Token required" });
      }

      // Validate the token
      const tokenValidation = await validateInvitationToken(token);
      if (!tokenValidation.valid) {
        return res.status(403).json({ error: "Invalid or expired token" });
      }

      // Verify token matches the renewal
      if (tokenValidation.renewalId !== renewalId) {
        return res.status(403).json({ error: "Token does not match renewal" });
      }
      
      const renewal = await storage.getLicenseRenewal(renewalId);
      if (!renewal) {
        return res.status(404).json({ error: "Renewal not found" });
      }

      // Only allow access if renewal is in a state where info review is appropriate
      const allowedStates = ['ACCESS_GRANTED', 'CREDENTIALS_UPDATED', 'INFO_APPROVED', 'PAYMENT_PENDING'];
      if (!allowedStates.includes(renewal.renewalState || '')) {
        return res.status(403).json({ error: "Access denied" });
      }

      const office = await storage.getOffice(renewal.officeId);
      if (!office) {
        return res.status(404).json({ error: "Office not found" });
      }

      res.json({
        id: office.id,
        name: office.name,
        nameEn: office.nameEn,
        registrationNumber: office.registrationNumber,
        licenseCategory: office.licenseCategory,
        email: office.email,
        phone: office.phone,
        city: office.city,
        address: office.address,
        managerName: [office.managerFirst, office.managerSecond, office.managerLast].filter(Boolean).join(' ')
      });
    } catch (error) {
      console.error("Office info error:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Office: Approve office information
  app.post("/api/renew/:renewalId/approve-info", ensureOffice, async (req, res) => {
    try {
      const renewalId = parseInt(req.params.renewalId);
      const officeId = req.session.officeId;

      const renewal = await storage.getLicenseRenewal(renewalId);
      if (!renewal || renewal.officeId !== officeId) {
        return res.status(403).json({ success: false, message: "Not authorized" });
      }

      // State guard: must have updated credentials first
      if (renewal.renewalState !== 'CREDENTIALS_UPDATED' && renewal.renewalState !== 'INFO_APPROVED') {
        return res.status(403).json({ 
          success: false, 
          message: "Please update your credentials first" 
        });
      }

      // Update renewal state
      await storage.updateLicenseRenewal(renewalId, {
        renewalState: 'INFO_APPROVED',
        infoApproved: true
      });

      // Log the step
      await storage.createRenewalStep({
        renewalId,
        officeId,
        stepType: 'INFO_REVIEWED',
        ipAddress: getClientIp(req),
        userAgent: req.headers['user-agent']
      });

      // Audit log: Info approved
      const user = req.user as any;
      if (user) {
        await storage.createAuditLog({
          userId: user.id,
          action: 'RENEWAL_INFO_APPROVED',
          targetType: 'renewal',
          targetId: renewalId,
          details: { officeId }
        });
      }

      res.json({ success: true, message: "Information approved" });
    } catch (error) {
      console.error("Info approval error:", error);
      res.status(500).json({ success: false, message: "Server error" });
    }
  });

  // Office: Accept declarations
  app.post("/api/renew/:renewalId/accept-declarations", ensureOffice, async (req, res) => {
    try {
      const renewalId = parseInt(req.params.renewalId);
      const officeId = req.session.officeId;

      const renewal = await storage.getLicenseRenewal(renewalId);
      if (!renewal || renewal.officeId !== officeId) {
        return res.status(403).json({ success: false, message: "Not authorized" });
      }

      // State guard: must have approved info first
      if (renewal.renewalState !== 'INFO_APPROVED' && renewal.renewalState !== 'PAYMENT_PENDING') {
        return res.status(403).json({ 
          success: false, 
          message: "Please review and approve your information first" 
        });
      }

      // Update renewal state
      await storage.updateLicenseRenewal(renewalId, {
        renewalState: 'PAYMENT_PENDING',
        declarationsAccepted: true
      });

      // Log the step
      await storage.createRenewalStep({
        renewalId,
        officeId,
        stepType: 'DECLARATIONS_ACCEPTED',
        ipAddress: getClientIp(req),
        userAgent: req.headers['user-agent']
      });

      // Audit log: Declarations accepted
      const user = req.user as any;
      if (user) {
        await storage.createAuditLog({
          userId: user.id,
          action: 'RENEWAL_DECLARATIONS_ACCEPTED',
          targetType: 'renewal',
          targetId: renewalId,
          details: { officeId }
        });
      }

      res.json({ success: true, message: "Declarations accepted" });
    } catch (error) {
      console.error("Declaration acceptance error:", error);
      res.status(500).json({ success: false, message: "Server error" });
    }
  });

  // Office: Initiate payment
  app.post("/api/renew/:renewalId/initiate-payment", ensureOffice, async (req, res) => {
    try {
      const renewalId = parseInt(req.params.renewalId);
      const officeId = req.session.officeId;

      const renewal = await storage.getLicenseRenewal(renewalId);
      if (!renewal || renewal.officeId !== officeId) {
        return res.status(403).json({ success: false, message: "Not authorized" });
      }

      // State guard: must have accepted declarations first
      if (renewal.renewalState !== 'PAYMENT_PENDING') {
        return res.status(403).json({ 
          success: false, 
          message: "Please accept the declarations first" 
        });
      }

      // TODO: Integrate with payment gateway
      // For now, simulate payment initiation

      // Log the step
      await storage.createRenewalStep({
        renewalId,
        officeId,
        stepType: 'PAYMENT_INITIATED',
        ipAddress: getClientIp(req),
        userAgent: req.headers['user-agent']
      });

      res.json({ 
        success: true, 
        message: "Payment initiated",
        paymentUrl: `/office/renewal/${renewalId}/payment` 
      });
    } catch (error) {
      console.error("Payment initiation error:", error);
      res.status(500).json({ success: false, message: "Server error" });
    }
  });

  // Office: Confirm payment (webhook or manual confirmation)
  app.post("/api/renew/:renewalId/confirm-payment", ensureOffice, async (req, res) => {
    try {
      const renewalId = parseInt(req.params.renewalId);
      const officeId = req.session.officeId;

      const renewal = await storage.getLicenseRenewal(renewalId);
      if (!renewal || renewal.officeId !== officeId) {
        return res.status(403).json({ success: false, message: "Not authorized" });
      }

      // State guard: must be in PAYMENT_PENDING state
      if (renewal.renewalState !== 'PAYMENT_PENDING') {
        return res.status(403).json({ 
          success: false, 
          message: "Payment cannot be confirmed at this stage" 
        });
      }

      // Update renewal state to completed
      await storage.updateLicenseRenewal(renewalId, {
        renewalState: 'COMPLETED',
        paymentCompleted: true,
        canTransact2026: true
      });

      // Update office lastRenewalYear
      await storage.updateOffice(officeId, {
        lastRenewalYear: 2026
      });

      // Log the steps
      await storage.createRenewalStep({
        renewalId,
        officeId,
        stepType: 'PAYMENT_CONFIRMED',
        ipAddress: getClientIp(req),
        userAgent: req.headers['user-agent']
      });

      await storage.createRenewalStep({
        renewalId,
        officeId,
        stepType: 'RENEWAL_COMPLETED',
        ipAddress: getClientIp(req),
        userAgent: req.headers['user-agent']
      });

      res.json({ 
        success: true, 
        message: "Payment confirmed. Your 2026 license renewal is complete.",
        canTransact2026: true
      });
    } catch (error) {
      console.error("Payment confirmation error:", error);
      res.status(500).json({ success: false, message: "Server error" });
    }
  });

  // Office: Get renewal status
  app.get("/api/renew/status", ensureOffice, async (req, res) => {
    try {
      const officeId = req.session.officeId;
      const status = await getOfficeRenewalStatus(officeId!, 2026);
      res.json(status);
    } catch (error) {
      console.error("Get renewal status error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  // Admin: Get invitation statistics
  app.get("/api/admin/renewal-invitations/stats", ensureAdmin, async (req, res) => {
    try {
      const year = parseInt(req.query.year as string) || 2026;
      const stats = await getInvitationStats(year);
      res.json(stats);
    } catch (error) {
      console.error("Get invitation stats error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  // Admin: Get all invitation statuses
  app.get("/api/admin/renewal-invitations", ensureAdmin, async (req, res) => {
    try {
      const year = parseInt(req.query.year as string) || 2026;
      
      // Get all active offices (those with lastRenewalYear = 2025)
      const offices = await storage.getActiveOfficesForRenewal(2025);
      
      const invitationStatuses = await Promise.all(offices.map(async (office) => {
        const renewal = await storage.getRenewalByOfficeAndYear(office.id, year);
        const invite = renewal ? await storage.getLatestInviteForRenewal(renewal.id) : null;
        
        return {
          officeId: office.id,
          officeName: office.name,
          officeNameEn: office.nameEn,
          email: office.email,
          lastRenewalYear: office.lastRenewalYear,
          inviteStatus: invite?.status || 'NOT_INVITED',
          renewalState: renewal?.renewalState || null,
          inviteSentAt: invite?.sentAt || null,
          tokenRedeemedAt: invite?.consumedAt || null
        };
      }));
      
      res.json(invitationStatuses);
    } catch (error) {
      console.error("Get invitation statuses error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  // Admin: Send bulk invitations
  app.post("/api/admin/renewal-invitations/send-bulk", ensureAdmin, async (req, res) => {
    try {
      const year = parseInt(req.body.year) || 2026;
      const result = await sendBulkInvitations(year);
      res.json(result);
    } catch (error) {
      console.error("Send bulk invitations error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  // Admin: Send single invitation
  app.post("/api/admin/renewal-invitations/send/:officeId", ensureAdmin, async (req, res) => {
    try {
      const officeId = parseInt(req.params.officeId);
      const year = parseInt(req.body.year) || 2026;
      const user = req.user as any;

      // Find or create renewal for this office
      let renewal = await storage.getRenewalByOfficeAndYear(officeId, year);
      if (!renewal) {
        renewal = await storage.createLicenseRenewal({
          officeId,
          year,
          status: 'DRAFT',
          renewalState: 'NOT_STARTED'
        });
      }

      const result = await createRenewalInvitation(officeId, renewal.id);
      
      // Audit log: Invitation sent
      if (result.success) {
        await storage.createAuditLog({
          userId: user.id,
          action: 'RENEWAL_INVITE_SENT',
          targetType: 'renewal',
          targetId: renewal.id,
          details: { officeId, year, inviteId: result.inviteId, emailSent: result.emailSent }
        });
      }
      
      res.json(result);
    } catch (error) {
      console.error("Send invitation error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  // Admin: Resend invitation
  app.post("/api/admin/renewal-invitations/resend/:officeId", ensureAdmin, async (req, res) => {
    try {
      const officeId = parseInt(req.params.officeId);
      const year = parseInt(req.body.year) || 2026;

      const renewal = await storage.getRenewalByOfficeAndYear(officeId, year);
      if (!renewal) {
        return res.status(404).json({ success: false, message: "No renewal found for this office" });
      }

      const result = await resendInvitation(officeId, renewal.id);
      res.json(result);
    } catch (error) {
      console.error("Resend invitation error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  // Health check endpoint for monitoring
  app.get("/api/health", async (req, res) => {
    try {
      // Check database connectivity
      await pool.query('SELECT 1');

      res.json({
        status: "healthy",
        timestamp: new Date().toISOString(),
        uptime: Math.floor(process.uptime()),
        database: "connected",
        environment: env.NODE_ENV,
        version: "1.0.0"
      });
    } catch (error) {
      console.error("Health check failed:", error);
      res.status(503).json({
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        database: "disconnected",
        error: "Database connection failed"
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
