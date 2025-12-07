import { pgTable, text, varchar, timestamp, integer, jsonb, date, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const OfficeStatus = {
  PENDING_APPROVAL: 'PENDING_APPROVAL',
  ACTIVE: 'ACTIVE',
  REJECTED: 'REJECTED'
} as const;

export const RenewalStatus = {
  DRAFT: 'DRAFT',
  SUBMITTED: 'SUBMITTED',
  UNDER_REVIEW: 'UNDER_REVIEW',
  APPROVED_FOR_DOWNLOAD: 'APPROVED_FOR_DOWNLOAD',
  MINISTRY_DOC_UPLOADED: 'MINISTRY_DOC_UPLOADED',
  FINAL_APPROVED: 'FINAL_APPROVED',
  REJECTED: 'REJECTED'
} as const;

export const DocumentCategory = {
  INITIAL_FIRST_FORMS: 'INITIAL_FIRST_FORMS',
  INITIAL_SECOND_LEGAL: 'INITIAL_SECOND_LEGAL',
  INITIAL_THIRD_PERSONAL: 'INITIAL_THIRD_PERSONAL',
  RENEWAL_TEMPLATE: 'RENEWAL_TEMPLATE',
  MINISTRY_APPROVED_DOC: 'MINISTRY_APPROVED_DOC',
  COMMERCIAL_REGISTRY: 'COMMERCIAL_REGISTRY',
  ID_SET: 'ID_SET',
  MOVE_SITE: 'MOVE_SITE',
  NEW_EMPLOYEE: 'NEW_EMPLOYEE',
  EXIT_EMPLOYEE: 'EXIT_EMPLOYEE',
  PACK_1_FINANCIAL_DOCS: 'PACK_1_FINANCIAL_DOCS',
  PACK_2_LEGAL_DOCS: 'PACK_2_LEGAL_DOCS',
  PACK_3_INSURANCE_DOCS: 'PACK_3_INSURANCE_DOCS',
  PACK_4_EMPLOYEE_DOCS: 'PACK_4_EMPLOYEE_DOCS',
  PACK_5_OTHER_DOCS: 'PACK_5_OTHER_DOCS',
  PAYMENT_PROOF: 'PAYMENT_PROOF'
} as const;

export const PersonRoleType = {
  PARTNER: 'PARTNER',
  AUTHORIZED: 'AUTHORIZED',
  DEDICATED_MANAGER: 'DEDICATED_MANAGER',
  EMPLOYEE: 'EMPLOYEE'
} as const;

export const ConsentType = {
  DATA_ACCURACY: 'DATA_ACCURACY',
  COMPLAINT_COMMITMENT: 'COMPLAINT_COMMITMENT'
} as const;

export const UserRole = {
  ADMIN: 'ADMIN',
  OFFICE: 'OFFICE'
} as const;

export const PaymentStatus = {
  PENDING: 'PENDING',
  UPLOADED: 'UPLOADED',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED'
} as const;

export const DiscountType = {
  PERCENT: 'PERCENT',
  FIXED: 'FIXED',
  FREE: 'FREE'
} as const;

// ============================================
// NEW MODULE ENUMS - Member Services
// ============================================

export const MembershipCardStatus = {
  PENDING: 'PENDING',
  ACTIVE: 'ACTIVE',
  SUSPENDED: 'SUSPENDED',
  EXPIRED: 'EXPIRED',
  REVOKED: 'REVOKED'
} as const;

export const InspectionStatus = {
  SCHEDULED: 'SCHEDULED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED'
} as const;

export const InspectionType = {
  INITIAL: 'INITIAL',
  ROUTINE: 'ROUTINE',
  FOLLOW_UP: 'FOLLOW_UP',
  COMPLAINT_BASED: 'COMPLAINT_BASED'
} as const;

export const InspectionOutcome = {
  COMPLIANT: 'COMPLIANT',
  NON_COMPLIANT: 'NON_COMPLIANT',
  PARTIALLY_COMPLIANT: 'PARTIALLY_COMPLIANT',
  PENDING_REVIEW: 'PENDING_REVIEW'
} as const;

export const AdvocacyCaseStatus = {
  OPEN: 'OPEN',
  IN_PROGRESS: 'IN_PROGRESS',
  RESOLVED: 'RESOLVED',
  CLOSED: 'CLOSED'
} as const;

export const AdvocacyCaseType = {
  DISPUTE: 'DISPUTE',
  REGULATORY: 'REGULATORY',
  MINISTRY: 'MINISTRY',
  LEGAL: 'LEGAL',
  OTHER: 'OTHER'
} as const;

export const AdvocacyPriority = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  URGENT: 'URGENT'
} as const;

export const OversightLicenseStatus = {
  LICENSED: 'LICENSED',
  UNLICENSED: 'UNLICENSED',
  SUSPENDED: 'SUSPENDED',
  UNKNOWN: 'UNKNOWN'
} as const;

export const OversightStatus = {
  NEW: 'NEW',
  UNDER_INVESTIGATION: 'UNDER_INVESTIGATION',
  ACTION_REQUIRED: 'ACTION_REQUIRED',
  RESOLVED: 'RESOLVED'
} as const;

export const OversightSource = {
  MINISTRY: 'MINISTRY',
  CITIZEN: 'CITIZEN',
  INTERNAL: 'INTERNAL',
  COMPLAINT: 'COMPLAINT',
  INSPECTION: 'INSPECTION'
} as const;

export const StaffCertificationStatus = {
  SUBMITTED: 'SUBMITTED',
  UNDER_REVIEW: 'UNDER_REVIEW',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED'
} as const;

export const StaffCertificationRole = {
  GUIDE: 'GUIDE',
  OPERATIONS: 'OPERATIONS',
  SALES: 'SALES',
  MANAGER: 'MANAGER',
  OTHER: 'OTHER'
} as const;

export const ComplianceCheckStatus = {
  OPEN: 'OPEN',
  IN_PROGRESS: 'IN_PROGRESS',
  CLOSED: 'CLOSED'
} as const;

export const ComplianceCheckType = {
  LICENSE: 'LICENSE',
  INSURANCE: 'INSURANCE',
  EMPLOYEE_STATUS: 'EMPLOYEE_STATUS',
  FINANCIAL: 'FINANCIAL',
  SAFETY: 'SAFETY',
  OTHER: 'OTHER'
} as const;

export const ComplianceSeverity = {
  INFO: 'INFO',
  WARNING: 'WARNING',
  CRITICAL: 'CRITICAL'
} as const;

export const OfficeComplianceStatus = {
  COMPLIANT: 'COMPLIANT',
  WARNING: 'WARNING',
  NON_COMPLIANT: 'NON_COMPLIANT'
} as const;

