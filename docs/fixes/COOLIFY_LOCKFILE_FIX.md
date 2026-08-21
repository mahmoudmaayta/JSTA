# Coolify Deployment - pnpm Lockfile Fix

> **Status: historical record.** The incident below happened in November 2025 and
> is kept for context. Two things have changed since, so read the *Prevention* and
> *Troubleshooting* sections rather than the narrative:
>
> - **There is only one lockfile now.** `package-lock.json` was deleted in
>   August 2026 because it had drifted out of sync with `package.json` and nothing
>   used it. `pnpm-lock.yaml` is the only lockfile; `package-lock.json` is
>   gitignored so it cannot come back.
> - **Deployment moved off Coolify.** The portal now runs on **Dokploy**, built
>   from the same `Dockerfile` and deployed from the **`dev`** branch with
>   auto-deploy enabled — pushing to `dev` deploys production. The lockfile
>   requirement is unchanged: the build still runs
>   `pnpm install --frozen-lockfile`.

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

## Why This Happened

**Mixed package managers.** At the time, packages were installed locally with
`npm` while deployment installed with `pnpm`, and each kept its own lockfile
(`package-lock.json` vs `pnpm-lock.yaml`). Adding a package with one manager left
the other's lockfile stale, and `--frozen-lockfile` refuses a stale lockfile.

That split no longer exists: `package-lock.json` has been removed and pnpm is the
only supported package manager for this repository.

## Prevention

**Use pnpm for anything that touches dependencies.** It is the only package
manager whose lockfile this repository keeps, and the deployment build installs
with `pnpm install --frozen-lockfile`.

```bash
# Install pnpm once (or use corepack, which the Dockerfile does)
npm install -g pnpm

pnpm install            # install dependencies
pnpm add <package>      # add a dependency — updates pnpm-lock.yaml
pnpm run dev            # run the dev server
```

Commit `package.json` and `pnpm-lock.yaml` together:

```bash
git add package.json pnpm-lock.yaml
git commit -m "Add <package>"
```

`npm run <script>` is still fine — it only runs scripts and does not touch the
lockfile. What breaks things is `npm install` / `npm ci`, which would write a
`package-lock.json` (gitignored) and leave `pnpm-lock.yaml` stale.

## How Deployment Runs Today

The portal is deployed on **Dokploy** from the **`dev`** branch with auto-deploy
enabled: pushing to `dev` deploys production, with no further action.

The build is the repository `Dockerfile`:

```
Step 1: Clone repository
Step 2: pnpm install --frozen-lockfile     <- the step this document is about
Step 3: pnpm run build
Step 4: drizzle-kit push && node dist/index.js
```

Database migrations run automatically at container start (`drizzle-kit push` in
the Dockerfile `CMD`), so there is no manual migration step after deploying.

## Troubleshooting

### If the build fails on `--frozen-lockfile`

**Check 1: is `pnpm-lock.yaml` in sync and pushed?**
```bash
pnpm install --frozen-lockfile --lockfile-only   # succeeds if in sync
git status --short pnpm-lock.yaml                # should be clean
```

**Check 2: did someone run `npm install`?**
```bash
git status --short          # package-lock.json is gitignored, so look for it untracked
ls package-lock.json 2>/dev/null && echo "delete this and run: pnpm install"
```

**Check 3: force a rebuild**
Redeploy with the build cache cleared, so a stale `node_modules` layer is not
reused.

**Check 4: is the right branch deploying?**
Auto-deploy tracks **`dev`**, not `main`. A change committed only to `main` will
not deploy.

### If You See "specifiers don't match" Again

`package.json` changed without `pnpm-lock.yaml` being regenerated:
```bash
pnpm install
git add package.json pnpm-lock.yaml
git commit -m "Update lockfile"
git push
```

## Related Files

- **Dockerfile** - Production Docker build (installs with pnpm, migrates on start)
- **.dockerignore** - Build context exclusions; also blocks `package-lock.json`
  from reaching the image if one is ever regenerated locally
- **docs/guides/DEPLOYMENT_COOLIFY.md**, **docs/guides/DEPLOYMENT_CHECKLIST.md** -
  written for Coolify and not yet updated for Dokploy; treat their
  platform-specific steps with care

## Summary

- **Original issue (Nov 2025):** `pnpm-lock.yaml` out of sync with `package.json`,
  caused by installing packages with npm while deploying with pnpm.
- **Fix at the time:** regenerated the lockfile with `pnpm install`.
- **Fixed for good (Aug 2026):** `package-lock.json` deleted and gitignored, so
  the two lockfiles can no longer diverge. pnpm is the only package manager.

---

**Date Fixed:** November 26, 2025
**Commit:** 59f34f1 - "Add Coolify deployment configuration and fix pnpm lockfile"

**Updated:** August 22, 2026 - npm lockfile removed; deployment now on Dokploy
(branch `dev`, auto-deploy)
