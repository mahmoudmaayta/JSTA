# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Tourism Offices Membership & License Renewal Portal for the Jordan Society of Tourism and Travel Agents (JSTA). Full-stack TypeScript application managing tourism office registrations, documentation, and license renewals with bilingual support (English/Arabic with full RTL).

**Tech Stack**: React + Vite, Express.js, PostgreSQL with Drizzle ORM, session-based authentication

**User Preferences**: Simple, everyday language in communications.

## Essential Commands

### Development
```bash
npm run dev       # Start development server (runs server/index-dev.ts with tsx)
npm run build     # Build frontend (Vite) + backend (esbuild)
npm start         # Run production build from dist/
npm run check     # TypeScript type checking across full stack
```

### Database
```bash
npm run db:push   # Push schema changes to PostgreSQL using Drizzle Kit
```

**Environment Requirements**:
- `DATABASE_URL` must be set for database operations
- `NODE_ENV` set automatically by scripts (development/production)

**Test Admin Credentials**:
- Email: atallaabutaha@gmail.com
- Password: Admin123

## Architecture

### Monorepo Structure

```
client/src/
  pages/          # Route components
    admin/        # Admin-only pages (offices, renewals, audit logs)
    office/       # Office user pages (dashboard, renewals, documents)
  components/
    ui/           # shadcn/ui components (50+ components)
    layout/       # Shared layout components
  lib/
    auth.tsx      # Authentication context
    i18n.tsx      # Internationalization context
    queryClient.ts # TanStack Query configuration
  locales/
    en.json       # English translations (900+ keys)
    ar.json       # Arabic translations (900+ keys)

server/
  routes.ts       # All API endpoints (~2000 lines)
  storage.ts      # Database access layer via Drizzle ORM
  pdf.ts          # PDFKit license renewal PDF generation
  email.ts        # Email notifications (currently console logging)
  app.ts          # Express configuration and middleware
  index-dev.ts    # Development entry point
  index-prod.ts   # Production entry point

shared/
  schema.ts       # Drizzle schema + Zod validation schemas

uploads/          # File storage (not in git)
  initial/        # Registration documents
  ministry_docs/  # Ministry-approved documents
```

**TypeScript Path Aliases**:
- `@/*` → `client/src/*`
- `@shared/*` → `shared/*`
- `@assets/*` → `attached_assets/*`

### Database Schema

**Core Tables** (PostgreSQL via Drizzle ORM in `shared/schema.ts`):

- **users**: Authentication (email/passwordHash), role (ADMIN/OFFICE), officeId reference
- **offices**: Office details, status (PENDING_APPROVAL/ACTIVE/REJECTED), bilingual names, tourism activities (jsonb)
- **branches**: Branch locations linked to parent office
- **documents**: File metadata with category, links to office or renewal
- **license_renewals**: Renewal tracking with status workflow, year
- **people**: Staff records (partners, authorized persons, managers, employees)
- **role_in_offices**: People-office relationship junction table
- **consents**: User agreement records
- **audit_logs**: System activity tracking
- **renewal_attachments**: Additional renewal documents

**Key Enums**:
- `OfficeStatus`: PENDING_APPROVAL, ACTIVE, REJECTED
- `RenewalStatus`: DRAFT, SUBMITTED, UNDER_REVIEW, APPROVED_FOR_DOWNLOAD, MINISTRY_DOC_UPLOADED, FINAL_APPROVED, REJECTED
- `DocumentCategory`: INITIAL_FIRST_FORMS, INITIAL_SECOND_LEGAL, INITIAL_THIRD_PERSONAL, RENEWAL_TEMPLATE, MINISTRY_APPROVED_DOC, COMMERCIAL_REGISTRY, ID_SET, MOVE_SITE, NEW_EMPLOYEE, EXIT_EMPLOYEE, PACK_1_FINANCIAL_DOCS through PACK_5_OTHER_DOCS
- `PersonRoleType`: PARTNER, AUTHORIZED, DEDICATED_MANAGER, EMPLOYEE
- `UserRole`: ADMIN, OFFICE

### API Routes

All routes defined in `server/routes.ts`:

**Authentication** (`/api/auth/*`):
- POST `/register` - Create office account
- POST `/login` - Session login
- POST `/logout` - Destroy session
- GET `/me` - Current user + office data

**Offices** (`/api/offices/*`):
- GET `/` - List all offices (admin only)
- GET `/:id` - Office details with branches/documents
- PUT `/:id` - Update office info
- POST `/:id/approve` - Admin approval
- POST `/:id/reject` - Admin rejection
- GET `/:id/documents` - Office documents

**Renewals** (`/api/renewals/*`):
- GET `/` - List renewals (role-filtered)
- GET `/:id` - Renewal details with attachments
- POST `/` - Create renewal request
- PUT `/:id` - Update renewal
- POST `/:id/submit` - Submit for review
- POST `/:id/approve` - Approve for download
- POST `/:id/reject` - Reject renewal
- GET `/:id/download` - Generate PDF
- POST `/:id/ministry-doc` - Upload ministry document
- POST `/:id/final-approve` - Final approval

**Documents** (`/api/documents/*`):
- POST `/upload` - Upload with category
- GET `/:id` - Download file

**Admin** (`/api/admin/*`):
- GET `/audit-logs` - Activity logs

