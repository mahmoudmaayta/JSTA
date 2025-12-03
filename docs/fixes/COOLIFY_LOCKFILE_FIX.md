# Coolify Deployment - pnpm Lockfile Fix

## Issue
Coolify deployment failed with error:
```
ERR_PNPM_OUTDATED_LOCKFILE  Cannot install with "frozen-lockfile"
because pnpm-lock.yaml is not up to date with package.json
```

## Root Cause
When we installed additional packages (`nodemailer`, `@types/nodemailer`, `@types/ws`) during development using `npm`, the `pnpm-lock.yaml` file became out of sync with `package.json`.

Coolify uses `pnpm` as the package manager and runs `pnpm install --frozen-lockfile` during deployment, which requires the lockfile to be exactly in sync.

## Solution Applied

### 1. Regenerated pnpm Lockfile
```bash
pnpm install
```

This regenerated `pnpm-lock.yaml` to match the current `package.json`.

### 2. Committed Changes
```bash
git add pnpm-lock.yaml Dockerfile .dockerignore
git commit -m "Add Coolify deployment configuration and fix pnpm lockfile"
git push origin main
```

### 3. Added Deployment Files
Also included in the commit:
- `Dockerfile` - Multi-stage production build
- `.dockerignore` - Exclude unnecessary files
- `docs/fixes/DEPLOYMENT_COOLIFY.md` - Full deployment guide
- `docs/fixes/DEPLOYMENT_CHECKLIST.md` - Step-by-step checklist
- Health check endpoint at `/api/health`

## Why This Happens

**Mixed Package Managers:**
- Local development uses **npm** (from `npm install`, `npm run dev`)
- Coolify deployment uses **pnpm** (faster, more efficient)
- Each has its own lockfile format (`package-lock.json` vs `pnpm-lock.yaml`)

**The Fix:**
When you add packages locally with npm, you must regenerate the pnpm lockfile before deploying to Coolify.

## Prevention

### Option 1: Use pnpm Locally (Recommended)
```bash
# Install pnpm globally
npm install -g pnpm

# Use pnpm for all operations
pnpm install
pnpm run dev
pnpm add <package>
```

### Option 2: Regenerate Before Deploying
If you prefer using npm locally:
```bash
# After installing packages with npm
npm install <package>

# Regenerate pnpm lockfile before committing
pnpm install

# Then commit and push
git add package.json pnpm-lock.yaml
git commit -m "Add <package>"
git push
```

## Verification

After pushing, Coolify should now successfully:
1. ✅ Clone your repository
2. ✅ Run `pnpm install --frozen-lockfile` (no longer fails)
3. ✅ Build the application with `npm run build`
4. ✅ Start with `npm start`

## Next Deployment

Now you can deploy to Coolify:

1. **In Coolify:**
   - Go to your application
   - Click "Deploy" or wait for auto-deploy

2. **Expected Build Process:**
   ```
   Step 1: Clone repository ✅
   Step 2: pnpm install --frozen-lockfile ✅ (Fixed!)
   Step 3: npm run build ✅
   Step 4: Start container with npm start ✅
   ```

3. **After Deployment:**
   - Access Coolify terminal
   - Run database migrations:
     ```bash
     npm run db:push
     ```

## Troubleshooting

### If Deployment Still Fails

**Check 1: Verify lockfile was pushed**
```bash
git log --oneline -1
# Should show: "Add Coolify deployment configuration..."

git show HEAD:pnpm-lock.yaml | head -5
# Should show updated pnpm lockfile
```

**Check 2: Force redeploy in Coolify**
- Click "Redeploy" (not just "Deploy")
- This clears cached build layers

**Check 3: Ensure using latest code**
- Coolify pulls from `main` branch
- Verify auto-deploy is tracking correct branch

### If You See "specifiers don't match" Again

This means you made new changes locally. Solution:
```bash
# Regenerate lockfile
pnpm install

# Commit
git add pnpm-lock.yaml package.json
git commit -m "Update lockfile"
git push
```

## Related Files

- **DEPLOYMENT_COOLIFY.md** - Complete deployment guide
- **DEPLOYMENT_CHECKLIST.md** - Step-by-step deployment checklist
- **Dockerfile** - Production Docker configuration
- **.dockerignore** - Build optimization

## Summary

✅ **Issue:** pnpm lockfile out of sync
✅ **Solution:** Regenerated with `pnpm install`
✅ **Status:** Fixed and pushed to repository
✅ **Result:** Ready for Coolify deployment

**Your application is now ready to deploy to Coolify!** 🚀

---

**Date Fixed:** November 26, 2025
**Commit:** 59f34f1 - "Add Coolify deployment configuration and fix pnpm lockfile"
