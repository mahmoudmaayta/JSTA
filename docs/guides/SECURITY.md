# Security Best Practices & Implementation Guide

## Overview

This document outlines the security improvements implemented in the Tourism Portal and best practices for maintaining a secure application.

## Critical Security Fixes Implemented

### 1. Environment Variable Validation ✅
- **File**: `server/config/env.ts`
- **What**: Validates required environment variables at startup
- **Impact**: Prevents deployment with weak or missing configuration
- **Action Required**: Ensure `.env` has strong `SESSION_SECRET` (generate with: `openssl rand -base64 32`)

### 2. Password Policy Strengthening ✅
- **File**: `shared/schema.ts`
- **Changes**:
  - Minimum length increased from 6 to 8 characters
  - Requires uppercase, lowercase, number, and special character
  - Validated at schema level (frontend + backend)

### 3. Security Headers with Helmet ✅
- **File**: `server/app.ts`
- **What**: Added helmet middleware for security headers
- **Protection Against**: XSS, Clickjacking, MIME sniffing, etc.
- **Headers Set**: CSP, HSTS, X-Frame-Options, X-Content-Type-Options

### 4. Rate Limiting ⚠️ (Partially Implemented)
- **File**: `server/middleware/security.ts`
- **What**: Rate limiters for login, API, and file uploads
- **Limits**:
  - Login: 5 attempts per 15 minutes
  - API: 100 requests per minute
  - Uploads: 10 files per hour
- **Status**: Code created, needs to be applied to routes

### 5. Input Sanitization ✅
- **File**: `server/middleware/security.ts`
- **Functions**: `sanitizeInput()`, `sanitizeFileName()`
- **Protection Against**: XSS, path traversal, null byte injection

### 6. File Upload Security ✅
- **File**: `server/middleware/security.ts`
- **Validations**:
  - MIME type matches file extension
  - File name sanitization
  - Extension whitelist
- **Status**: Functions created, needs integration

### 7. IP Address Extraction ✅
- **File**: `server/middleware/security.ts`
- **Function**: `getClientIp()`
- **What**: Properly handles X-Forwarded-For behind proxies

## Remaining Security Vulnerabilities

### 🔴 CRITICAL - Requires Immediate Action

1. **Weak Session Secret**
   - **Location**: `server/routes.ts:122`
   - **Issue**: Default secret still in code as fallback
   - **Fix**: Remove fallback, enforce via env validation
   - **Command**: `openssl rand -base64 32` and add to `.env`

2. **No Rate Limiting on Routes**
   - **Issue**: Rate limiters created but not applied
   - **Impact**: Vulnerable to brute force and DoS
   - **Fix**: Apply `rateLimitMiddleware` to routes (see instructions below)

3. **Timing Attack on Login**
   - **Location**: `server/routes.ts:168-175`
   - **Issue**: Different errors for "user not found" vs "wrong password"
   - **Fix**: Use generic "Invalid credentials" for both cases

### 🟠 HIGH PRIORITY

4. **No CSRF Protection**
   - **Issue**: No CSRF tokens for state-changing operations
   - **Recommendation**: Add `csurf` middleware
   - **Alternative**: Use `sameSite: 'strict'` cookies (currently `'lax'`)

5. **Insufficient Audit Logging**
   - **Missing**: Failed login attempts, password changes
   - **Location**: Throughout `server/routes.ts`
   - **Fix**: Add audit logs for security events

6. **No Transaction Support**
   - **Issue**: Complex operations can fail partially
   - **Impact**: Data inconsistency
   - **Examples**: Registration, renewal submission
   - **Fix**: Wrap in database transactions

### 🟡 MEDIUM PRIORITY

7. **File Upload Improvements Needed**
   - No virus scanning
   - No file content validation (actual format vs extension)
   - No quota limits per office
   - **Recommendations**:
     - Integrate ClamAV or similar
     - Add `file-type` npm package for magic number checking
     - Implement storage quotas

8. **Session Management**
   - No concurrent session limits
   - No "remember me" functionality
   - Fixed 24-hour timeout
   - **Recommendation**: Make configurable, add session management UI

9. **Email Security**
   - Currently just console logs
   - No SPF/DKIM when implemented
   - **Recommendation**: Use SendGrid/AWS SES with proper authentication

## How to Apply Security Fixes

### Step 1: Update Environment Variables

```bash
# Generate strong session secret
openssl rand -base64 32

# Add to .env file
echo "SESSION_SECRET=<generated-secret>" >> .env
```

