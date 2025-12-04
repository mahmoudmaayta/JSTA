-- Performance Indexes for Tourism Portal Database
-- Created: 2025-12-03
-- Purpose: Improve query performance for frequently accessed columns

-- ====================
-- USERS TABLE INDEXES
-- ====================

-- Email lookup (login, registration checks)
CREATE INDEX IF NOT EXISTS idx_users_email ON users(LOWER(email));

-- Office association lookup
CREATE INDEX IF NOT EXISTS idx_users_office_id ON users(office_id) WHERE office_id IS NOT NULL;

-- Role-based queries
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- ====================
-- OFFICES TABLE INDEXES
-- ====================

-- Status filtering (admin dashboard)
CREATE INDEX IF NOT EXISTS idx_offices_status ON offices(status);

-- Status + creation time (ordered listings)
CREATE INDEX IF NOT EXISTS idx_offices_status_created ON offices(status, created_at DESC);

-- Email lookup
CREATE INDEX IF NOT EXISTS idx_offices_main_email ON offices(LOWER(main_email)) WHERE main_email IS NOT NULL;

-- National entity number (unique identifier queries)
CREATE INDEX IF NOT EXISTS idx_offices_national_entity ON offices(national_entity_no) WHERE national_entity_no IS NOT NULL;

-- ====================
-- BRANCHES TABLE INDEXES
-- ====================

-- Office association (fetch all branches for an office)
CREATE INDEX IF NOT EXISTS idx_branches_office_id ON branches(office_id);

-- ====================
-- DOCUMENTS TABLE INDEXES
-- ====================

-- Office association
CREATE INDEX IF NOT EXISTS idx_documents_office_id ON documents(office_id);

-- Renewal association
CREATE INDEX IF NOT EXISTS idx_documents_renewal_id ON documents(renewal_id) WHERE renewal_id IS NOT NULL;

-- Category filtering
CREATE INDEX IF NOT EXISTS idx_documents_category ON documents(category);

-- Upload time ordering
CREATE INDEX IF NOT EXISTS idx_documents_uploaded_at ON documents(uploaded_at DESC);

-- Composite index for office + category queries
CREATE INDEX IF NOT EXISTS idx_documents_office_category ON documents(office_id, category);

-- ====================
-- LICENSE RENEWALS TABLE INDEXES
-- ====================

-- Office association (most common query)
CREATE INDEX IF NOT EXISTS idx_renewals_office_id ON license_renewals(office_id);

-- Status filtering (admin dashboard, pending renewals)
CREATE INDEX IF NOT EXISTS idx_renewals_status ON license_renewals(status);

-- Year filtering (annual reports)
CREATE INDEX IF NOT EXISTS idx_renewals_year ON license_renewals(year);

-- Composite: office + year (check for existing renewal)
CREATE INDEX IF NOT EXISTS idx_renewals_office_year ON license_renewals(office_id, year);

-- Composite: status + year (admin analytics)
CREATE INDEX IF NOT EXISTS idx_renewals_status_year ON license_renewals(status, year);

-- Creation time ordering
CREATE INDEX IF NOT EXISTS idx_renewals_created_at ON license_renewals(created_at DESC);

-- Form completion tracking
CREATE INDEX IF NOT EXISTS idx_renewals_form_completion ON license_renewals(office_form_completed, staff_form_completed, commitment_form_completed);

-- ====================
-- PEOPLE TABLE INDEXES
-- ====================

-- Office association (most common query)
CREATE INDEX IF NOT EXISTS idx_people_office_id ON people(office_id);

-- Renewal association
CREATE INDEX IF NOT EXISTS idx_people_renewal_id ON people(renewal_id) WHERE renewal_id IS NOT NULL;

-- National ID lookup (unique person identification, duplicate checks)
CREATE INDEX IF NOT EXISTS idx_people_national_id ON people(office_id, national_id) WHERE national_id IS NOT NULL;

-- Name search (Arabic)
CREATE INDEX IF NOT EXISTS idx_people_name_ar ON people(full_name_ar);

-- Creation time ordering
CREATE INDEX IF NOT EXISTS idx_people_created_at ON people(created_at DESC);

-- ====================
-- ROLES IN OFFICE TABLE INDEXES
-- ====================

-- Office association
CREATE INDEX IF NOT EXISTS idx_roles_office_id ON roles_in_office(office_id);

-- Person association (get roles for a person)
CREATE INDEX IF NOT EXISTS idx_roles_person_id ON roles_in_office(person_id);

-- Renewal association
CREATE INDEX IF NOT EXISTS idx_roles_renewal_id ON roles_in_office(renewal_id) WHERE renewal_id IS NOT NULL;

-- Role type filtering
CREATE INDEX IF NOT EXISTS idx_roles_type ON roles_in_office(role_type);

