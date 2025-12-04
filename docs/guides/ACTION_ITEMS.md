# Action Items - Security & Performance Fixes

This document provides step-by-step instructions to complete the security hardening and performance optimization of the Tourism Portal.

---

## ✅ Completed (By Code Review)

The following improvements have been implemented:

1. ✅ Created security middleware with rate limiters (`server/middleware/security.ts`)
2. ✅ Added environment variable validation (`server/config/env.ts`)
3. ✅ Strengthened password requirements (8+ chars, complexity rules)
4. ✅ Added Helmet security headers
5. ✅ Created comprehensive database indexes migration
6. ✅ Fixed 4 dependency vulnerabilities with `npm audit fix`
7. ✅ Created security documentation (`SECURITY.md`)
8. ✅ Created comprehensive code review summary

---

## 🔴 CRITICAL - Must Do Before Any Deployment

### 1. Generate Strong Session Secret

**Why**: Default session secret makes all sessions vulnerable to hijacking.

**How**:
```bash
# Generate a cryptographically strong secret
openssl rand -base64 32

# Copy the output and add to .env file
# Replace the existing SESSION_SECRET value
```

**Verify**: When you start the application, it should not show any warnings about weak SESSION_SECRET.

---

### 2. Apply Database Performance Indexes

**Why**: Without indexes, queries will be slow as data grows.

**How**:
```bash
# Run the migration
npm run db:migrate

# Or manually:
psql $DATABASE_URL -f migrations/001_add_performance_indexes.sql
```

**Verify**: Check PostgreSQL logs for successful index creation.

---

### 3. Fix Timing Attack in Login Endpoint

**Why**: Current implementation reveals whether an email exists.

**File**: `server/routes.ts` around line 158

**Replace this**:
```typescript
app.post("/api/auth/login", async (req, res) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid input", errors: parsed.error.errors });
    }

    const { email, password } = parsed.data;
    const user = await storage.getUserByEmail(email);

    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" }); // ← ISSUE: Reveals user doesn't exist
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ message: "Invalid email or password" }); // ← ISSUE: Different timing
    }

    // ... rest of login logic
  }
});
```

**With this**:
```typescript
import { getClientIp } from "./middleware/security";

app.post("/api/auth/login", async (req, res) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid input", errors: parsed.error.errors });
    }

    const { email, password } = parsed.data;
    const user = await storage.getUserByEmail(email);

    // Always perform bcrypt comparison to prevent timing attacks
    const isValid = user
      ? await bcrypt.compare(password, user.passwordHash)
      : await bcrypt.compare(password, "$2a$10$invalidhashtopreventtimingattacks");

    if (!user || !isValid) {
      // Log failed attempt for security monitoring
      await storage.createAuditLog({
        userId: user?.id || 0,
        action: "LOGIN_FAILED" as any, // Add to AuditAction enum
        targetType: "user",
        targetId: user?.id || 0,
        details: { email, ip: getClientIp(req), timestamp: new Date().toISOString() }
      });

      return res.status(401).json({ message: "Invalid credentials" }); // ← Generic message
    }

    // ... rest of login logic (office status check, session creation, etc.)
  }
});
```

**Also add to schema.ts**:
```typescript
// In AuditAction object around line 257
export const AuditAction = {
  // ... existing actions
  LOGIN_FAILED: 'LOGIN_FAILED',
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
} as const;
```

---

### 4. Apply Rate Limiting to Routes

**Why**: Prevents brute force attacks and DoS.

**File**: `server/routes.ts`

**Add imports at the top**:
```typescript
import {
  loginRateLimiter,
  uploadRateLimiter,
  rateLimitMiddleware,
  getClientIp,
} from "./middleware/security";
```

**Apply to login endpoint** (around line 158):
```typescript
app.post("/api/auth/login",
  rateLimitMiddleware(loginRateLimiter), // ← ADD THIS
  async (req, res) => {
    // existing login logic
  }
);
```