### Step 2: Apply Database Indexes

```bash
# Run the migration
psql $DATABASE_URL -f migrations/001_add_performance_indexes.sql
```

Or using npm script:
```bash
npm run db:migrate
```

### Step 3: Apply Rate Limiting to Routes

Update `server/routes.ts` to import and use rate limiters:

```typescript
import {
  loginRateLimiter,
  apiRateLimiter,
  uploadRateLimiter,
  rateLimitMiddleware
} from "./middleware/security";

// Apply to login endpoint
app.post("/api/auth/login",
  rateLimitMiddleware(loginRateLimiter),
  async (req, res) => {
    // existing login logic
  }
);

// Apply to file upload endpoints
app.post("/api/auth/register",
  rateLimitMiddleware(uploadRateLimiter),
  initialUpload.array("documents", 20),
  async (req, res) => {
    // existing logic
  }
);
```

### Step 4: Fix Timing Attack

Update login endpoint in `server/routes.ts`:

```typescript
// Before:
if (!user) {
  return res.status(401).json({ message: "Invalid email or password" });
}

const isValid = await bcrypt.compare(password, user.passwordHash);
if (!isValid) {
  return res.status(401).json({ message: "Invalid email or password" });
}

// After: Use consistent timing
const user = await storage.getUserByEmail(email);
const isValid = user ? await bcrypt.compare(password, user.passwordHash) : false;

if (!user || !isValid) {
  // Log failed attempt to audit log
  await storage.createAuditLog({
    userId: user?.id || 0,
    action: "LOGIN_FAILED",
    targetType: "user",
    targetId: user?.id || 0,
    details: { email, ip: getClientIp(req) }
  });

  return res.status(401).json({ message: "Invalid credentials" });
}
```

### Step 5: Enable Strict SameSite Cookies

Update `server/routes.ts` session configuration:

```typescript
cookie: {
  secure: process.env.NODE_ENV === 'production',
  httpOnly: true,
  sameSite: 'strict', // Changed from 'lax'
  maxAge: 24 * 60 * 60 * 1000,
},
```

## Security Monitoring

### What to Monitor

1. **Failed Login Attempts**
   - Alert on > 5 failures from same IP in 5 minutes
   - Alert on > 10 failures to same account in 1 hour

2. **File Upload Patterns**
   - Unusual file sizes
   - High upload frequency
   - Failed upload attempts

3. **Database Performance**
   - Slow queries (> 1 second)
   - Connection pool exhaustion
   - Unusual query patterns

4. **Session Anomalies**
   - Session hijacking indicators
   - Geographic impossibilities
   - Rapid session creation

### Recommended Tools

- **Logging**: Winston or Pino for structured logs
- **Monitoring**: Sentry for error tracking
- **APM**: New Relic or DataDog for performance
- **Security**: Snyk for dependency vulnerabilities

## Security Checklist for Deployment

- [ ] Strong SESSION_SECRET set (32+ characters, random)
- [ ] DATABASE_URL uses SSL (`?sslmode=require`)
- [ ] All environment variables validated
- [ ] Database indexes applied
- [ ] Rate limiting enabled on all routes
- [ ] HTTPS enforced (secure cookies enabled)
- [ ] Helmet security headers active
- [ ] Regular backups configured
- [ ] Dependency audit clean (`npm audit`)
- [ ] Security logs monitored
- [ ] Incident response plan documented

## Dependency Security

### Regular Maintenance

```bash
# Check for vulnerabilities
npm audit

# Fix automatically fixable issues
npm audit fix

# For breaking changes (review carefully)
npm audit fix --force
```

### Current Vulnerabilities (as of implementation)

Run `npm audit` to see current status. Address:
- HIGH and CRITICAL vulnerabilities immediately
- MODERATE within 30 days
- LOW within 90 days

## Incident Response

### In Case of Security Breach

1. **Immediate Actions**:
   - Rotate SESSION_SECRET
   - Invalidate all sessions
   - Reset admin passwords
   - Review audit logs

2. **Investigation**:
   - Check audit_logs table
   - Review server access logs
   - Identify affected data

3. **Communication**:
   - Notify affected users
   - Document findings
   - Update security measures

4. **Prevention**:
   - Apply fixes
   - Update this document
   - Train team on findings

## Contact

For security concerns, contact: security@example.com

---

**Last Updated**: December 3, 2025
**Next Review**: March 3, 2026