-- Composite: office + role type (find all partners, managers, etc.)
CREATE INDEX IF NOT EXISTS idx_roles_office_type ON roles_in_office(office_id, role_type);

-- ====================
-- CONSENTS TABLE INDEXES
-- ====================

-- Office association
CREATE INDEX IF NOT EXISTS idx_consents_office_id ON consents(office_id);

-- Renewal association
CREATE INDEX IF NOT EXISTS idx_consents_renewal_id ON consents(renewal_id) WHERE renewal_id IS NOT NULL;

-- Consent type filtering
CREATE INDEX IF NOT EXISTS idx_consents_type ON consents(consent_type);

-- Time ordering
CREATE INDEX IF NOT EXISTS idx_consents_accepted_at ON consents(accepted_at DESC);

-- ====================
-- RENEWAL ATTACHMENTS TABLE INDEXES
-- ====================

-- Renewal association (most common query)
CREATE INDEX IF NOT EXISTS idx_attachments_renewal_id ON renewal_attachments(renewal_id);

-- Office association
CREATE INDEX IF NOT EXISTS idx_attachments_office_id ON renewal_attachments(office_id);

-- Category filtering
CREATE INDEX IF NOT EXISTS idx_attachments_category ON renewal_attachments(category);

-- Composite: renewal + category (check required documents)
CREATE INDEX IF NOT EXISTS idx_attachments_renewal_category ON renewal_attachments(renewal_id, category);

-- Upload time ordering
CREATE INDEX IF NOT EXISTS idx_attachments_created_at ON renewal_attachments(created_at DESC);

-- ====================
-- COMPLAINTS TABLE INDEXES
-- ====================

-- Office association
CREATE INDEX IF NOT EXISTS idx_complaints_office_id ON complaints(office_id);

-- Renewal association
CREATE INDEX IF NOT EXISTS idx_complaints_renewal_id ON complaints(renewal_id) WHERE renewal_id IS NOT NULL;

-- Commitment form association
CREATE INDEX IF NOT EXISTS idx_complaints_commitment_id ON complaints(commitment_id) WHERE commitment_id IS NOT NULL;

-- Authority filtering
CREATE INDEX IF NOT EXISTS idx_complaints_authority ON complaints(authority);

-- Creation time ordering
CREATE INDEX IF NOT EXISTS idx_complaints_created_at ON complaints(created_at DESC);

-- ====================
-- COMMITMENT FORMS TABLE INDEXES
-- ====================

-- Office association
CREATE INDEX IF NOT EXISTS idx_commitment_office_id ON commitment_forms(office_id);

-- Renewal association
CREATE INDEX IF NOT EXISTS idx_commitment_renewal_id ON commitment_forms(renewal_id) WHERE renewal_id IS NOT NULL;

-- Has complaints flag (quick filtering)
CREATE INDEX IF NOT EXISTS idx_commitment_has_complaints ON commitment_forms(has_complaints);

-- Submission time ordering
CREATE INDEX IF NOT EXISTS idx_commitment_submitted_at ON commitment_forms(submitted_at DESC);

-- ====================
-- OFFICE INFO FORMS TABLE INDEXES
-- ====================

-- Office association
CREATE INDEX IF NOT EXISTS idx_office_info_office_id ON office_info_forms(office_id);

-- Renewal association
CREATE INDEX IF NOT EXISTS idx_office_info_renewal_id ON office_info_forms(renewal_id) WHERE renewal_id IS NOT NULL;

-- Submission time ordering
CREATE INDEX IF NOT EXISTS idx_office_info_submitted_at ON office_info_forms(submitted_at DESC);

-- ====================
-- AUDIT LOGS TABLE INDEXES
-- ====================

-- User ID (track user actions)
CREATE INDEX IF NOT EXISTS idx_audit_user_id ON audit_logs(user_id);

-- Action type (filter by action)
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action);

-- Target type and ID (find logs for specific entities)
CREATE INDEX IF NOT EXISTS idx_audit_target ON audit_logs(target_type, target_id);

-- Time ordering (most recent first)
CREATE INDEX IF NOT EXISTS idx_audit_created_at ON audit_logs(created_at DESC);

-- Composite: action + time (analytics)
CREATE INDEX IF NOT EXISTS idx_audit_action_time ON audit_logs(action, created_at DESC);

-- ===================================
-- ANALYZE TABLES FOR QUERY OPTIMIZATION
-- ===================================

ANALYZE users;
ANALYZE offices;
ANALYZE branches;
ANALYZE documents;
ANALYZE license_renewals;
ANALYZE people;
ANALYZE roles_in_office;
ANALYZE consents;
ANALYZE renewal_attachments;
ANALYZE complaints;
ANALYZE commitment_forms;
ANALYZE office_info_forms;
ANALYZE audit_logs;
