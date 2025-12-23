# Tourism Offices Membership & License Renewal Portal

## Overview

This is a web portal for the Jordan Society of Tourism and Travel Agents (JSTA) that manages tourism office memberships and license renewals. The system serves two primary user types:

1. **Tourism Offices**: Register their offices, submit documentation, and request license renewals
2. **JSTA Admin Staff**: Review and approve office registrations, manage renewals, and oversee the entire membership process

The portal streamlines the workflow of onboarding new tourism offices, managing their documentation, and facilitating the license renewal process with the Ministry through PDF generation and document tracking.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework**: React with TypeScript using Vite as the build tool

**UI Components**: The application uses shadcn/ui components built on Radix UI primitives, providing accessible and customizable components. The design system follows Material Design principles adapted for administrative workflows, emphasizing clear information hierarchy and form design.

**Styling**: Tailwind CSS with custom design tokens defined in CSS variables, supporting both light and dark modes. The design uses a "new-york" style preset from shadcn/ui with customized spacing, border radius, and color schemes.

**State Management**: 
- TanStack Query (React Query) for server state management and caching
- React Hook Form with Zod validation for form state
- Context API for authentication state

**Routing**: Wouter (lightweight routing library) handles client-side navigation with role-based route protection.

### Backend Architecture

**Server Framework**: Express.js with TypeScript

**Authentication**: Session-based authentication using express-session with in-memory session storage (connect-pg-simple is configured but currently using in-memory store).

**Password Security**: bcryptjs for hashing user passwords

**File Upload Handling**: Multer middleware stores uploaded documents in local filesystem directories (`uploads/initial/` for registration documents, `uploads/ministry_docs/` for ministry-approved documents).

**PDF Generation**: PDFKit generates license renewal request PDFs that offices download and submit to the Ministry.

**API Design**: RESTful API endpoints organized by feature:
- `/api/auth/*` - Authentication (login, logout, session check)
- `/api/offices/*` - Office management
- `/api/renewals/*` - License renewal workflow
- `/api/documents/*` - Document retrieval and management

### Data Storage Solutions

**Database**: Configured for PostgreSQL via Drizzle ORM with NeonDB serverless driver. The schema is defined in `shared/schema.ts` with the following core entities:

- **users**: Login credentials, role (ADMIN/OFFICE), linked to office
- **offices**: Office information, status (PENDING_APPROVAL/ACTIVE/REJECTED), contact details
- **branches**: Branch office locations linked to parent office
- **documents**: File metadata, category, linked to office or renewal
- **license_renewals**: Renewal requests, status workflow, ministry document tracking

**Current Implementation**: The codebase uses `DatabaseStorage` class (in `server/storage.ts`) providing PostgreSQL persistence through Drizzle ORM with the node-postgres driver.

**File Storage**: Documents are stored on the filesystem in categorized directories rather than in the database.

### Authentication and Authorization

**Session Management**: Cookie-based sessions with server-side session storage

**Role-Based Access Control**: Two distinct roles enforce access patterns:
- **ADMIN**: Access to admin dashboard, office approval, renewal review
- **OFFICE**: Access to office dashboard, document management, renewal requests

**Route Protection**: Frontend routes are wrapped in `ProtectedRoute` components that verify authentication and role permissions before rendering.

**Password Requirements**: Enforced through Zod schemas (minimum length, confirmation matching)

### External Dependencies