**Authentication Middleware**:
- `requireAuth`: Checks session
- `requireAdmin`: Checks ADMIN role

### Frontend Architecture

**Routing**: Wouter with `ProtectedRoute` wrapper (in `App.tsx`)

**State Management**:
- TanStack Query for server state (5min stale time)
- React Hook Form + Zod for forms
- React Context for auth and i18n

**UI System**:
- shadcn/ui components (Radix UI primitives)
- Tailwind CSS with Material Design principles
- Theme support (light/dark mode)
- Full RTL support for Arabic

**Internationalization**:
- Custom Context-based system (`lib/i18n.tsx`)
- `useLanguage()` hook provides `t(key)` function
- Language stored in localStorage (`jsta_language`)
- Automatic `dir` attribute switching (ltr/rtl)

### Critical Workflows

**Office Registration**:
1. User creates account at `/register` (email/password)
2. Multi-step form: Office Info → Branches → Documents (3 categories)
3. Status: PENDING_APPROVAL
4. Admin reviews at `/admin/offices/:id`
5. Admin approves/rejects → email notification → status change
6. ACTIVE offices can access full portal

**License Renewal**:
1. Office creates renewal → DRAFT
2. Office submits → SUBMITTED
3. Admin reviews → UNDER_REVIEW
4. Admin approves → APPROVED_FOR_DOWNLOAD
5. Office downloads PDF (generated via PDFKit)
6. Office submits to Ministry (external)
7. Office uploads ministry doc → MINISTRY_DOC_UPLOADED
8. Admin final review → FINAL_APPROVED/REJECTED
9. Email notifications at each stage

### File Handling

**Upload Configuration** (Multer):
- Initial docs: `uploads/initial/{timestamp}-{random}-{filename}`
- Ministry docs: `uploads/ministry_docs/{timestamp}-{random}-{filename}`
- Categories tracked in documents table
- Files NOT stored in database

**Document Categories** require specific uploads:
- Registration: 3 categories (forms, legal, personal)
- Renewals: Template + ministry approved
- Annual packs: 5 financial/legal/insurance/employee/other categories

## Development Patterns

### Adding API Endpoints

1. Define validation schema in `shared/schema.ts` (Zod)
2. Add route handler in `server/routes.ts` with auth middleware
3. Use `storage` class methods (avoid direct Drizzle in routes)
4. Consistent responses: `res.json(data)` or `res.status(code).json({ error })`

### Creating Pages

1. Add to `client/src/pages/admin/` or `client/src/pages/office/`
2. Register route in `App.tsx` with `ProtectedRoute`
3. Add translations to BOTH `locales/en.json` AND `locales/ar.json`
4. Use `const { t } = useLanguage()` for translations
5. Test in both languages (check RTL layout)

### Database Schema Changes

1. Modify `shared/schema.ts`
2. Run `npm run db:push`
3. Update `storage.ts` methods if needed
4. Update Zod schemas for validation

### Translation Pattern

```typescript
// In component
const { t } = useLanguage();

// In JSX
<h1>{t('admin.dashboard.title')}</h1>

// Add to both locale files
// en.json: { "admin": { "dashboard": { "title": "Dashboard" } } }
// ar.json: { "admin": { "dashboard": { "title": "لوحة التحكم" } } }
```

### Status Badge Colors

Follow design system in `design_guidelines.md`:
- PENDING_APPROVAL / SUBMITTED: Amber
- ACTIVE / APPROVED / FINAL_APPROVED: Green
- REJECTED: Red
- UNDER_REVIEW: Blue

## Important Implementation Notes

### Email Service

`server/email.ts` currently logs to console. To enable real emails:
1. Install SMTP library (nodemailer recommended)
2. Replace console.log with actual email sending
3. Configure SMTP credentials in environment
4. Functions ready: `sendAccountApprovedEmail`, `sendRenewalFinalApprovedEmail`, etc.

### Session Storage

Current: In-memory (lost on restart)

For production:
1. Uncomment `connect-pg-simple` in `server/app.ts`
2. Ensure `DATABASE_URL` is set
3. Sessions persist in `session` table

### File Storage

Current: Local filesystem

For production/scaling:
- Consider S3, Azure Blob, or Google Cloud Storage
- Update multer configuration in `server/routes.ts`
- Update download endpoints

### Security Notes

- Passwords: bcryptjs with 10 rounds
- Sessions: HTTP-only cookies
- File uploads: Restricted directories
- SQL injection: Protected by Drizzle parameterization
- Role checks: Middleware on all admin routes

## Design System

From `design_guidelines.md`:

- **Font**: Roboto, 2rem titles → 1.5rem sections → 1rem body
- **Spacing**: Tailwind scale (4, 8, 12, 16, 24, 32, 48)
- **Forms**: Labels above inputs, 48px height, clear validation
- **Cards**: 8px radius, subtle shadows
- **Tables**: Sticky headers, alternating rows, mobile stack
- **RTL**: All layouts must support bidirectional text

## Common Tasks

**Approve office registration**:
- Update offices.status to ACTIVE
- Create audit log entry
- Send approval email
- All handled in `storage.approveOffice()`

**Add document type**:
- Add to DocumentCategory enum in schema
- Update upload handler to accept category
- Add to upload forms
- Add translations for category name

**Create renewal status**:
- Add to RenewalStatus enum
- Update status badge UI
- Add translations
- Update workflow logic in routes
