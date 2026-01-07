# Tourism Offices Membership & License Renewal Portal

## Overview

This web portal for the Jordan Society of Tourism and Travel Agents (JSTA) manages tourism office memberships and license renewals. It serves tourism offices for registration, documentation, and license renewals, and JSTA admin staff for reviewing and approving these processes. The portal aims to streamline the onboarding of new offices, manage their documentation, and facilitate license renewals with the Ministry through PDF generation and document tracking.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework**: React with TypeScript (Vite).
- **UI**: shadcn/ui (Radix UI primitives) following Material Design principles.
- **Styling**: Tailwind CSS with custom design tokens, supporting light/dark modes.
- **State Management**: TanStack Query (server state), React Hook Form with Zod (form state), React Context (authentication).
- **Routing**: Wouter for client-side navigation and role-based protection.
- **Internationalization**: Custom React Context-based i18n for English (en) and Arabic (ar) with full RTL support.

### Backend
- **Server**: Express.js with TypeScript.
- **Authentication**: Session-based using `express-session`, `bcryptjs` for password hashing.
- **File Uploads**: `multer` middleware with multi-environment storage:
    - **Production**: S3-compatible storage (e.g., Railway's S3).
    - **Development (Replit)**: Replit-managed GCS bucket.
    - **Fallback**: Local filesystem.
- **PDF Generation**: PDFKit for creating license renewal request documents.
- **API Design**: RESTful endpoints (`/api/auth`, `/api/offices`, `/api/renewals`, `/api/documents`).

### Data Storage
- **Database**: PostgreSQL via Drizzle ORM with node-postgres driver.
    - **Core Entities**: `users`, `offices`, `branches`, `documents`, `license_renewals`, `cities`.
    - **Degraded Mode**: App can start with in-memory session storage if database is unavailable.
- **File Storage**: Documents stored on cloud storage (S3/GCS) or local filesystem.

### Authentication and Authorization
- **Session Management**: Cookie-based sessions with server-side storage.
- **Role-Based Access Control**: `ADMIN` and `OFFICE` roles.
- **Route Protection**: Frontend `ProtectedRoute` components verify authentication and role permissions.

### Key Workflows
- **Office Registration**: Multi-step form submission, admin review/approval, email notifications.
- **License Renewal**: Office request, admin approval, PDF generation, external Ministry submission, Ministry document upload, final admin review/approval.

## External Dependencies

- **UI Components**: `@radix-ui/*`, `shadcn/ui`, `lucide-react`.
- **Form Management**: `react-hook-form`, `@hookform/resolvers`, `zod`.
- **Database & ORM**: `drizzle-orm`, `drizzle-kit`, `@neondatabase/serverless`.
- **Email Service**: Currently stubbed out with console logging, designed for integration with services like SendGrid, AWS SES, or Nodemailer.
- **PDF Generation**: `pdfkit`.
- **File Storage**: `@aws-sdk/client-s3`, `@google-cloud/storage`, `multer`.
- **Session Store**: `connect-pg-simple` (configured for PostgreSQL).