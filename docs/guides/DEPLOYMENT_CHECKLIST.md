# Coolify Deployment Checklist

Use this checklist to ensure a smooth deployment to Coolify.

## ✅ Pre-Deployment

### Code Preparation
- [ ] All changes committed to git
- [ ] Code pushed to repository (GitHub/GitLab)
- [ ] Branch selected for deployment (usually `main`)
- [ ] `.env` file is **NOT** committed (check `.gitignore`)
- [ ] Build succeeds locally with `npm run build`
- [ ] Production start works locally with `npm start`

### Database Setup
- [ ] PostgreSQL database is ready (NeonDB or other)
- [ ] Database connection string is available
- [ ] Connection string includes `?sslmode=require`
- [ ] Database allows connections from Coolify

### Security Preparation
- [ ] Generate SESSION_SECRET: `openssl rand -base64 64`
- [ ] Choose strong ADMIN_PASSWORD
- [ ] SMTP credentials ready (or plan to use console fallback)

## 🚀 Coolify Configuration

### Application Creation
- [ ] Create new application in Coolify
- [ ] Connect git repository
- [ ] Select correct branch (`main`)
- [ ] Set build pack to **Node.js**

### Build Settings
- [ ] Build command: `npm run build`
- [ ] Start command: `npm start`
- [ ] Port: `5000`
- [ ] Install command: `npm ci` (or auto-detected)

### Environment Variables

#### Required
- [ ] `DATABASE_URL` - PostgreSQL connection string
- [ ] `SESSION_SECRET` - At least 64 characters
- [ ] `NODE_ENV` - Set to `production`

#### Recommended
- [ ] `SMTP_HOST` - Email server hostname
- [ ] `SMTP_PORT` - Email server port (usually 587)
- [ ] `SMTP_USER` - Email username
- [ ] `SMTP_PASS` - Email password/token
- [ ] `SMTP_FROM` - From email address
- [ ] `ADMIN_EMAIL` - Admin user email
- [ ] `ADMIN_PASSWORD` - Admin user password

#### Optional
- [ ] `PORT` - Override default port (Coolify sets automatically)
- [ ] `MAX_FILE_SIZE` - Max upload size in bytes
- [ ] `ALLOWED_FILE_TYPES` - Comma-separated MIME types

## 🔨 Deployment Steps

### Initial Deployment
- [ ] Click "Deploy" in Coolify
- [ ] Monitor build logs for errors
- [ ] Wait for "Deployed successfully" message
- [ ] Check application logs for startup messages

### Post-Deployment Setup
- [ ] Open Coolify terminal/exec into container
- [ ] Run database migration: `npm run db:push`
- [ ] Verify admin user was seeded (check logs)
- [ ] Confirm session table was created

### Testing
- [ ] Open application URL
- [ ] Test homepage loads
- [ ] Try admin login
- [ ] Create a test office registration
- [ ] Upload a test document
- [ ] Check email notifications (if SMTP configured)

## 🔍 Verification

### Application Health
- [ ] Health endpoint responds: `/api/health`
- [ ] Logs show: `serving on port 5000`
- [ ] No database connection errors
- [ ] Session storage working (login persists)

### Features Working
- [ ] User login/logout
- [ ] Admin dashboard shows stats
- [ ] Office registration form works
- [ ] Document upload succeeds
- [ ] PDF generation works
- [ ] Email notifications sent (or logged if no SMTP)

### Security Checks
- [ ] HTTPS is enabled (Coolify handles)
- [ ] Cookies have `secure` flag
- [ ] Admin password changed from default
- [ ] Database uses SSL/TLS
- [ ] Environment variables are secret (not in logs)

## 🔄 Continuous Deployment (Optional)

### Auto-Deploy Setup
- [ ] Enable "Auto Deploy" in Coolify
- [ ] Select trigger: "Push to branch"
- [ ] Choose branch: `main`
- [ ] Test by pushing a small change

## 🐛 Troubleshooting

### If Build Fails
- [ ] Check build logs in Coolify
- [ ] Verify `package.json` scripts are correct
- [ ] Ensure dependencies are in `dependencies` not just `devDependencies`
- [ ] Try rebuilding: Click "Redeploy"

### If Application Crashes
- [ ] Check application logs
- [ ] Verify all environment variables are set
- [ ] Test database connection string
- [ ] Ensure migrations ran successfully

### If Database Connection Fails
- [ ] Verify `DATABASE_URL` is correct
- [ ] Check database firewall/whitelist
- [ ] Ensure `?sslmode=require` is in connection string
- [ ] Test connection from Coolify terminal: `psql $DATABASE_URL`

### If Sessions Don't Persist
- [ ] Verify `SESSION_SECRET` is set
- [ ] Check session table exists in database
- [ ] Ensure cookies are being set (browser dev tools)
- [ ] Verify HTTPS is enabled (required for secure cookies)

## 📊 Post-Deployment Monitoring

### Daily Checks
- [ ] Application is responding
- [ ] No errors in logs
- [ ] Database connection stable

### Weekly Checks
- [ ] Review application logs
- [ ] Check disk space (if using file uploads)
- [ ] Verify email deliverability
- [ ] Monitor database size

### Monthly Tasks
- [ ] Update dependencies: `npm update`
- [ ] Review security advisories: `npm audit`
- [ ] Backup database
- [ ] Test disaster recovery

## 📝 Environment Variables Reference

### Quick Copy-Paste Template

```env
# Required
DATABASE_URL=postgresql://user:pass@host/db?sslmode=require
SESSION_SECRET=<generate_with_openssl_rand>
NODE_ENV=production

# Email (Recommended)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@goatourism.gov

# Admin (Recommended)
ADMIN_EMAIL=admin@goatourism.gov
ADMIN_PASSWORD=<strong_password>

# Optional
MAX_FILE_SIZE=10485760
```

## ✅ Sign-Off

After completing all items above, you're ready for production!

- Deployment Date: ________________
- Deployed By: ________________
- Environment: ☐ Staging  ☐ Production
- Version/Commit: ________________

### Final Checks
- [ ] All tests passed
- [ ] Monitoring configured
- [ ] Backup strategy in place
- [ ] Team notified of deployment
- [ ] Documentation updated

---

**Next Steps:**
- Monitor application for 24 hours
- Test all critical user flows
- Set up alerts for errors
- Schedule first backup

**Need Help?** See `DEPLOYMENT_COOLIFY.md` for detailed instructions.
