# Deploying GoaTourismPortal to Coolify

> **Superseded.** The portal is no longer deployed on Coolify. It runs on
> **Dokploy** and auto-deploys from the **`dev`** branch — a push to `dev` builds
> and releases production, with no manual step. The Docker build, environment
> variables and health check described below still apply, because both platforms
> build the same `Dockerfile`; the platform-specific UI instructions do not.
> See the *Deployment* section of `CLAUDE.md` for the current facts.

This guide will walk you through deploying your GoaTourismPortal application to Coolify.

## ✅ Pre-Deployment Checklist

Your application is **already configured** correctly for Coolify deployment:

- ✅ Port configuration: Uses `process.env.PORT` with fallback to 5000
- ✅ Build scripts: `npm run build` and `npm start` are configured
- ✅ Environment variables: Type-safe validation with Zod
- ✅ Database: PostgreSQL-ready (NeonDB or any PostgreSQL instance)
- ✅ Sessions: PostgreSQL-backed session storage

## 📋 Prerequisites

1. **Coolify Instance**: A running Coolify server
2. **PostgreSQL Database**: Either:
   - NeonDB account (recommended for serverless)
   - Coolify-managed PostgreSQL
   - External PostgreSQL instance
3. **SMTP Server** (optional for development, required for production):
   - Gmail with App Password
   - SendGrid
   - AWS SES
   - Any SMTP provider

## 🚀 Step-by-Step Deployment

### Step 1: Prepare Your Repository

1. **Commit all changes:**
   ```bash
   git add .
   git commit -m "Prepare for Coolify deployment"
   git push origin main
   ```

2. **Ensure `.gitignore` is correct:**
   ```
   node_modules
   dist
   .DS_Store
   .env
   .env.local
   .env.*.local
   server/public
   uploads/
   ```

### Step 2: Create a New Project in Coolify

1. Log in to your Coolify dashboard
2. Click **"+ New"** → **"Application"**
3. Select your Git repository source (GitHub, GitLab, etc.)
4. Choose your repository: `GoaTourismPortal`
5. Select branch: `dev` (the branch production deploys from)

### Step 3: Configure Build Settings

In Coolify's application settings:

#### **Build Pack**
- Select: **Node.js**

#### **Build Command**
```bash
npm run build
```

#### **Start Command**
```bash
npm start
```

#### **Port**
- Set to: **5000**
- ⚠️ **Important**: Coolify will set `PORT` environment variable automatically, but ensure it's exposed correctly

#### **Install Command** (if needed)
```bash
npm ci
```

### Step 4: Configure Environment Variables

In Coolify's **Environment Variables** section, add the following:

#### **Required Variables**

```env
# Database Configuration
DATABASE_URL=postgresql://username:password@host:port/database?sslmode=require

# Session Secret (generate with: openssl rand -base64 64)
SESSION_SECRET=your_very_long_random_string_here_at_least_64_characters

# Node Environment
NODE_ENV=production

# Port (Coolify sets this automatically, but can be overridden)
PORT=5000
```

#### **Optional but Recommended Variables**

```env
# Email Service Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@goatourism.gov

# Admin Configuration
ADMIN_EMAIL=admin@goatourism.gov
ADMIN_PASSWORD=YourSecureAdminPassword123!

# File Upload Configuration
MAX_FILE_SIZE=10485760
```

### Step 5: Database Setup

#### Option A: Using NeonDB (Recommended)