export const OfficeCategory = {
  A: 'A',
  B: 'B',
  C: 'C'
} as const;

export const EnhancedComplaintStatus = {
  RECEIVED: 'RECEIVED',
  INVESTIGATING: 'INVESTIGATING',
  RESOLVED: 'RESOLVED',
  ESCALATED: 'ESCALATED',
  CLOSED: 'CLOSED'
} as const;

export const ComplainantType = {
  CUSTOMER: 'CUSTOMER',
  OFFICE: 'OFFICE',
  EMPLOYEE: 'EMPLOYEE',
  AUTHORITY: 'AUTHORITY',
  INTERNAL: 'INTERNAL'
} as const;

export const EnhancedComplaintType = {
  SERVICE: 'SERVICE',
  FINANCIAL: 'FINANCIAL',
  SAFETY: 'SAFETY',
  LEGAL: 'LEGAL',
  OTHER: 'OTHER'
} as const;

export type MembershipCardStatusType = typeof MembershipCardStatus[keyof typeof MembershipCardStatus];
export type InspectionStatusType = typeof InspectionStatus[keyof typeof InspectionStatus];
export type InspectionTypeType = typeof InspectionType[keyof typeof InspectionType];
export type InspectionOutcomeType = typeof InspectionOutcome[keyof typeof InspectionOutcome];
export type AdvocacyCaseStatusType = typeof AdvocacyCaseStatus[keyof typeof AdvocacyCaseStatus];
export type AdvocacyCaseTypeType = typeof AdvocacyCaseType[keyof typeof AdvocacyCaseType];
export type AdvocacyPriorityType = typeof AdvocacyPriority[keyof typeof AdvocacyPriority];
export type OversightLicenseStatusType = typeof OversightLicenseStatus[keyof typeof OversightLicenseStatus];
export type OversightStatusType = typeof OversightStatus[keyof typeof OversightStatus];
export type OversightSourceType = typeof OversightSource[keyof typeof OversightSource];
export type StaffCertificationStatusType = typeof StaffCertificationStatus[keyof typeof StaffCertificationStatus];
export type StaffCertificationRoleType = typeof StaffCertificationRole[keyof typeof StaffCertificationRole];
export type ComplianceCheckStatusType = typeof ComplianceCheckStatus[keyof typeof ComplianceCheckStatus];
export type ComplianceCheckTypeType = typeof ComplianceCheckType[keyof typeof ComplianceCheckType];
export type ComplianceSeverityType = typeof ComplianceSeverity[keyof typeof ComplianceSeverity];
export type OfficeComplianceStatusType = typeof OfficeComplianceStatus[keyof typeof OfficeComplianceStatus];
export type OfficeCategoryType = typeof OfficeCategory[keyof typeof OfficeCategory];
export type EnhancedComplaintStatusType = typeof EnhancedComplaintStatus[keyof typeof EnhancedComplaintStatus];
export type ComplainantTypeType = typeof ComplainantType[keyof typeof ComplainantType];
export type EnhancedComplaintTypeType = typeof EnhancedComplaintType[keyof typeof EnhancedComplaintType];

export type OfficeStatusType = typeof OfficeStatus[keyof typeof OfficeStatus];
export type RenewalStatusType = typeof RenewalStatus[keyof typeof RenewalStatus];
export type DocumentCategoryType = typeof DocumentCategory[keyof typeof DocumentCategory];
export type PersonRoleTypeType = typeof PersonRoleType[keyof typeof PersonRoleType];
export type ConsentTypeType = typeof ConsentType[keyof typeof ConsentType];
export type UserRoleType = typeof UserRole[keyof typeof UserRole];
export type PaymentStatusType = typeof PaymentStatus[keyof typeof PaymentStatus];
export type DiscountTypeType = typeof DiscountType[keyof typeof DiscountType];

