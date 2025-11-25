import { pgTable, text, varchar, timestamp, integer, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const OfficeStatus = {
  PENDING_APPROVAL: 'PENDING_APPROVAL',
  ACTIVE: 'ACTIVE',
  REJECTED: 'REJECTED'
} as const;

export const RenewalStatus = {
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
  MINISTRY_APPROVED_DOC: 'MINISTRY_APPROVED_DOC'
} as const;

export const UserRole = {
  ADMIN: 'ADMIN',
  OFFICE: 'OFFICE'
} as const;

export type OfficeStatusType = typeof OfficeStatus[keyof typeof OfficeStatus];
export type RenewalStatusType = typeof RenewalStatus[keyof typeof RenewalStatus];
export type DocumentCategoryType = typeof DocumentCategory[keyof typeof DocumentCategory];
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
  legalNameRegistrar: text("legal_name_registrar"),
  nationalEstablishmentNumber: text("national_establishment_number"),
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
  createdAt: timestamp("created_at").defaultNow().notNull()
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
  adminComment: text("admin_comment"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true
});

export const insertOfficeSchema = createInsertSchema(offices).omit({
  id: true,
  createdAt: true,
  status: true,
  adminComment: true
});

export const insertBranchSchema = createInsertSchema(branches).omit({
  id: true
});

export const insertDocumentSchema = createInsertSchema(documents).omit({
  id: true,
  uploadedAt: true
});

export const insertLicenseRenewalSchema = createInsertSchema(licenseRenewals).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  status: true,
  ministryDocumentPath: true,
  adminComment: true
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
export type RegisterForm = z.infer<typeof registerSchema>;
export type LoginForm = z.infer<typeof loginSchema>;
export type OfficeInfoForm = z.infer<typeof officeInfoSchema>;
export type BranchForm = z.infer<typeof branchSchema>;
