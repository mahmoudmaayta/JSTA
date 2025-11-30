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
  PACK_5_OTHER_DOCS: 'PACK_5_OTHER_DOCS'
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

export type OfficeStatusType = typeof OfficeStatus[keyof typeof OfficeStatus];
export type RenewalStatusType = typeof RenewalStatus[keyof typeof RenewalStatus];
export type DocumentCategoryType = typeof DocumentCategory[keyof typeof DocumentCategory];
export type PersonRoleTypeType = typeof PersonRoleType[keyof typeof PersonRoleType];
export type ConsentTypeType = typeof ConsentType[keyof typeof ConsentType];
export type UserRoleType = typeof UserRole[keyof typeof UserRole];

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

export const registerSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
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
  legalNameRegistrar: z.string().optional(),
  nationalEstablishmentNumber: z.string().optional(),
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

export const commitmentFormSchema = z.object({
  complaintNumbers: z.array(z.string()).optional(),
  notes: z.string().optional(),
  consentAccepted: z.boolean().refine(val => val === true, "يجب الموافقة على التعهد")
});

export type OfficeForm2026 = z.infer<typeof officeForm2026Schema>;
export type PersonFormData = z.infer<typeof personSchema>;
export type StaffForm2026 = z.infer<typeof staffForm2026Schema>;
export type CommitmentForm = z.infer<typeof commitmentFormSchema>;