export const users = pgTable("users", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull().$type<UserRoleType>(),
  officeId: integer("office_id"),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

export const offices = pgTable("offices", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  tradeNameAr: text("trade_name_ar").notNull(),
  tradeNameEn: text("trade_name_en"),
  legalNameAr: text("legal_name_ar"),
  legalNameRegistrar: text("legal_name_registrar"),
  nationalEntityNo: text("national_entity_no"),
  nationalEstablishmentNumber: text("national_establishment_number"),
  trademark: text("trademark"),
  awqafApprovalNo: text("awqaf_approval_no"),
  socialSecurityNumber: text("social_security_number"),
  guaranteeExpiryDate: text("guarantee_expiry_date"),
  tourismActivities: jsonb("tourism_activities").$type<string[]>(),
  mainCity: text("main_city"),
  mainArea: text("main_area"),
  mainStreet: text("main_street"),
  mainBuildingNumber: text("main_building_number"),
  phone: text("phone"),
  mobile: text("mobile"),
  fax: text("fax"),
  website: text("website"),
  mainEmail: text("main_email"),
  extraEmail: text("extra_email"),
  poBox: text("po_box"),
  postalCode: text("postal_code"),
  status: text("status").notNull().$type<OfficeStatusType>().default('PENDING_APPROVAL'),
  adminComment: text("admin_comment"),
  officeCategory: text("office_category").$type<OfficeCategoryType>(),
  complianceStatus: text("compliance_status").$type<OfficeComplianceStatusType>().default('COMPLIANT'),
  lastComplianceReviewAt: timestamp("last_compliance_review_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

export const branches = pgTable("branches", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  officeId: integer("office_id").notNull(),
  city: text("city"),
  area: text("area"),
  street: text("street"),
  buildingNumber: text("building_number"),
  managerName: text("manager_name"),
  managerMobile: text("manager_mobile"),
  phone: text("phone"),
  fax: text("fax")
});

export const documents = pgTable("documents", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  officeId: integer("office_id").notNull(),
  renewalId: integer("renewal_id"),
  category: text("category").notNull().$type<DocumentCategoryType>(),
  filePath: text("file_path").notNull(),
  originalFilename: text("original_filename").notNull(),
  uploadedByUserId: integer("uploaded_by_user_id"),
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull()
});

export const licenseRenewals = pgTable("license_renewals", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  officeId: integer("office_id").notNull(),
  year: integer("year").notNull(),
  status: text("status").notNull().$type<RenewalStatusType>().default('SUBMITTED'),
  ministryDocumentPath: text("ministry_document_path"),
  officialLicenseUrl: text("official_license_url"),
  expiryDate: text("expiry_date"),
  adminComment: text("admin_comment"),
  reviewerNotes: text("reviewer_notes"),
  officeFormCompleted: boolean("office_form_completed").default(false),
  staffFormCompleted: boolean("staff_form_completed").default(false),
  commitmentFormCompleted: boolean("commitment_form_completed").default(false),
  submittedAt: timestamp("submitted_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

export const people = pgTable("people", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  officeId: integer("office_id").notNull(),
  renewalId: integer("renewal_id"),
  fullNameAr: text("full_name_ar").notNull(),
  fullNameEn: text("full_name_en"),
  nationalId: text("national_id"),
  socialSecurityNo: text("social_security_no"),
  nationality: text("nationality"),
  gender: text("gender"),
  motherName: text("mother_name"),
  mobile: text("mobile"),
  birthDate: text("birth_date"),
  currentPosition: text("current_position"),
  startDate: text("start_date"),
  branch: text("branch"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

export const rolesInOffice = pgTable("roles_in_office", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  officeId: integer("office_id").notNull(),
  personId: integer("person_id").notNull(),
  renewalId: integer("renewal_id"),
  roleType: text("role_type").notNull().$type<PersonRoleTypeType>(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

export const consents = pgTable("consents", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  officeId: integer("office_id").notNull(),
  renewalId: integer("renewal_id"),
  userId: integer("user_id"),
  consentType: text("consent_type").notNull().$type<ConsentTypeType>(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  payload: jsonb("payload").$type<Record<string, any>>(),
  acceptedAt: timestamp("accepted_at").defaultNow().notNull()
});

export const renewalAttachments = pgTable("renewal_attachments", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  officeId: integer("office_id").notNull(),
  renewalId: integer("renewal_id"),
  category: text("category").notNull().$type<DocumentCategoryType>(),
  fileUrl: text("file_url").notNull(),
  fileName: text("file_name").notNull(),
  mimeType: text("mime_type"),
  fileSize: integer("file_size"),
  meta: jsonb("meta").$type<Record<string, any>>(),
  uploadedByUserId: integer("uploaded_by_user_id"),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

export const ComplaintAuthority = {
  ASSOCIATION: 'الجمعية',
  MINISTRY: 'الوزارة',
  OTHER: 'أخرى'
} as const;

export type ComplaintAuthorityType = typeof ComplaintAuthority[keyof typeof ComplaintAuthority];

export const complaints = pgTable("complaints", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  officeId: integer("office_id").notNull(),
  renewalId: integer("renewal_id"),
  commitmentId: integer("commitment_id"),
  complaintNumber: text("complaint_number").notNull(),
  authority: text("authority").notNull().$type<ComplaintAuthorityType>(),
  notifiedAt: text("notified_at").notNull(),
  summary: text("summary"),
  proposedAction: text("proposed_action"),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

export const officeInfoForms = pgTable("office_info_forms", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  officeId: integer("office_id").notNull(),
  renewalId: integer("renewal_id"),
  establishmentNameCommercialReg: text("establishment_name_commercial_reg").notNull(),
  tradeNameAr: text("trade_name_ar").notNull(),
  tradeNameEn: text("trade_name_en"),
  nationalEstablishmentNumber: text("national_establishment_number").notNull(),
  trademark: text("trademark"),
  awqafAccreditationNumber: text("awqaf_accreditation_number"),
  socialSecurityNumber: text("social_security_number"),
  guaranteeExpiryDate: text("guarantee_expiry_date"),
  consentAccepted: boolean("consent_accepted").default(false),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  submittedAt: timestamp("submitted_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

export const commitmentForms = pgTable("commitment_forms", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  officeId: integer("office_id").notNull(),
  renewalId: integer("renewal_id"),
  officeName: text("office_name").notNull(),
  licenseNo: text("license_no").notNull(),
  contactName: text("contact_name").notNull(),
  contactEmail: text("contact_email").notNull(),
  contactMobile: text("contact_mobile").notNull(),
  hasComplaints: boolean("has_complaints").default(false),
  consentAccepted: boolean("consent_accepted").default(false),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  submittedAt: timestamp("submitted_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

export const AuditAction = {
  OFFICE_APPROVED: 'OFFICE_APPROVED',
  OFFICE_REJECTED: 'OFFICE_REJECTED',
  RENEWAL_APPROVED_FOR_DOWNLOAD: 'RENEWAL_APPROVED_FOR_DOWNLOAD',
  RENEWAL_FINAL_APPROVED: 'RENEWAL_FINAL_APPROVED',
  RENEWAL_REJECTED: 'RENEWAL_REJECTED',
  RENEWAL_SUBMITTED: 'RENEWAL_SUBMITTED',
  STAFF_FORM_SAVED: 'STAFF_FORM_SAVED',
  PERSON_UPSERTED: 'PERSON_UPSERTED',
  PERSON_DELETED: 'PERSON_DELETED',
  ROLE_ASSIGNED: 'ROLE_ASSIGNED',
  COMMITMENT_FORM_SUBMITTED: 'COMMITMENT_FORM_SUBMITTED',
  OFFICE_INFO_FORM_SUBMITTED: 'OFFICE_INFO_FORM_SUBMITTED',
  LOGIN_FAILED: 'LOGIN_FAILED',
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  PASSWORD_CHANGED: 'PASSWORD_CHANGED',
  PAYMENT_PROOF_UPLOADED: 'PAYMENT_PROOF_UPLOADED',
  PAYMENT_APPROVED: 'PAYMENT_APPROVED',
  PAYMENT_REJECTED: 'PAYMENT_REJECTED',
  // Membership Cards
  MEMBERSHIP_CARD_ISSUED: 'MEMBERSHIP_CARD_ISSUED',
  MEMBERSHIP_CARD_SUSPENDED: 'MEMBERSHIP_CARD_SUSPENDED',
  MEMBERSHIP_CARD_REVOKED: 'MEMBERSHIP_CARD_REVOKED',
  MEMBERSHIP_CARD_RENEWED: 'MEMBERSHIP_CARD_RENEWED',
  // Inspections
  INSPECTION_SCHEDULED: 'INSPECTION_SCHEDULED',
  INSPECTION_COMPLETED: 'INSPECTION_COMPLETED',
  INSPECTION_CANCELLED: 'INSPECTION_CANCELLED',
  // Advocacy
  ADVOCACY_CASE_OPENED: 'ADVOCACY_CASE_OPENED',
  ADVOCACY_CASE_UPDATED: 'ADVOCACY_CASE_UPDATED',
  ADVOCACY_CASE_RESOLVED: 'ADVOCACY_CASE_RESOLVED',
  ADVOCACY_CASE_CLOSED: 'ADVOCACY_CASE_CLOSED',
  // Oversight
  OVERSIGHT_TARGET_CREATED: 'OVERSIGHT_TARGET_CREATED',
  OVERSIGHT_TARGET_UPDATED: 'OVERSIGHT_TARGET_UPDATED',
  OVERSIGHT_VISIT_LOGGED: 'OVERSIGHT_VISIT_LOGGED',
  // Staff Certifications
  STAFF_CERT_SUBMITTED: 'STAFF_CERT_SUBMITTED',
  STAFF_CERT_APPROVED: 'STAFF_CERT_APPROVED',
  STAFF_CERT_REJECTED: 'STAFF_CERT_REJECTED',
  // Compliance
  COMPLIANCE_CHECK_CREATED: 'COMPLIANCE_CHECK_CREATED',
  COMPLIANCE_CHECK_UPDATED: 'COMPLIANCE_CHECK_UPDATED',
  COMPLIANCE_CHECK_CLOSED: 'COMPLIANCE_CHECK_CLOSED',
  // Enhanced Complaints
  COMPLAINT_CREATED: 'COMPLAINT_CREATED',
  COMPLAINT_UPDATED: 'COMPLAINT_UPDATED',
  COMPLAINT_RESOLVED: 'COMPLAINT_RESOLVED',
  COMPLAINT_ESCALATED: 'COMPLAINT_ESCALATED',
} as const;

export type AuditActionType = typeof AuditAction[keyof typeof AuditAction];

export const auditLogs = pgTable("audit_logs", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: integer("user_id").notNull(),
  action: text("action").notNull().$type<AuditActionType>(),
  targetType: text("target_type").notNull(),
  targetId: integer("target_id").notNull(),
  details: jsonb("details").$type<Record<string, any>>(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

// Session table (managed by connect-pg-simple, included here to prevent Drizzle from trying to drop it)
export const session = pgTable("session", {
  sid: varchar("sid").primaryKey(),
  sess: jsonb("sess").notNull(),
  expire: timestamp("expire").notNull()
});

export const promoCodes = pgTable("promo_codes", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  code: text("code").notNull().unique(),
  discountType: text("discount_type").notNull().$type<DiscountTypeType>(),
  discountValue: integer("discount_value").notNull(),
  maxUses: integer("max_uses"),
  currentUses: integer("current_uses").default(0).notNull(),
  validFrom: timestamp("valid_from"),
  validUntil: timestamp("valid_until"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

export const payments = pgTable("payments", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  officeId: integer("office_id").notNull(),
  renewalId: integer("renewal_id"),
  amount: integer("amount").notNull(),
  promoCodeId: integer("promo_code_id"),
  discountAmount: integer("discount_amount").default(0),
  finalAmount: integer("final_amount"),
  status: text("status").notNull().$type<PaymentStatusType>().default('PENDING'),
  proofFileUrl: text("proof_file_url"),
  proofFileName: text("proof_file_name"),
  rejectionReason: text("rejection_reason"),
  approvedByUserId: integer("approved_by_user_id"),
  approvedAt: timestamp("approved_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

// ============================================
// NEW MODULE TABLES - Member Services
// ============================================

// 1. Membership Cards - إصدار بطاقات العضوية
export const membershipCards = pgTable("membership_cards", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  officeId: integer("office_id").notNull(),
  cardNumber: text("card_number").notNull().unique(),
  status: text("status").notNull().$type<MembershipCardStatusType>().default('PENDING'),
  issuedAt: timestamp("issued_at"),
  expiresAt: timestamp("expires_at"),
  issuedByUserId: integer("issued_by_user_id"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

// 2. Inspections - الكشف الحسي على المكاتب
export const inspections = pgTable("inspections", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  officeId: integer("office_id").notNull(),
  inspectorUserId: integer("inspector_user_id"),
  inspectorName: text("inspector_name"),
  scheduledAt: timestamp("scheduled_at"),
  completedAt: timestamp("completed_at"),
  inspectionType: text("inspection_type").notNull().$type<InspectionTypeType>().default('ROUTINE'),
  status: text("status").notNull().$type<InspectionStatusType>().default('SCHEDULED'),
  outcome: text("outcome").$type<InspectionOutcomeType>(),
  findings: text("findings"),
  violations: jsonb("violations").$type<string[]>(),
  actionsRequired: text("actions_required"),
  followUpRequired: boolean("follow_up_required").default(false),
  followUpDate: timestamp("follow_up_date"),
  attachmentPath: text("attachment_path"),
  createdByUserId: integer("created_by_user_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

// 3. Advocacy Cases - مناصرة الأعضاء
export const advocacyCases = pgTable("advocacy_cases", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  officeId: integer("office_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  caseType: text("case_type").notNull().$type<AdvocacyCaseTypeType>().default('OTHER'),
  status: text("status").notNull().$type<AdvocacyCaseStatusType>().default('OPEN'),
  priority: text("priority").$type<AdvocacyPriorityType>().default('MEDIUM'),
  assignedToUserId: integer("assigned_to_user_id"),
  internalNotes: text("internal_notes"),
  openedAt: timestamp("opened_at").defaultNow().notNull(),
  closedAt: timestamp("closed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

// Advocacy Case Events (timeline)
export const advocacyEvents = pgTable("advocacy_events", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  caseId: integer("case_id").notNull(),
  eventType: text("event_type").notNull(),
  details: text("details"),
  attachmentPath: text("attachment_path"),
  createdByUserId: integer("created_by_user_id"),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

// 4. Oversight Records - دور الرقابة والتفتيش (unlicensed offices)
export const oversightTargets = pgTable("oversight_targets", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  officeId: integer("office_id"),
  officeName: text("office_name").notNull(),
  location: jsonb("location").$type<{ city?: string; area?: string; address?: string }>(),
  contactInfo: jsonb("contact_info").$type<{ phone?: string; mobile?: string; email?: string }>(),
  licenseStatus: text("license_status").notNull().$type<OversightLicenseStatusType>().default('UNKNOWN'),
  reportSource: text("report_source").$type<OversightSourceType>().default('INTERNAL'),
  status: text("status").notNull().$type<OversightStatusType>().default('NEW'),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

// Oversight Visits
export const oversightVisits = pgTable("oversight_visits", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  targetId: integer("target_id").notNull(),
  inspectorUserId: integer("inspector_user_id"),
  visitDate: timestamp("visit_date").notNull(),
  result: text("result").$type<OversightLicenseStatusType>(),
  actionsTaken: text("actions_taken"),
  referralMade: boolean("referral_made").default(false),
  referralDetails: text("referral_details"),
  attachmentPath: text("attachment_path"),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

// 5. Staff Certifications - مصادقة خبرات موظفي المكاتب السياحية
export const staffCertifications = pgTable("staff_certifications", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  officeId: integer("office_id").notNull(),
  personId: integer("person_id"),
  fullNameAr: text("full_name_ar").notNull(),
  fullNameEn: text("full_name_en"),
  nationalId: text("national_id"),
  roleApplied: text("role_applied").$type<StaffCertificationRoleType>().default('OTHER'),
  yearsExperience: text("years_experience"),
  status: text("status").notNull().$type<StaffCertificationStatusType>().default('SUBMITTED'),
  submittedAt: timestamp("submitted_at").defaultNow().notNull(),
  decidedAt: timestamp("decided_at"),
  decidedByUserId: integer("decided_by_user_id"),
  certificateUrl: text("certificate_url"),
  adminNotes: text("admin_notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

// Staff Certification Documents
export const staffCertDocuments = pgTable("staff_cert_documents", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  certificationId: integer("certification_id").notNull(),
  category: text("category").notNull(),
  filePath: text("file_path").notNull(),
  fileName: text("file_name").notNull(),
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
  uploadedByUserId: integer("uploaded_by_user_id")
});

// 6. Compliance Checks - تنظيم أعمال مكاتب السياحة والسفر
export const complianceChecks = pgTable("compliance_checks", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  officeId: integer("office_id").notNull(),
  checkType: text("check_type").notNull().$type<ComplianceCheckTypeType>().default('OTHER'),
  status: text("status").notNull().$type<ComplianceCheckStatusType>().default('OPEN'),
  severity: text("severity").$type<ComplianceSeverityType>().default('INFO'),
  summary: text("summary"),
  dueDate: timestamp("due_date"),
  assignedToUserId: integer("assigned_to_user_id"),
  resolutionNotes: text("resolution_notes"),
  resolvedAt: timestamp("resolved_at"),
  initiatedAt: timestamp("initiated_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

// Compliance Actions (timeline)
export const complianceActions = pgTable("compliance_actions", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  checkId: integer("check_id").notNull(),
  actionType: text("action_type").notNull(),
  details: text("details"),
  attachmentPath: text("attachment_path"),
  createdByUserId: integer("created_by_user_id"),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

// 7. Enhanced Complaints - شكاوى مكاتب السياحة
export const enhancedComplaints = pgTable("enhanced_complaints", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  officeId: integer("office_id"),
  complainantType: text("complainant_type").$type<ComplainantTypeType>().default('CUSTOMER'),
  complainantName: text("complainant_name"),
  complainantContact: text("complainant_contact"),
  complaintType: text("complaint_type").$type<EnhancedComplaintTypeType>().default('OTHER'),
  subject: text("subject").notNull(),
  description: text("description"),
  status: text("status").notNull().$type<EnhancedComplaintStatusType>().default('RECEIVED'),
  priority: text("priority").$type<AdvocacyPriorityType>().default('MEDIUM'),
  handlerUserId: integer("handler_user_id"),
  resolution: text("resolution"),
  resolvedAt: timestamp("resolved_at"),
  attachments: jsonb("attachments").$type<string[]>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

// Complaint Updates (timeline)
export const complaintUpdates = pgTable("complaint_updates", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  complaintId: integer("complaint_id").notNull(),
  updateType: text("update_type").notNull(),
  details: text("details"),
  attachmentPath: text("attachment_path"),
  createdByUserId: integer("created_by_user_id"),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

export const insertUserSchema = z.object({
  email: z.string().email(),
  passwordHash: z.string(),
  role: z.enum(['ADMIN', 'OFFICE']),
  officeId: z.number().nullable().optional()
});

export const insertOfficeSchema = z.object({
  tradeNameAr: z.string(),
  tradeNameEn: z.string().nullable().optional(),
  legalNameAr: z.string().nullable().optional(),
  legalNameRegistrar: z.string().nullable().optional(),
  nationalEntityNo: z.string().nullable().optional(),
  nationalEstablishmentNumber: z.string().nullable().optional(),
  trademark: z.string().nullable().optional(),
  awqafApprovalNo: z.string().nullable().optional(),
  socialSecurityNumber: z.string().nullable().optional(),
  guaranteeExpiryDate: z.string().nullable().optional(),
  tourismActivities: z.array(z.string()).nullable().optional(),
  mainCity: z.string().nullable().optional(),
  mainArea: z.string().nullable().optional(),
  mainStreet: z.string().nullable().optional(),
  mainBuildingNumber: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  mobile: z.string().nullable().optional(),
  fax: z.string().nullable().optional(),
  website: z.string().nullable().optional(),
  mainEmail: z.string().nullable().optional(),
  extraEmail: z.string().nullable().optional(),
  poBox: z.string().nullable().optional(),
  postalCode: z.string().nullable().optional()
});

export const insertBranchSchema = z.object({
  officeId: z.number(),
  city: z.string().nullable().optional(),
  area: z.string().nullable().optional(),
  street: z.string().nullable().optional(),
  buildingNumber: z.string().nullable().optional(),
  managerName: z.string().nullable().optional(),
  managerMobile: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  fax: z.string().nullable().optional()
});

export const insertDocumentSchema = z.object({
  officeId: z.number(),
  renewalId: z.number().nullable().optional(),
  category: z.string(),
  filePath: z.string(),
  originalFilename: z.string(),
  uploadedByUserId: z.number().nullable().optional()
});

export const insertLicenseRenewalSchema = z.object({
  officeId: z.number(),
  year: z.number(),
  officialLicenseUrl: z.string().nullable().optional(),
  expiryDate: z.string().nullable().optional(),
  reviewerNotes: z.string().nullable().optional(),
  officeFormCompleted: z.boolean().nullable().optional(),
  staffFormCompleted: z.boolean().nullable().optional(),
  commitmentFormCompleted: z.boolean().nullable().optional(),
  submittedAt: z.date().nullable().optional()
});

export const insertPersonSchema = z.object({
  officeId: z.number(),
  renewalId: z.number().nullable().optional(),
  fullNameAr: z.string(),
  fullNameEn: z.string().nullable().optional(),
  nationalId: z.string().nullable().optional(),
  socialSecurityNo: z.string().nullable().optional(),
  nationality: z.string().nullable().optional(),
  gender: z.string().nullable().optional(),
  motherName: z.string().nullable().optional(),
  mobile: z.string().nullable().optional(),
  birthDate: z.string().nullable().optional(),
  currentPosition: z.string().nullable().optional(),
  startDate: z.string().nullable().optional(),
  branch: z.string().nullable().optional()
});

export const insertRoleInOfficeSchema = z.object({
  officeId: z.number(),
  personId: z.number(),
  renewalId: z.number().nullable().optional(),
  roleType: z.enum(['PARTNER', 'AUTHORIZED', 'DEDICATED_MANAGER', 'EMPLOYEE'])
});

export const insertConsentSchema = z.object({
  officeId: z.number(),
  renewalId: z.number().nullable().optional(),
  userId: z.number().nullable().optional(),
  consentType: z.enum(['DATA_ACCURACY', 'COMPLAINT_COMMITMENT']),
  ipAddress: z.string().nullable().optional(),
  userAgent: z.string().nullable().optional(),
  payload: z.record(z.any()).nullable().optional()
});

export const insertRenewalAttachmentSchema = z.object({
  officeId: z.number(),
  renewalId: z.number().nullable().optional(),
  category: z.string(),
  fileUrl: z.string(),
  fileName: z.string(),
  mimeType: z.string().nullable().optional(),
  fileSize: z.number().nullable().optional(),
  meta: z.record(z.any()).nullable().optional(),
  uploadedByUserId: z.number().nullable().optional()
});

export const insertAuditLogSchema = z.object({
  userId: z.number(),
  action: z.string(),
  targetType: z.string(),
  targetId: z.number(),
  details: z.record(z.any()).nullable().optional()
});

export const insertPromoCodeSchema = z.object({
  code: z.string().min(1),
  discountType: z.enum(['PERCENT', 'FIXED', 'FREE']),
  discountValue: z.number(),
  maxUses: z.number().nullable().optional(),
  validFrom: z.date().nullable().optional(),
  validUntil: z.date().nullable().optional(),
  isActive: z.boolean().optional()
});

export const insertPaymentSchema = z.object({
  officeId: z.number(),
  renewalId: z.number().nullable().optional(),
  amount: z.number(),
  promoCodeId: z.number().nullable().optional(),
  discountAmount: z.number().nullable().optional(),
  finalAmount: z.number().nullable().optional(),
  status: z.enum(['PENDING', 'UPLOADED', 'APPROVED', 'REJECTED']).optional(),
  proofFileUrl: z.string().nullable().optional(),
  proofFileName: z.string().nullable().optional(),
  rejectionReason: z.string().nullable().optional(),
  approvedByUserId: z.number().nullable().optional()
});

// ============================================
// NEW MODULE INSERT SCHEMAS
// ============================================

export const insertMembershipCardSchema = z.object({
  officeId: z.number(),
  cardNumber: z.string(),
  status: z.enum(['PENDING', 'ACTIVE', 'SUSPENDED', 'EXPIRED', 'REVOKED']).optional(),
  issuedAt: z.date().nullable().optional(),
  expiresAt: z.date().nullable().optional(),
  issuedByUserId: z.number().nullable().optional(),
  notes: z.string().nullable().optional()
});

export const insertInspectionSchema = z.object({
  officeId: z.number(),
  inspectorUserId: z.number().nullable().optional(),
  inspectorName: z.string().nullable().optional(),
  scheduledAt: z.date().nullable().optional(),
  completedAt: z.date().nullable().optional(),
  inspectionType: z.enum(['INITIAL', 'ROUTINE', 'FOLLOW_UP', 'COMPLAINT_BASED']).optional(),
  status: z.enum(['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
  outcome: z.enum(['COMPLIANT', 'NON_COMPLIANT', 'PARTIALLY_COMPLIANT', 'PENDING_REVIEW']).nullable().optional(),
  findings: z.string().nullable().optional(),
  violations: z.array(z.string()).nullable().optional(),
  actionsRequired: z.string().nullable().optional(),
  followUpRequired: z.boolean().optional(),
  followUpDate: z.date().nullable().optional(),
  attachmentPath: z.string().nullable().optional(),
  createdByUserId: z.number().nullable().optional()
});

export const insertAdvocacyCaseSchema = z.object({
  officeId: z.number(),
  title: z.string(),
  description: z.string().nullable().optional(),
  caseType: z.enum(['DISPUTE', 'REGULATORY', 'MINISTRY', 'LEGAL', 'OTHER']).optional(),
  status: z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  assignedToUserId: z.number().nullable().optional(),
  internalNotes: z.string().nullable().optional()
});

export const insertAdvocacyEventSchema = z.object({
  caseId: z.number(),
  eventType: z.string(),
  details: z.string().nullable().optional(),
  attachmentPath: z.string().nullable().optional(),
  createdByUserId: z.number().nullable().optional()
});

export const insertOversightTargetSchema = z.object({
  officeId: z.number().nullable().optional(),
  officeName: z.string(),
  location: z.object({
    city: z.string().optional(),
    area: z.string().optional(),
    address: z.string().optional()
  }).nullable().optional(),
  contactInfo: z.object({
    phone: z.string().optional(),
    mobile: z.string().optional(),
    email: z.string().optional()
  }).nullable().optional(),
  licenseStatus: z.enum(['LICENSED', 'UNLICENSED', 'SUSPENDED', 'UNKNOWN']).optional(),
  reportSource: z.enum(['MINISTRY', 'CITIZEN', 'INTERNAL', 'COMPLAINT', 'INSPECTION']).optional(),
  status: z.enum(['NEW', 'UNDER_INVESTIGATION', 'ACTION_REQUIRED', 'RESOLVED']).optional(),
  notes: z.string().nullable().optional()
});

export const insertOversightVisitSchema = z.object({
  targetId: z.number(),
  inspectorUserId: z.number().nullable().optional(),
  visitDate: z.date(),
  result: z.enum(['LICENSED', 'UNLICENSED', 'SUSPENDED', 'UNKNOWN']).nullable().optional(),
  actionsTaken: z.string().nullable().optional(),
  referralMade: z.boolean().optional(),
  referralDetails: z.string().nullable().optional(),
  attachmentPath: z.string().nullable().optional()
});

export const insertStaffCertificationSchema = z.object({
  officeId: z.number(),
  personId: z.number().nullable().optional(),
  fullNameAr: z.string(),
  fullNameEn: z.string().nullable().optional(),
  nationalId: z.string().nullable().optional(),
  roleApplied: z.enum(['GUIDE', 'OPERATIONS', 'SALES', 'MANAGER', 'OTHER']).optional(),
  yearsExperience: z.string().nullable().optional(),
  status: z.enum(['SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED']).optional(),
  adminNotes: z.string().nullable().optional()
});

export const insertStaffCertDocumentSchema = z.object({
  certificationId: z.number(),
  category: z.string(),
  filePath: z.string(),
  fileName: z.string(),
  uploadedByUserId: z.number().nullable().optional()
});

export const insertComplianceCheckSchema = z.object({
  officeId: z.number(),
  checkType: z.enum(['LICENSE', 'INSURANCE', 'EMPLOYEE_STATUS', 'FINANCIAL', 'SAFETY', 'OTHER']).optional(),
  status: z.enum(['OPEN', 'IN_PROGRESS', 'CLOSED']).optional(),
  severity: z.enum(['INFO', 'WARNING', 'CRITICAL']).optional(),
  summary: z.string().nullable().optional(),
  dueDate: z.date().nullable().optional(),
  assignedToUserId: z.number().nullable().optional(),
  resolutionNotes: z.string().nullable().optional()
});

export const insertComplianceActionSchema = z.object({
  checkId: z.number(),
  actionType: z.string(),
  details: z.string().nullable().optional(),
  attachmentPath: z.string().nullable().optional(),
  createdByUserId: z.number().nullable().optional()
});

export const insertEnhancedComplaintSchema = z.object({
  officeId: z.number().nullable().optional(),
  complainantType: z.enum(['CUSTOMER', 'OFFICE', 'EMPLOYEE', 'AUTHORITY', 'INTERNAL']).optional(),
  complainantName: z.string().nullable().optional(),
  complainantContact: z.string().nullable().optional(),
  complaintType: z.enum(['SERVICE', 'FINANCIAL', 'SAFETY', 'LEGAL', 'OTHER']).optional(),
  subject: z.string(),
  description: z.string().nullable().optional(),
  status: z.enum(['RECEIVED', 'INVESTIGATING', 'RESOLVED', 'ESCALATED', 'CLOSED']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  handlerUserId: z.number().nullable().optional(),
  attachments: z.array(z.string()).nullable().optional()
});

export const insertComplaintUpdateSchema = z.object({
  complaintId: z.number(),
  updateType: z.string(),
  details: z.string().nullable().optional(),
  attachmentPath: z.string().nullable().optional(),
  createdByUserId: z.number().nullable().optional()
});

export const registerSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[^a-zA-Z0-9]/, "Password must contain at least one special character"),
  confirmPassword: z.string(),
  contactName: z.string().min(1, "Contact name is required")
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"]
});

export const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required")
});

export const officeInfoSchema = z.object({
  tradeNameAr: z.string().min(1, "Trade name is required"),
  tradeNameEn: z.string().optional(),
  legalNameRegistrar: z.string().optional(),
  nationalEstablishmentNumber: z.string().optional(),
  trademark: z.string().optional(),
  awqafApprovalNo: z.string().optional(),
  socialSecurityNumber: z.string().optional(),
  guaranteeExpiryDate: z.string().optional(),
  tourismActivities: z.array(z.string()).optional(),
  mainCity: z.string().optional(),
  mainArea: z.string().optional(),
  mainStreet: z.string().optional(),
  mainBuildingNumber: z.string().optional(),
  phone: z.string().optional(),
  mobile: z.string().optional(),
  fax: z.string().optional(),
  website: z.string().optional(),
  mainEmail: z.string().email().optional().or(z.literal("")),
  extraEmail: z.string().email().optional().or(z.literal("")),
  poBox: z.string().optional(),
  postalCode: z.string().optional()
});

export const branchSchema = z.object({
  city: z.string().optional(),
  area: z.string().optional(),
  street: z.string().optional(),
  buildingNumber: z.string().optional(),
  managerName: z.string().optional(),
  managerMobile: z.string().optional(),
  phone: z.string().optional(),
  fax: z.string().optional()
});

export const officeUpdateSchema = z.object({
  mainCity: z.string().optional(),
  mainArea: z.string().optional(),
  mainStreet: z.string().optional(),
  mainBuildingNumber: z.string().optional(),
  phone: z.string().optional(),
  mobile: z.string().optional(),
  fax: z.string().optional(),
  website: z.string().optional(),
  mainEmail: z.string().email().optional().or(z.literal("")),
  extraEmail: z.string().email().optional().or(z.literal("")),
  poBox: z.string().optional(),
  postalCode: z.string().optional()
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertOffice = z.infer<typeof insertOfficeSchema>;
export type Office = typeof offices.$inferSelect;
export type InsertBranch = z.infer<typeof insertBranchSchema>;
export type Branch = typeof branches.$inferSelect;
export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type Document = typeof documents.$inferSelect;
export type InsertLicenseRenewal = z.infer<typeof insertLicenseRenewalSchema>;
export type LicenseRenewal = typeof licenseRenewals.$inferSelect;
export type InsertPerson = z.infer<typeof insertPersonSchema>;
export type Person = typeof people.$inferSelect;
export type InsertRoleInOffice = z.infer<typeof insertRoleInOfficeSchema>;
export type RoleInOffice = typeof rolesInOffice.$inferSelect;
export type InsertConsent = z.infer<typeof insertConsentSchema>;
export type Consent = typeof consents.$inferSelect;
export type InsertRenewalAttachment = z.infer<typeof insertRenewalAttachmentSchema>;
export type RenewalAttachment = typeof renewalAttachments.$inferSelect;
export type RegisterForm = z.infer<typeof registerSchema>;
export type LoginForm = z.infer<typeof loginSchema>;
export type OfficeInfoForm = z.infer<typeof officeInfoSchema>;
export type BranchForm = z.infer<typeof branchSchema>;
export type OfficeUpdateForm = z.infer<typeof officeUpdateSchema>;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertPromoCode = z.infer<typeof insertPromoCodeSchema>;
export type PromoCode = typeof promoCodes.$inferSelect;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type Payment = typeof payments.$inferSelect;

export const officeForm2026Schema = z.object({
  legalNameAr: z.string().min(1, "الاسم القانوني مطلوب"),
  tradeNameAr: z.string().min(1, "الاسم التجاري بالعربية مطلوب"),
  tradeNameEn: z.string().optional(),
  nationalEntityNo: z.string().min(1, "رقم الكيان الوطني مطلوب"),
  trademark: z.string().optional(),
  awqafApprovalNo: z.string().optional(),
  socialSecurityNumber: z.string().optional(),
  guaranteeExpiryDate: z.string().optional(),
  tourismActivities: z.array(z.string()).min(1, "يجب اختيار نشاط واحد على الأقل"),
  mainCity: z.string().optional(),
  mainArea: z.string().optional(),
  mainStreet: z.string().optional(),
  mainBuildingNumber: z.string().optional(),
  phone: z.string().optional(),
  fax: z.string().optional(),
  mobile: z.string().optional(),
  website: z.string().optional(),
  mainEmail: z.string().email("البريد الإلكتروني غير صالح").min(1, "البريد الإلكتروني مطلوب"),
  extraEmail: z.string().email().optional().or(z.literal("")),
  poBox: z.string().optional(),
  postalCode: z.string().optional(),
  branches: z.array(branchSchema).optional(),
  consentAccepted: z.boolean().refine(val => val === true, "يجب الموافقة على صحة البيانات")
});

export const personSchema = z.object({
  fullNameAr: z.string().min(1, "الاسم الرباعي مطلوب"),
  fullNameEn: z.string().optional(),
  nationalId: z.string().min(1, "الرقم الوطني مطلوب"),
  socialSecurityNo: z.string().optional(),
  nationality: z.string().optional(),
  gender: z.string().optional(),
  motherName: z.string().optional(),
  mobile: z.string().optional(),
  birthDate: z.string().optional(),
  currentPosition: z.string().optional(),
  startDate: z.string().optional(),
  branch: z.string().optional()
});

export const staffForm2026Schema = z.object({
  partners: z.array(personSchema),
  authorized: z.array(personSchema),
  dedicatedManagers: z.array(personSchema),
  employees: z.array(personSchema),
  consentAccepted: z.boolean().refine(val => val === true, "يجب الموافقة على صحة البيانات")
});

export const complaintRowSchema = z.object({
  complaintNumber: z.string().min(1, "رقم الشكوى مطلوب"),
  authority: z.enum(['الجمعية', 'الوزارة', 'أخرى'], { required_error: "الجهة مطلوبة" }),
  notifiedAt: z.string().min(1, "تاريخ الإشعار مطلوب"),
  summary: z.string().max(200, "الملخص يجب ألا يتجاوز 200 حرف").optional(),
  proposedAction: z.string().optional()
});

export const commitmentFormSchema = z.object({
  officeName: z.string().min(1, "اسم المكتب مطلوب"),
  licenseNo: z.string().min(1, "رقم الرخصة مطلوب"),
  contactName: z.string().min(1, "اسم الشخص المسؤول مطلوب"),
  contactEmail: z.string().email("البريد الإلكتروني غير صالح").min(1, "البريد الإلكتروني مطلوب"),
  contactMobile: z.string().min(1, "رقم الموبايل مطلوب"),
  hasComplaints: z.boolean().default(false),
  complaints: z.array(complaintRowSchema).optional(),
  consentAccepted: z.boolean().refine(val => val === true, "يجب الموافقة على التعهد")
});

export const insertComplaintSchema = z.object({
  officeId: z.number(),
  renewalId: z.number().nullable().optional(),
  commitmentId: z.number().nullable().optional(),
  complaintNumber: z.string(),
  authority: z.string(),
  notifiedAt: z.string(),
  summary: z.string().nullable().optional(),
  proposedAction: z.string().nullable().optional()
});

export const insertCommitmentFormSchema = z.object({
  officeId: z.number(),
  renewalId: z.number().nullable().optional(),
  officeName: z.string(),
  licenseNo: z.string(),
  contactName: z.string(),
  contactEmail: z.string(),
  contactMobile: z.string(),
  hasComplaints: z.boolean().optional(),
  consentAccepted: z.boolean(),
  ipAddress: z.string().nullable().optional(),
  userAgent: z.string().nullable().optional()
});

export const officeInfoFormSchema = z.object({
  establishmentNameCommercialReg: z.string().min(1, "اسم المنشأة حسب السجل التجاري مطلوب"),
  tradeNameAr: z.string().min(1, "الاسم التجاري بالعربية مطلوب"),
  tradeNameEn: z.string().optional(),
  nationalEstablishmentNumber: z.string().min(1, "رقم المنشأة الوطني مطلوب"),
  trademark: z.string().optional(),
  awqafAccreditationNumber: z.string().optional(),
  socialSecurityNumber: z.string().optional(),
  guaranteeExpiryDate: z.string().optional(),
  consentAccepted: z.boolean().refine(val => val === true, "يجب الموافقة على صحة البيانات")
});

export const insertOfficeInfoFormSchema = z.object({
  officeId: z.number(),
  renewalId: z.number().nullable().optional(),
  establishmentNameCommercialReg: z.string(),
  tradeNameAr: z.string(),
  tradeNameEn: z.string().nullable().optional(),
  nationalEstablishmentNumber: z.string(),
  trademark: z.string().nullable().optional(),
  awqafAccreditationNumber: z.string().nullable().optional(),
  socialSecurityNumber: z.string().nullable().optional(),
  guaranteeExpiryDate: z.string().nullable().optional(),
  consentAccepted: z.boolean(),
  ipAddress: z.string().nullable().optional(),
  userAgent: z.string().nullable().optional()
});

export type OfficeForm2026 = z.infer<typeof officeForm2026Schema>;
export type PersonFormData = z.infer<typeof personSchema>;
export type StaffForm2026 = z.infer<typeof staffForm2026Schema>;
export type CommitmentForm = z.infer<typeof commitmentFormSchema>;
export type ComplaintRow = z.infer<typeof complaintRowSchema>;
export type InsertComplaint = z.infer<typeof insertComplaintSchema>;
export type Complaint = typeof complaints.$inferSelect;
export type InsertCommitmentForm = z.infer<typeof insertCommitmentFormSchema>;
export type CommitmentFormRecord = typeof commitmentForms.$inferSelect;
export type OfficeInfoFormData = z.infer<typeof officeInfoFormSchema>;
export type InsertOfficeInfoForm = z.infer<typeof insertOfficeInfoFormSchema>;
export type OfficeInfoFormRecord = typeof officeInfoForms.$inferSelect;

// ============================================
// NEW MODULE TYPES
// ============================================

export type InsertMembershipCard = z.infer<typeof insertMembershipCardSchema>;
export type MembershipCard = typeof membershipCards.$inferSelect;

export type InsertInspection = z.infer<typeof insertInspectionSchema>;
export type Inspection = typeof inspections.$inferSelect;

export type InsertAdvocacyCase = z.infer<typeof insertAdvocacyCaseSchema>;
export type AdvocacyCase = typeof advocacyCases.$inferSelect;

export type InsertAdvocacyEvent = z.infer<typeof insertAdvocacyEventSchema>;
export type AdvocacyEvent = typeof advocacyEvents.$inferSelect;

export type InsertOversightTarget = z.infer<typeof insertOversightTargetSchema>;
export type OversightTarget = typeof oversightTargets.$inferSelect;

export type InsertOversightVisit = z.infer<typeof insertOversightVisitSchema>;
export type OversightVisit = typeof oversightVisits.$inferSelect;

export type InsertStaffCertification = z.infer<typeof insertStaffCertificationSchema>;
export type StaffCertification = typeof staffCertifications.$inferSelect;

export type InsertStaffCertDocument = z.infer<typeof insertStaffCertDocumentSchema>;
export type StaffCertDocument = typeof staffCertDocuments.$inferSelect;

export type InsertComplianceCheck = z.infer<typeof insertComplianceCheckSchema>;
export type ComplianceCheck = typeof complianceChecks.$inferSelect;

export type InsertComplianceAction = z.infer<typeof insertComplianceActionSchema>;
export type ComplianceAction = typeof complianceActions.$inferSelect;

export type InsertEnhancedComplaint = z.infer<typeof insertEnhancedComplaintSchema>;
export type EnhancedComplaint = typeof enhancedComplaints.$inferSelect;

export type InsertComplaintUpdate = z.infer<typeof insertComplaintUpdateSchema>;
export type ComplaintUpdate = typeof complaintUpdates.$inferSelect;
