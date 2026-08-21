# Critical Fix: pnpm-lock.yaml Missing from Docker Build

> **Historical record.** This describes a Coolify-era incident and is kept for
> context. The portal now deploys on Dokploy from the `dev` branch, building the
> same `Dockerfile`. The underlying lesson still holds.

## Issue
Coolify deployment continued to fail even after regenerating `pnpm-lock.yaml`:

```
ERR_PNPM_NO_LOCKFILE  Cannot install with "frozen-lockfile"
because pnpm-lock.yaml is absent
```

## Root Cause
The `.dockerignore` file was excluding `pnpm-lock.yaml` from the Docker build context!

**The Problem:**
```dockerignore
# .dockerignore (line 6)
pnpm-lock.yaml  ❌ This was excluding the lockfile!
```

When Docker builds the image, it:
1. Uses `.dockerignore` to determine which files to exclude
2. Copies files with `COPY . /app/.`
3. Because `pnpm-lock.yaml` was in `.dockerignore`, it never made it into the container
4. Result: `pnpm install --frozen-lockfile` failed because the file was missing

## The Fix

### Changed `.dockerignore` (line 6):
```dockerignore
# Before:
pnpm-lock.yaml

# After:
# pnpm-lock.yaml - KEEP THIS! Needed for pnpm install --frozen-lockfile
```

Simply commented out the exclusion so the lockfile is now included in the Docker build.

## Why This Happened

The original `.dockerignore` was likely created with the assumption that lockfiles should be excluded (common practice when you want fresh installs). However, **Coolify uses `pnpm install --frozen-lockfile`** which:

- **Requires** the lockfile to be present
- Fails immediately if lockfile is missing
- Ensures reproducible builds in CI/CD

## Verification

After this fix:
1. ✅ `pnpm-lock.yaml` is committed in git
2. ✅ `pnpm-lock.yaml` is **NOT** excluded by `.dockerignore`
3. ✅ `pnpm-lock.yaml` will be copied into Docker container
4. ✅ `pnpm install --frozen-lockfile` will succeed

## Testing Locally

You can verify the fix locally:

```bash
# Build Docker image
docker build -t goatourism-test .

# Check if pnpm-lock.yaml is in the image
docker run --rm goatourism-test ls -la /app/pnpm-lock.yaml

# Should show the file exists
```

## Deployment Status

**Commit:** 327aa50 - "Fix: Include pnpm-lock.yaml in Docker build"

**Pushed:** ✅ Yes (to origin/main)

**Ready:** ✅ Ready for Coolify deployment

## Next Steps

1. **Redeploy in Coolify:**
   - Go to your Coolify application
   - Click "Redeploy" (or wait for auto-deploy)

2. **Expected Build Process:**
   ```
   ✅ Clone repository
   ✅ Copy files (including pnpm-lock.yaml)
   ✅ pnpm install --frozen-lockfile (will work now!)
   ✅ npm run build
   ✅ npm start
   ```

3. **After Successful Deployment:**
   ```bash
   # In Coolify terminal
   npm run db:push
   ```

## Lessons Learned

### When to Exclude Lockfiles
- ❌ **DON'T** exclude lockfiles when using `--frozen-lockfile`
- ✅ **DO** include lockfiles for reproducible CI/CD builds

### .dockerignore Best Practices
```dockerignore
# Good: Exclude dev dependencies
node_modules

# Good: Exclude npm lockfile if using pnpm
package-lock.json

# BAD: Don't exclude pnpm lockfile if you're using pnpm!
# pnpm-lock.yaml  ❌

# Good: Exclude build artifacts
dist
```

## Related Files

- **COOLIFY_LOCKFILE_FIX.md** - First lockfile fix (regeneration)
- **DEPLOYMENT_COOLIFY.md** - Complete deployment guide
- **DEPLOYMENT_CHECKLIST.md** - Deployment checklist
- **.dockerignore** - Fixed Docker ignore file

## Summary

### The Two-Part Fix

1. **First Fix (COOLIFY_LOCKFILE_FIX.md):**
   - Regenerated `pnpm-lock.yaml` to sync with `package.json`
   - Committed and pushed lockfile

2. **Second Fix (This Document):**
   - Removed `pnpm-lock.yaml` from `.dockerignore`
   - Ensured lockfile is copied into Docker build

Both fixes were necessary for successful Coolify deployment!

---

**Status:** ✅ FIXED
**Date:** November 26, 2025
**Commit:** 327aa50
**Ready for Deployment:** YES

**Try deploying again in Coolify - it should work now!** 🚀
