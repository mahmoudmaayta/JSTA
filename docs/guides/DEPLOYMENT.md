# Deployment Guide - Jordan Tourism Portal

## Prerequisites

Before deploying, ensure you have:

1. ✅ Neon PostgreSQL database URL
2. ✅ Session secret key (generate with `openssl rand -base64 32`)
3. ✅ Deployment platform (Dokploy — see `CLAUDE.md`; the Dockerfile also works on Railway, Render, etc.)

## Environment Variables Required

Your deployment platform needs these environment variables:

```bash
# Database (REQUIRED)
DATABASE_URL=postgresql://user:password@host/database?sslmode=require

# Session Security (REQUIRED)
SESSION_SECRET=your-random-secret-key-here

# Application Config
PORT=5000
NODE_ENV=production
```

## Deployment Steps

### Option 1: Dokploy / Docker-based Platforms

1. **Push your code to GitHub** (ensure `.env` is NOT pushed)
   ```bash
   git push origin main
   ```

2. **Configure Environment Variables** in your deployment platform:
   - Go to your app settings
   - Add `DATABASE_URL` with your Neon connection string
   - Add `SESSION_SECRET` with a secure random string
   - Set `NODE_ENV=production`

3. **Deploy**
   - The Dockerfile will automatically:
     - Build the app with pnpm
     - Run database migrations (`pnpm run db:push`)
     - Seed the admin user
     - Start the production server

### Option 2: Railway / Render

1. **Connect Repository**
   - Link your GitHub repository

2. **Set Build Command**:
   ```bash
   pnpm install && pnpm run build && pnpm run db:push
   ```

3. **Set Start Command**:
   ```bash
   node dist/index.js
   ```

4. **Configure Environment Variables** (same as above)

## Post-Deployment Checklist

After deployment, verify:

- [ ] App is accessible at your deployment URL
- [ ] Database tables are created (check Neon dashboard)
- [ ] Admin user exists: `atallaabutaha@gmail.com` / `Admin123`
- [ ] Can login with admin credentials
- [ ] File uploads work (check `uploads/` directory)

## Troubleshooting

### Empty Database Tables

**Problem**: Tables exist but no admin user is seeded.

**Solutions**:

1. **Check logs** for database connection errors
2. **Verify DATABASE_URL** is correctly set
3. **Manually run migrations**:
   ```bash
   pnpm run db:push
   ```
4. **Check admin seeding** - should see in logs:
   ```
   Admin user seeded: atallaabutaha@gmail.com / Admin123
   ```

### Database Connection Errors

**Symptoms**: `ECONNREFUSED` or `relation does not exist`

**Solutions**:

1. **Verify DATABASE_URL format**:
   ```
   postgresql://username:password@host.neon.tech/dbname?sslmode=require
   ```

2. **Ensure `dotenv` is installed**:
   ```bash
   pnpm add dotenv
   ```

3. **Check Neon database**:
   - Database is not paused
   - Connection string is correct
   - IP whitelist allows your deployment platform

### Migration Not Running

**Problem**: App starts but tables aren't created.

**Solution**: The Dockerfile now runs migrations automatically in the CMD:
```dockerfile
CMD ["sh", "-c", "pnpm run db:push && node dist/index.js"]
```

If this fails, check:
- `drizzle.config.ts` is copied to production
- `DATABASE_URL` environment variable is set
- Drizzle Kit is installed

## Database Management

### Manual Migration

If you need to manually push schema changes:

```bash
# Locally
pnpm run db:push

# On deployment platform (if SSH access available)
docker exec -it <container> pnpm run db:push
```

### Backup Strategy

Your Neon database includes automatic backups. To create manual backup:

1. Go to Neon Console
2. Select your database
3. Click "Backups"
4. Create snapshot

### Reset Database (Development Only!)

**⚠️ WARNING: This deletes all data!**

```bash
# Drop all tables (via Neon SQL Editor)
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;

# Re-run migrations
pnpm run db:push
```

## Security Checklist

Before going to production:

- [ ] `.env` file is in `.gitignore`
- [ ] `SESSION_SECRET` is a strong random string
- [ ] Database password is complex
- [ ] HTTPS is enabled (handled by deployment platform)
- [ ] Neon database IP whitelist is configured
- [ ] `uploads/` directory is in `.gitignore`
- [ ] Change default admin password after first login

## Monitoring

### Health Check Endpoint

The app includes a health check at `/api/health` (needs to be implemented)

### Logs to Monitor

- Database connection status
- Admin user seeding confirmation
- File upload errors
- Session errors

## Scaling Considerations

### Database Connection Pooling

Current setup uses basic `pg` pooling. For high traffic:

1. Use Neon's connection pooling
2. Adjust pool size in `server/storage.ts`:
   ```typescript
   const pool = new Pool({
     connectionString: process.env.DATABASE_URL,
     max: 20, // Increase pool size
   });
   ```

### File Storage

Current: Local filesystem (`uploads/`)

For production scaling:
- [ ] Move to S3, Azure Blob, or Cloudinary
- [ ] Update multer configuration
- [ ] Update download endpoints

## Support

If you encounter issues:

1. Check deployment platform logs
2. Verify all environment variables are set
3. Test database connection from deployment platform
4. Review Neon database metrics

## Quick Deploy Commands

```bash
# Commit changes
git add .
git commit -m "Update deployment configuration"

# Push to trigger deployment
git push origin main

# Check deployment logs
# (Platform-specific command)
```