**Apply to registration endpoint** (around line 237):
```typescript
app.post("/api/auth/register",
  rateLimitMiddleware(uploadRateLimiter), // ← ADD THIS
  initialUpload.array("documents", 20),
  async (req, res) => {
    // existing registration logic
  }
);
```

**Apply to other file upload endpoints**:
```typescript
// Around line 499 (ministry doc upload)
app.post("/api/office/renewals/:id/upload-ministry-doc",
  ensureOffice,
  rateLimitMiddleware(uploadRateLimiter), // ← ADD THIS
  ministryUpload.single("document"),
  async (req, res) => {
    // existing logic
  }
);

// Around line 1543 (renewal attachments)
app.post("/api/office/renewals-2026/:id/attachments",
  ensureOffice,
  rateLimitMiddleware(uploadRateLimiter), // ← ADD THIS
  renewalUpload.single("file"),
  async (req, res) => {
    // existing logic
  }
);
```

---

### 5. Change Session Cookie SameSite Policy

**Why**: Provides better CSRF protection.

**File**: `server/routes.ts` around line 125

**Change this**:
```typescript
cookie: {
  secure: process.env.NODE_ENV === 'production',
  httpOnly: true,
  sameSite: 'lax', // ← CHANGE THIS
  maxAge: 24 * 60 * 60 * 1000,
},
```

**To this**:
```typescript
cookie: {
  secure: process.env.NODE_ENV === 'production',
  httpOnly: true,
  sameSite: 'strict', // ← STRICTER CSRF PROTECTION
  maxAge: 24 * 60 * 60 * 1000,
},
```

**Note**: If this breaks your frontend (CORS issues), you may need to ensure your frontend and backend are on the same domain/subdomain.

---

## 🟠 HIGH PRIORITY - Do Within This Week

### 6. Add Failed Login Audit Logging

Already partially covered in #3 above. Additionally, add successful login logging:

```typescript
// After successful login (around line 186)
req.session.userId = user.id;

// Add this:
await storage.createAuditLog({
  userId: user.id,
  action: "LOGIN_SUCCESS" as any,
  targetType: "user",
  targetId: user.id,
  details: { email, ip: getClientIp(req), timestamp: new Date().toISOString() }
});
```

---

### 7. Add Password Change Audit Logging

**File**: `server/routes.ts` around line 406

**Add after successful password change**:
```typescript
await storage.updateUserPassword(user.id, hashedPassword);

// Add this:
await storage.createAuditLog({
  userId: user.id,
  action: "PASSWORD_CHANGED" as any,
  targetType: "user",
  targetId: user.id,
  details: { ip: getClientIp(req), timestamp: new Date().toISOString() }
});

res.json({ message: "Password changed successfully" });
```

---

### 8. Address Remaining Dependency Vulnerabilities

**Current Status**: 5 moderate vulnerabilities in esbuild/vite (dev dependencies)

**Assessment**: These are development-only vulnerabilities that don't affect production builds.

**Options**:
1. **Accept the risk** (recommended): Document that these are dev-only
2. **Force update**: Run `npm audit fix --force` (may break build)

**Recommendation**: Document and monitor, as these don't affect production builds.

---

### 9. Implement File Upload MIME Type Validation

**File**: `server/routes.ts`

**Add import**:
```typescript
import { validateFileMimeType, sanitizeFileName } from "./middleware/security";
```

**Update file upload handlers** (registration, ministry docs, attachments):

```typescript
// Example for registration (around line 290)
if (files && files.length > 0) {
  for (let i = 0; i < files.length; i++) {
    const file = files[i];

    // ADD VALIDATION
    if (!validateFileMimeType(file.originalname, file.mimetype)) {
      fs.unlinkSync(file.path); // Delete invalid file
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
      originalFilename: sanitizeFileName(file.originalname), // ← SANITIZE
      uploadedByUserId: user.id,
    });
  }
}
```