1. Go to [neon.tech](https://neon.tech)
2. Create a new project
3. Copy the connection string
4. Add to Coolify environment variables as `DATABASE_URL`

**Example NeonDB connection string:**
```
postgresql://user:password@ep-xxx-xxx.region.aws.neon.tech/neondb?sslmode=require
```

#### Option B: Using Coolify PostgreSQL

1. In Coolify, go to **"Databases"**
2. Click **"+ New"** → **"PostgreSQL"**
3. Create the database
4. Copy the connection string
5. Add to your application's environment variables

#### Option C: External PostgreSQL

Use your existing PostgreSQL database connection string.

### Step 6: Generate Secure Secrets

Generate strong secrets for production:

```bash
# Generate SESSION_SECRET
openssl rand -base64 64

# Generate ADMIN_PASSWORD
openssl rand -base64 24
```

Add these to Coolify's environment variables.

### Step 7: Configure Persistent Storage (Optional)

If you want to persist uploaded files across deployments:

1. In Coolify application settings, go to **"Storage"**
2. Add a new volume:
   - **Source**: `/app/uploads`
   - **Destination**: `/persistent/uploads`
3. Click **"Add"**

**Note**: For production, consider using object storage (S3, MinIO, etc.) instead of filesystem storage.

### Step 8: Deploy!

1. Click **"Deploy"** in Coolify
2. Monitor the build logs
3. Wait for deployment to complete

### Step 9: Run Database Migrations

After first deployment, run migrations:

1. In Coolify, go to your application
2. Open **"Terminal"** or **"Logs"**
3. Run:
   ```bash
   npm run db:push
   ```

This will:
- Create all database tables
- Seed the admin user
- Set up the session table

### Step 10: Verify Deployment

1. **Check Application Logs:**
   - Look for: `serving on port 5000`
   - Check for any errors

2. **Test the Application:**
   - Open your Coolify-assigned URL
   - Try logging in with admin credentials
   - Test creating an office registration

3. **Verify Database Connection:**
   - Check logs for successful database queries
   - Verify session table was created

## 🔧 Coolify-Specific Configuration

### Dockerfile (Optional - if Coolify requires it)

If Coolify needs a Dockerfile, create `/Dockerfile`:

```dockerfile
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Build the application
RUN npm run build

# Expose port
EXPOSE 5000

# Set environment to production
ENV NODE_ENV=production

# Start the application
CMD ["npm", "start"]
```

### .dockerignore

Create `/.dockerignore`:

```
node_modules
dist
.DS_Store
.env
.env.local
.env.*.local
uploads
*.log
.git
.gitignore
README.md
docs/
REFACTORING_GUIDE.md
CHANGES.md
```

## 🔒 Security Checklist for Production

Before going live, ensure:

- ✅ `NODE_ENV=production` is set
- ✅ `SESSION_SECRET` is at least 64 characters
- ✅ `DATABASE_URL` uses SSL/TLS (`?sslmode=require`)
- ✅ Admin password is strong and changed from default
- ✅ SMTP credentials are configured (for email notifications)
- ✅ `.env` file is **NOT** committed to git
- ✅ HTTPS is enabled (Coolify handles this)
- ✅ Database backups are configured

## 🐛 Troubleshooting

### Issue: Port Binding Error

**Symptom:**
```
Error: listen EADDRINUSE: address already in use 0.0.0.0:5000
```

**Solution:**
- Coolify automatically sets the `PORT` environment variable
- Your app correctly reads `process.env.PORT || 5000`
- Check Coolify's port configuration matches what's exposed

### Issue: Database Connection Failed

**Symptom:**
```
Error: connect ECONNREFUSED
```

**Solutions:**
1. Verify `DATABASE_URL` is correct
2. Check database allows connections from Coolify's IP
3. Ensure `?sslmode=require` is in connection string
4. For NeonDB, verify WebSocket support is configured (already done in code)

### Issue: Build Failed

**Symptom:**
```
npm ERR! code ELIFECYCLE
```

**Solutions:**
1. Check build logs in Coolify
2. Verify `package.json` scripts are correct
3. Ensure all dependencies are in `dependencies` (not just `devDependencies`)
4. Regenerate the lockfile with `pnpm install` — this repo has no `package-lock.json`, so `npm ci` will fail

### Issue: Application Crashes on Start

**Solutions:**
1. Check environment variables are set correctly
2. Verify database is accessible
3. Run `npm run db:push` to ensure tables exist
4. Check application logs for specific errors

### Issue: Session Not Persisting

**Solutions:**
1. Verify `SESSION_SECRET` is set
2. Check PostgreSQL session table was created
3. Verify database connection is stable
4. Check cookie settings (secure: true requires HTTPS)

## 📊 Monitoring Your Application

### Coolify Built-in Monitoring

Coolify provides:
- **Logs**: Real-time application logs
- **Metrics**: CPU, Memory, Network usage
- **Health Checks**: Automatic monitoring

### Application Logs

Your app logs useful information:
```
9:14:17 PM [express] serving on port 5000
✅ Email service initialized with SMTP
✅ Admin user seeded: admin@goatourism.gov
```

Monitor logs for:
- Successful startup
- Database connection errors
- Failed login attempts
- Email delivery issues

## 🔄 Continuous Deployment

Coolify can automatically deploy when you push to your repository:

1. In Coolify application settings
2. Enable **"Auto Deploy"**
3. Choose trigger: **"Push to branch"**
4. Select branch: `dev`

Now every push to `main` will trigger a deployment!

## 📈 Scaling Considerations

### Horizontal Scaling

If you need multiple instances:

1. **Sessions**: Already using PostgreSQL session storage ✅
2. **File Uploads**: Migrate to object storage (S3, MinIO)
3. **Database**: Use connection pooling (already configured ✅)

### Performance Optimization

- Enable caching for static assets
- Use CDN for frontend assets
- Configure database indexes
- Monitor query performance

## 🆘 Getting Help

If you encounter issues:

1. **Check Logs**: Coolify dashboard → Your app → Logs
2. **Review Documentation**: See `/README.md` and `/REFACTORING_GUIDE.md`
3. **Database Issues**: Check connection string and firewall rules
4. **Build Issues**: Verify `package.json` and dependencies

## 📚 Related Documentation

- **README.md** - Application overview and local setup
- **REFACTORING_GUIDE.md** - Code structure and best practices
- **CHANGES.md** - Recent improvements and changes
- **.env.example** - All available environment variables

---

## ✅ Quick Reference

### Minimal Environment Variables for Coolify

```env
DATABASE_URL=postgresql://user:pass@host/db?sslmode=require
SESSION_SECRET=your_64_character_random_string_here
NODE_ENV=production
```

### Recommended Complete Setup

```env
# Required
DATABASE_URL=postgresql://user:pass@host/db?sslmode=require
SESSION_SECRET=your_64_character_random_string_here
NODE_ENV=production

# Email (highly recommended)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@goatourism.gov

# Admin (recommended)
ADMIN_EMAIL=admin@goatourism.gov
ADMIN_PASSWORD=SecurePassword123!
```

### Build Configuration Summary

| Setting | Value |
|---------|-------|
| Build Pack | Node.js |
| Build Command | `npm run build` |
| Start Command | `npm start` |
| Port | 5000 |
| Node Version | 20.x |

---

**Last Updated:** November 26, 2025
**Status:** Ready for Deployment
**Tested With:** Coolify v4.x, Node.js 20.x, PostgreSQL 16.x

Good luck with your deployment! 🚀