**UI Component Library**: 
- @radix-ui/* primitives for accessible UI components
- shadcn/ui design system
- lucide-react for icons

**Form Management**:
- react-hook-form for form state
- @hookform/resolvers for Zod integration
- zod for validation schemas

**Database & ORM**:
- drizzle-orm for type-safe database queries
- drizzle-kit for migrations
- @neondatabase/serverless for PostgreSQL connection

**Email Service**: Currently stubbed out with console logging. The `server/email.ts` file contains email notification functions (account approval, renewal status updates) that log to console with clear TODO comments to integrate actual SMTP service (suggested: SendGrid, AWS SES, or Nodemailer).

**PDF Generation**:
- pdfkit for generating license renewal request documents

**Development Tools**:
- Vite plugins for Replit integration (@replit/vite-plugin-*)
- TypeScript for type safety across full stack
- ESBuild for production bundling

**Session Store**: connect-pg-simple package is included for PostgreSQL session storage, though current implementation may use memory store.

**File Upload**: multer middleware with local disk storage strategy

### Key Workflows

**Office Registration Flow**:
1. Office creates account (email/password)
2. Completes multi-step form: office info → branches → document uploads
3. Admin reviews submission
4. Admin approves/rejects → email notification sent
5. Approved offices can log in and access full portal

**License Renewal Flow**:
1. Office submits renewal request
2. Admin reviews and approves for download
3. Office downloads generated PDF
4. Office submits PDF to Ministry (external process)
5. Office uploads Ministry-approved document
6. Admin performs final review and approval/rejection
7. Status notifications sent at each stage

### Internationalization (i18n)

**Languages Supported**: English (en) and Arabic (ar) with full RTL support

**Implementation**: 
- Custom React Context-based i18n system (`client/src/lib/i18n.tsx`)
- Locale files: `client/src/locales/en.json` and `client/src/locales/ar.json`
- Language preference persisted in localStorage (key: `jsta_language`)
- Automatic RTL/LTR layout switching based on language selection

**Translation Coverage**:
- All pages fully translated (900+ translation keys)
- Multi-step registration form
- Admin and office dashboards
- Renewal workflow pages
- Audit logs and document management
- Form validation error messages
- Status badges and labels

**Language Switcher**: Available in header, toggles between English and Arabic with RTL layout support

**Admin Test Credentials**: 
- Email: atallaabutaha@gmail.com
- Password: Admin123

### Legacy Data Migration (December 2025)

**Data Source**: travelagent_1766501697477.sql containing 1,701 historical travel agent records

**Migration Script**: scripts/migration/import-legacy-data.cjs
- Parses multi-line SQL INSERT statements from legacy MySQL dump
- Maps 56 legacy fields to new schema structure
- Handles Arabic text, escape sequences, and null values
- City code mapping (1=Amman, 2=Irbid, 3=Zarqa, etc.)

**Imported Fields Include**:
- License categories (A, B, C, D and combinations)
- IATA membership info (number, isIata, isUftaa, isAsta, isWto)
- Tourism activities (imported, tickets, hajj_umrah, domestic, outbound)
- Banking info (bank_guarantee, bank_guarantee_end)
- Manager details (first, second, middle, last names)
- Registration and operational dates

**Database Statistics**:
- Total Offices: 1,701
- By Category: B (806), A (399), D (169), A+B+C+D (107)
- By City: Amman (1,546), Irbid (92), Zarqa (47)

**Admin Dashboard Analytics**:
- Pie chart showing license category distribution
- Bar chart showing office distribution by city
- International membership statistics (IATA, UFTAA, ASTA, WTO)

**Admin Offices Table Features**:
- Filter by license category
- Filter by city
- Filter by IATA membership status
- Search by name, registration number, or email

### Employee Data Migration (December 2025)

**Data Source**: employees_1766506496310.sql containing 13,942 employee records

**Migration Scripts**:
- `scripts/migration/import-employees.cjs` - Imports employee personal information
- `scripts/migration/import-employee-history.cjs` - Imports work history linking employees to offices

**People Table Fields Added**:
- legacy_id: Link to original employee ID from legacy system
- Name parts (Arabic): first_name, second_name, middle_name, last_name
- Name parts (English): first_name_en, second_name_en, middle_name_en, last_name_en
- full_name_ar, full_name_en: Computed full names
- jsta_id_num: JSTA membership number
- nationality, social_security_no, birth_date, gender, mother_name
- qualification, qualification_file, job_title, courses, job
- passport_number, passport_file, location_file, picture, cv

**Employee Work History Table**:
- Links employees to offices with employment periods (date_in, date_out)
- Tracks job titles and descriptions for each office assignment
- Employment documents: letter_appointment, contract_appointment, etc.

**Employee Statistics**:
- Total Employees Imported: 13,942
- By Gender: Male (ذكر): 8,992, Female (أنثى): 4,488, Unknown: 462
- Work History Records: 17,758
- Employees Linked to Offices: 13,584

**Admin Staff Dashboard Features**:
- Paginated view (50 employees per page)
- Server-side search by name, national ID, or mobile
- Filter by office
- Filter by role and nationality
- Export to CSV
- View detailed employee information in modal

### Job Titles Reference Data (December 2025)

**Data Source**: jobtitle_1766512759191.sql containing 53 standardized job titles

**Migration Script**: scripts/migration/import-job-titles.cjs
- Loads standardized Arabic job titles into the database
- Preserves legacy IDs for reference

**Job Titles Table**:
- id: Auto-generated primary key
- legacy_id: Original ID from legacy system
- name: Job title in Arabic (same as nameAr for this dataset)
- name_ar: Job title in Arabic

**Sample Job Titles**:
- شريك (Partner), مالك (Owner), رئيس مجلس الادارة (Chairman)
- مدير عام (General Manager), محاسب (Accountant), حجوزات (Reservations)
- مدير سياحة واردة (Inbound Tourism Manager), مدير فرع (Branch Manager)

**Total Job Titles Imported**: 53