Repeat for all file upload endpoints.

---

### 10. Add Health Check Endpoint

**File**: `server/routes.ts`

**Add before the catch-all route**:
```typescript
app.get("/api/health", async (req, res) => {
  try {
    // Check database connectivity
    await pool.query('SELECT 1');

    res.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: "connected",
      environment: process.env.NODE_ENV
    });
  } catch (error) {
    res.status(503).json({
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      error: "Database connection failed"
    });
  }
});
```

---

## 🟡 MEDIUM PRIORITY - Do Within This Month

### 11. Implement Database Transactions

For complex operations like registration and renewal submission, wrap in transactions:

```typescript
import { db } from "./storage";

// Example for registration
const result = await db.transaction(async (tx) => {
  // Create office
  const [office] = await tx.insert(offices).values(officeData).returning();

  // Create user
  const [user] = await tx.insert(users).values(userData).returning();

  // Create branches
  for (const branch of branchesData) {
    await tx.insert(branches).values({ ...branch, officeId: office.id });
  }

  // If any step fails, entire transaction rolls back
  return { office, user };
});
```

---

### 12. Setup Structured Logging

Install and configure Winston or Pino for better log management:

```bash
npm install winston
```

Create `server/logger.ts`:
```typescript
import winston from 'winston';

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple(),
  }));
}
```

Replace `console.log` and `console.error` with `logger.info` and `logger.error`.

---

### 13. Implement Email Service

For production, integrate a real email service:

```bash
npm install @sendgrid/mail
# or
npm install nodemailer
```

Update `server/email.ts` to use real SMTP.

---

## 🟢 NICE TO HAVE - Backlog

### 14. File Upload Virus Scanning

Integrate ClamAV or a cloud service like VirusTotal API.

### 15. Advanced Session Management

Add concurrent session limits, "remember me" functionality, session management UI.

### 16. API Response Standardization

Standardize all API responses to consistent format.

### 17. Performance Monitoring

Integrate APM tool (New Relic, DataDog, or Sentry).

---

## Testing After Changes

### 1. Test Login Security

```bash
# Try multiple failed logins - should get rate limited after 5 attempts
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"wrong"}' \
  -v

# After 5 attempts, should get 429 Too Many Requests
```

### 2. Test Environment Validation

```bash
# Remove SESSION_SECRET from .env temporarily
# Try to start the app - should fail with clear error message
npm run dev

# Restore SESSION_SECRET and verify app starts
```

### 3. Test Database Indexes

```bash
# Check indexes were created
psql $DATABASE_URL -c "\di"

# Should see many indexes starting with idx_
```

### 4. Test Health Endpoint

```bash
curl http://localhost:5000/api/health
# Should return {"status":"healthy", ...}
```

---

## Monitoring Checklist

After deployment, monitor:

- [ ] Failed login attempts (audit_logs table)
- [ ] Rate limit hits (will see 429 responses)
- [ ] Database query performance
- [ ] File upload sizes and frequency
- [ ] Error rates and types
- [ ] Session creation patterns

---

## Rollback Plan

If issues arise after applying changes:

1. **Rate limiting too strict**: Adjust limits in `server/middleware/security.ts`
2. **SameSite breaks frontend**: Change back to `'lax'` temporarily
3. **Database indexes slow down writes**: Remove specific indexes if needed
4. **Broken logins**: Check audit logs for details, may need to adjust timing attack fix

---

## Questions?

Refer to:
- `SECURITY.md` for detailed security documentation
- `CODE_REVIEW_SUMMARY.md` for full review findings
- Inline code comments in new files

---

**Priority Summary**:
- 🔴 5 Critical items to fix immediately (before any deployment)
- 🟠 5 High priority items (this week)
- 🟡 3 Medium priority items (this month)
- 🟢 4 Nice-to-have items (backlog)

**Estimated Time**: 1-2 days for critical + high priority items.

Good luck! 🚀
