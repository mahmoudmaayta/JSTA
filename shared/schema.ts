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

export const LicenseCategory = {
  A: 'A',
  B: 'B',
  C: 'C',
  D: 'D',
  AB: 'A+B',
  AC: 'A+C',
  AD: 'A+D',
  BC: 'B+C',
  BD: 'B+D',
  CD: 'C+D',
  ABC: 'A+B+C',
  ABD: 'A+B+D',
  ACD: 'A+C+D',
  BCD: 'B+C+D',
  ABCD: 'A+B+C+D'
} as const;

export type LicenseCategoryType = typeof LicenseCategory[keyof typeof LicenseCategory] | string;

export const offices = pgTable("offices", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  legacyId: integer("legacy_id"),
  registrationNumber: text("registration_number"),
  tradeNameAr: text("trade_name_ar").notNull(),
  tradeNameEn: text("trade_name_en"),
  legalNameAr: text("legal_name_ar"),
  legalNameRegistrar: text("legal_name_registrar"),
  nationalEntityNo: text("national_entity_no"),
  nationalEstablishmentNumber: text("national_establishment_number"),
  trademark: text("trademark"),
  brand: text("brand"),
  awqafApprovalNo: text("awqaf_approval_no"),
  socialSecurityNumber: text("social_security_number"),
  guaranteeExpiryDate: text("guarantee_expiry_date"),
  licenseCategory: text("license_category").$type<LicenseCategoryType>(),
  iataNumber: text("iata_number"),
  isIata: boolean("is_iata").default(false),
  isUftaa: boolean("is_uftaa").default(false),
  isAsta: boolean("is_asta").default(false),
  isWto: boolean("is_wto").default(false),
  noTourismPromotion: text("no_tourism_promotion"),
  ministryAwqaf: text("ministry_awqaf"),
  tourismImported: boolean("tourism_imported").default(false),
  airlineTickets: boolean("airline_tickets").default(false),
  hajjUmrah: boolean("hajj_umrah").default(false),
  domesticTourism: boolean("domestic_tourism").default(false),
  outboundTourism: boolean("outbound_tourism").default(false),
  tourismActivities: jsonb("tourism_activities").$type<string[]>(),
  bankGuarantee: integer("bank_guarantee"),
  bankGuaranteeEnd: text("bank_guarantee_end"),
  mainCity: text("main_city"),
  mainCityCode: integer("main_city_code"),
  mainArea: text("main_area"),
  mainAreaCode: integer("main_area_code"),
  mainStreet: text("main_street"),
  mainBuildingNumber: text("main_building_number"),
  fullAddress: text("full_address"),
  phone: text("phone"),
  mobile: text("mobile"),
  fax: text("fax"),
  website: text("website"),
  mainEmail: text("main_email"),
  extraEmail: text("extra_email"),
  poBox: text("po_box"),
  postalCode: text("postal_code"),
  managerFirstName: text("manager_first_name"),
  managerSecondName: text("manager_second_name"),
  managerMiddleName: text("manager_middle_name"),
  managerLastName: text("manager_last_name"),
  owner: text("owner"),
  authorized: text("authorized"),
  authorizedSignature: text("authorized_signature"),
  nationalNumber: text("national_number"),
  ministryFileNumber: text("ministry_file_number"),
  logoPath: text("logo_path"),
  openDate: text("open_date"),
  closeDate: text("close_date"),
  lastRenewalYear: integer("last_renewal_year"),
  hasBranch: boolean("has_branch").default(false),
  branchCount: integer("branch_count").default(0),
  status: text("status").notNull().$type<OfficeStatusType>().default('PENDING_APPROVAL'),
  adminComment: text("admin_comment"),
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
  legacyId: integer("legacy_id"),
  officeId: integer("office_id"),
  renewalId: integer("renewal_id"),
  firstName: text("first_name"),
  secondName: text("second_name"),
  middleName: text("middle_name"),
  lastName: text("last_name"),
  firstNameEn: text("first_name_en"),
  secondNameEn: text("second_name_en"),
  middleNameEn: text("middle_name_en"),
  lastNameEn: text("last_name_en"),
  fullNameAr: text("full_name_ar"),
  fullNameEn: text("full_name_en"),
  jstaIdNum: text("jsta_id_num"),
  nationalId: text("national_id"),
  socialSecurityNo: text("social_security_no"),
  nationality: text("nationality"),
  gender: text("gender"),
  motherName: text("mother_name"),
  mobile: text("mobile"),
  email: text("email"),
  birthDate: text("birth_date"),
  qualification: integer("qualification"),
  qualificationFile: text("qualification_file"),
  jobTitle: integer("job_title"),
  job: text("job"),
  courses: text("courses"),
  currentPosition: text("current_position"),
  startDate: text("start_date"),
  branch: text("branch"),
  passportNumber: text("passport_number"),
  passportFile: text("passport_file"),
  locationFile: text("location_file"),
  picture: text("picture"),
  cv: text("cv"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

export const employeeWorkHistory = pgTable("employee_work_history", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  legacyId: integer("legacy_id"),
  personId: integer("person_id").notNull(),
  officeId: integer("office_id").notNull(),
  branchId: integer("branch_id"),
  dateIn: text("date_in"),
  dateOut: text("date_out"),
  jobTitle: integer("job_title"),
  description: text("description"),
  letterAppointment: text("letter_appointment"),
  contractAppointment: text("contract_appointment"),
  intelligenceModel: text("intelligence_model"),
  noCriminalRecord: text("no_criminal_record"),
  permit: text("permit"),
  photoId: text("photo_id"),
  bookEnd: text("book_end"),
  healthInsurance: text("health_insurance"),
  socialSecurity: text("social_security"),
  disclaimersFile: text("disclaimers_file"),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

export const jobTitles = pgTable("job_titles", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  legacyId: integer("legacy_id"),
  name: text("name").notNull(),
  nameAr: text("name_ar").notNull()
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

export const insertUserSchema = z.object({
  email: z.string().email(),
  passwordHash: z.string(),
  role: z.enum(['ADMIN', 'OFFICE']),
  officeId: z.number().nullable().optional()
});

export const insertOfficeSchema = z.object({
  legacyId: z.number().nullable().optional(),
  registrationNumber: z.string().nullable().optional(),
  tradeNameAr: z.string(),
  tradeNameEn: z.string().nullable().optional(),
  legalNameAr: z.string().nullable().optional(),
  legalNameRegistrar: z.string().nullable().optional(),
  nationalEntityNo: z.string().nullable().optional(),
  nationalEstablishmentNumber: z.string().nullable().optional(),
  trademark: z.string().nullable().optional(),
  brand: z.string().nullable().optional(),
  awqafApprovalNo: z.string().nullable().optional(),
  socialSecurityNumber: z.string().nullable().optional(),
  guaranteeExpiryDate: z.string().nullable().optional(),
  licenseCategory: z.string().nullable().optional(),
  iataNumber: z.string().nullable().optional(),
  isIata: z.boolean().nullable().optional(),
  isUftaa: z.boolean().nullable().optional(),
  isAsta: z.boolean().nullable().optional(),
  isWto: z.boolean().nullable().optional(),
  noTourismPromotion: z.string().nullable().optional(),
  ministryAwqaf: z.string().nullable().optional(),
  tourismImported: z.boolean().nullable().optional(),
  airlineTickets: z.boolean().nullable().optional(),
  hajjUmrah: z.boolean().nullable().optional(),
  domesticTourism: z.boolean().nullable().optional(),
  outboundTourism: z.boolean().nullable().optional(),
  tourismActivities: z.array(z.string()).nullable().optional(),
  bankGuarantee: z.number().nullable().optional(),
  bankGuaranteeEnd: z.string().nullable().optional(),
  mainCity: z.string().nullable().optional(),
  mainCityCode: z.number().nullable().optional(),
  mainArea: z.string().nullable().optional(),
  mainAreaCode: z.number().nullable().optional(),
  mainStreet: z.string().nullable().optional(),
  mainBuildingNumber: z.string().nullable().optional(),
  fullAddress: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  mobile: z.string().nullable().optional(),
  fax: z.string().nullable().optional(),
  website: z.string().nullable().optional(),
  mainEmail: z.string().nullable().optional(),
  extraEmail: z.string().nullable().optional(),
  poBox: z.string().nullable().optional(),
  postalCode: z.string().nullable().optional(),
  managerFirstName: z.string().nullable().optional(),
  managerSecondName: z.string().nullable().optional(),
  managerMiddleName: z.string().nullable().optional(),
  managerLastName: z.string().nullable().optional(),
  owner: z.string().nullable().optional(),
  authorized: z.string().nullable().optional(),
  authorizedSignature: z.string().nullable().optional(),
  nationalNumber: z.string().nullable().optional(),
  ministryFileNumber: z.string().nullable().optional(),
  logoPath: z.string().nullable().optional(),
  openDate: z.string().nullable().optional(),
  closeDate: z.string().nullable().optional(),
  lastRenewalYear: z.number().nullable().optional(),
  hasBranch: z.boolean().nullable().optional(),
  branchCount: z.number().nullable().optional()
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
  legacyId: z.number().nullable().optional(),
  officeId: z.number().nullable().optional(),
  renewalId: z.number().nullable().optional(),
  firstName: z.string().nullable().optional(),
  secondName: z.string().nullable().optional(),
  middleName: z.string().nullable().optional(),
  lastName: z.string().nullable().optional(),
  firstNameEn: z.string().nullable().optional(),
  secondNameEn: z.string().nullable().optional(),
  middleNameEn: z.string().nullable().optional(),
  lastNameEn: z.string().nullable().optional(),
  fullNameAr: z.string().nullable().optional(),
  fullNameEn: z.string().nullable().optional(),
  jstaIdNum: z.string().nullable().optional(),
  nationalId: z.string().nullable().optional(),
  socialSecurityNo: z.string().nullable().optional(),
  nationality: z.string().nullable().optional(),
  gender: z.string().nullable().optional(),
  motherName: z.string().nullable().optional(),
  mobile: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  birthDate: z.string().nullable().optional(),
  qualification: z.number().nullable().optional(),
  qualificationFile: z.string().nullable().optional(),
  jobTitle: z.number().nullable().optional(),
  job: z.string().nullable().optional(),
  courses: z.string().nullable().optional(),
  currentPosition: z.string().nullable().optional(),
  startDate: z.string().nullable().optional(),
  branch: z.string().nullable().optional(),
  passportNumber: z.string().nullable().optional(),
  passportFile: z.string().nullable().optional(),
  locationFile: z.string().nullable().optional(),
  picture: z.string().nullable().optional(),
  cv: z.string().nullable().optional()
});

export const insertEmployeeWorkHistorySchema = z.object({
  legacyId: z.number().nullable().optional(),
  personId: z.number(),
  officeId: z.number(),
  branchId: z.number().nullable().optional(),
  dateIn: z.string().nullable().optional(),
  dateOut: z.string().nullable().optional(),
  jobTitle: z.number().nullable().optional(),
  description: z.string().nullable().optional(),
  letterAppointment: z.string().nullable().optional(),
  contractAppointment: z.string().nullable().optional(),
  intelligenceModel: z.string().nullable().optional(),
  noCriminalRecord: z.string().nullable().optional(),
  permit: z.string().nullable().optional(),
  photoId: z.string().nullable().optional(),
  bookEnd: z.string().nullable().optional(),
  healthInsurance: z.string().nullable().optional(),
  socialSecurity: z.string().nullable().optional(),
  disclaimersFile: z.string().nullable().optional()
});

export const insertJobTitleSchema = z.object({
  legacyId: z.number().nullable().optional(),
  name: z.string(),
  nameAr: z.string()
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
export type InsertEmployeeWorkHistory = z.infer<typeof insertEmployeeWorkHistorySchema>;
export type EmployeeWorkHistory = typeof employeeWorkHistory.$inferSelect;
export type InsertJobTitle = z.infer<typeof insertJobTitleSchema>;
export type JobTitle = typeof jobTitles.$inferSelect;
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
