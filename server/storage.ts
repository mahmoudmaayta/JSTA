import { 
  users, offices, branches, documents, licenseRenewals, auditLogs,
  people, rolesInOffice, consents, renewalAttachments,
  complaints, commitmentForms, officeInfoForms, payments, promoCodes,
  // New module tables
  membershipCards, inspections, advocacyCases, advocacyEvents,
  oversightTargets, oversightVisits, staffCertifications, staffCertDocuments,
  complianceChecks, complianceActions, enhancedComplaints, complaintUpdates,
  type User, type InsertUser,
  type Office, type InsertOffice,
  type Branch, type InsertBranch,
  type Document, type InsertDocument,
  type LicenseRenewal, type InsertLicenseRenewal,
  type AuditLog, type InsertAuditLog,
  type Person, type InsertPerson,
  type RoleInOffice, type InsertRoleInOffice,
  type Consent, type InsertConsent,
  type RenewalAttachment, type InsertRenewalAttachment,
  type Complaint, type InsertComplaint,
  type CommitmentFormRecord, type InsertCommitmentForm,
  type OfficeInfoFormRecord, type InsertOfficeInfoForm,
  type Payment, type InsertPayment, type PaymentStatusType,
  type PromoCode, type InsertPromoCode,
  type OfficeStatusType, type RenewalStatusType, type PersonRoleTypeType,
  type OfficeUpdateForm, type DocumentCategoryType,
  // New module types
  type MembershipCard, type InsertMembershipCard,
  type Inspection, type InsertInspection,
  type AdvocacyCase, type InsertAdvocacyCase,
  type AdvocacyEvent, type InsertAdvocacyEvent,
  type OversightTarget, type InsertOversightTarget,
  type OversightVisit, type InsertOversightVisit,
  type StaffCertification, type InsertStaffCertification,
  type StaffCertDocument, type InsertStaffCertDocument,
  type ComplianceCheck, type InsertComplianceCheck,
  type ComplianceAction, type InsertComplianceAction,
  type EnhancedComplaint, type InsertEnhancedComplaint,
  type ComplaintUpdate, type InsertComplaintUpdate
} from "@shared/schema";
import { drizzle } from "drizzle-orm/node-postgres";
import pkg from "pg";
const { Pool } = pkg;
import { eq, desc, inArray, sql, and, gte, lte, count, avg } from "drizzle-orm";
import bcrypt from "bcryptjs";

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle(pool);

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserOfficeId(userId: number, officeId: number): Promise<void>;
  
  getOffice(id: number): Promise<Office | undefined>;
  getAllOffices(): Promise<Office[]>;
  getOfficesByStatus(status: OfficeStatusType): Promise<Office[]>;
  createOffice(office: InsertOffice): Promise<Office>;
  updateOffice(id: number, data: Partial<Office>): Promise<Office | undefined>;
  updateOfficeStatus(id: number, status: OfficeStatusType, comment?: string): Promise<void>;
  updateOfficeProfile(id: number, data: OfficeUpdateForm): Promise<Office | undefined>;
  
  getBranches(officeId: number): Promise<Branch[]>;
  createBranch(branch: InsertBranch): Promise<Branch>;
  deleteBranchesByOffice(officeId: number): Promise<void>;
  
  getDocument(id: number): Promise<Document | undefined>;
  getDocuments(officeId: number): Promise<Document[]>;
  getDocumentsByRenewal(renewalId: number): Promise<Document[]>;
  createDocument(doc: InsertDocument): Promise<Document>;
  
  getRenewal(id: number): Promise<LicenseRenewal | undefined>;
  getRenewals(officeId: number): Promise<LicenseRenewal[]>;
  getAllRenewals(): Promise<LicenseRenewal[]>;
  getPendingRenewals(): Promise<LicenseRenewal[]>;
  createRenewal(renewal: InsertLicenseRenewal): Promise<LicenseRenewal>;
  updateRenewal(id: number, data: Partial<LicenseRenewal>): Promise<LicenseRenewal | undefined>;
  updateRenewalStatus(id: number, status: RenewalStatusType, comment?: string): Promise<void>;
  updateRenewalMinistryDoc(id: number, path: string): Promise<void>;
  
  getPerson(id: number): Promise<Person | undefined>;
  getPeopleByOffice(officeId: number): Promise<Person[]>;
  getPeopleByRenewal(renewalId: number): Promise<Person[]>;
  getPersonByNationalId(officeId: number, nationalId: string): Promise<Person | undefined>;
  createPerson(person: InsertPerson): Promise<Person>;
  updatePerson(id: number, data: Partial<Person>): Promise<Person | undefined>;
  upsertPersonByNationalId(officeId: number, nationalId: string, data: InsertPerson): Promise<Person>;
  deletePerson(id: number): Promise<void>;
  deletePeopleByRenewal(renewalId: number): Promise<void>;
  
  getRolesInOffice(officeId: number): Promise<RoleInOffice[]>;
  getRolesByRenewal(renewalId: number): Promise<RoleInOffice[]>;
  getRolesByPerson(personId: number): Promise<RoleInOffice[]>;
  createRoleInOffice(role: InsertRoleInOffice): Promise<RoleInOffice>;
  deleteRolesByRenewal(renewalId: number): Promise<void>;
  deleteRolesByPerson(personId: number): Promise<void>;
  
  getConsents(officeId: number): Promise<Consent[]>;
  getConsentsByRenewal(renewalId: number): Promise<Consent[]>;
  createConsent(consent: InsertConsent): Promise<Consent>;
  
  getRenewalAttachments(renewalId: number): Promise<RenewalAttachment[]>;
  getRenewalAttachmentsByCategory(renewalId: number, category: DocumentCategoryType): Promise<RenewalAttachment[]>;
  createRenewalAttachment(attachment: InsertRenewalAttachment): Promise<RenewalAttachment>;
  deleteRenewalAttachment(id: number): Promise<void>;
  
  getStats(): Promise<{
    offices: { total: number; pending: number; active: number; rejected: number };
    renewals: { total: number; pending: number; approved: number; rejected: number };
  }>;
  
  getRenewalKPIs(): Promise<{
    total: number;
    draft: number;
    submitted: number;
    approved: number;
    rejected: number;
    formsCompleted: number;
    attachmentsUploaded: number;
    avgCompletionRate: number;
  }>;
  
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;
  getAuditLogs(limit?: number, offset?: number): Promise<AuditLog[]>;
  getAuditLogsCount(): Promise<number>;
  
  updateUserPassword(userId: number, hashedPassword: string): Promise<void>;
  
  getCommitmentForm(id: number): Promise<CommitmentFormRecord | undefined>;
  getCommitmentFormByOffice(officeId: number, renewalId?: number): Promise<CommitmentFormRecord | undefined>;
  getAllCommitmentForms(): Promise<CommitmentFormRecord[]>;
  createCommitmentForm(form: InsertCommitmentForm): Promise<CommitmentFormRecord>;
  
  getComplaintsByCommitment(commitmentId: number): Promise<Complaint[]>;
  getComplaintsByOffice(officeId: number): Promise<Complaint[]>;
  createComplaint(complaint: InsertComplaint): Promise<Complaint>;
  deleteComplaintsByCommitment(commitmentId: number): Promise<void>;
  
  getOfficeInfoForm(id: number): Promise<OfficeInfoFormRecord | undefined>;
  getOfficeInfoFormByOffice(officeId: number, renewalId?: number): Promise<OfficeInfoFormRecord | undefined>;
  getAllOfficeInfoForms(): Promise<OfficeInfoFormRecord[]>;
  createOfficeInfoForm(form: InsertOfficeInfoForm): Promise<OfficeInfoFormRecord>;
  
  getPayment(id: number): Promise<Payment | undefined>;
  getPaymentByOffice(officeId: number, renewalId?: number): Promise<Payment | undefined>;
  getPaymentsByOffice(officeId: number): Promise<Payment[]>;
  getAllPayments(): Promise<Payment[]>;
  createPayment(payment: InsertPayment): Promise<Payment>;
  updatePayment(id: number, data: Partial<Payment>): Promise<Payment | undefined>;
  updatePaymentStatus(id: number, status: PaymentStatusType, rejectionReason?: string, approvedByUserId?: number): Promise<void>;
  
  getPromoCode(id: number): Promise<PromoCode | undefined>;
  getPromoCodeByCode(code: string): Promise<PromoCode | undefined>;
  getAllPromoCodes(): Promise<PromoCode[]>;
  createPromoCode(promoCode: InsertPromoCode): Promise<PromoCode>;
  updatePromoCode(id: number, data: Partial<PromoCode>): Promise<PromoCode | undefined>;
  incrementPromoCodeUses(id: number): Promise<void>;
  
  // ============================================
  // NEW MODULE METHODS
  // ============================================
  
  // Membership Cards
  getMembershipCard(id: number): Promise<MembershipCard | undefined>;
  getMembershipCardByOffice(officeId: number): Promise<MembershipCard | undefined>;
  getAllMembershipCards(): Promise<MembershipCard[]>;
  createMembershipCard(card: InsertMembershipCard): Promise<MembershipCard>;
  updateMembershipCard(id: number, data: Partial<MembershipCard>): Promise<MembershipCard | undefined>;
  
  // Inspections
  getInspection(id: number): Promise<Inspection | undefined>;
  getInspectionsByOffice(officeId: number): Promise<Inspection[]>;
  getAllInspections(): Promise<Inspection[]>;
  createInspection(inspection: InsertInspection): Promise<Inspection>;
  updateInspection(id: number, data: Partial<Inspection>): Promise<Inspection | undefined>;
  
  // Advocacy Cases
  getAdvocacyCase(id: number): Promise<AdvocacyCase | undefined>;
  getAdvocacyCasesByOffice(officeId: number): Promise<AdvocacyCase[]>;
  getAllAdvocacyCases(): Promise<AdvocacyCase[]>;
  createAdvocacyCase(advocacyCase: InsertAdvocacyCase): Promise<AdvocacyCase>;
  updateAdvocacyCase(id: number, data: Partial<AdvocacyCase>): Promise<AdvocacyCase | undefined>;
  
  // Advocacy Events
  getAdvocacyEventsByCase(caseId: number): Promise<AdvocacyEvent[]>;
  createAdvocacyEvent(event: InsertAdvocacyEvent): Promise<AdvocacyEvent>;
  
  // Oversight Targets
  getOversightTarget(id: number): Promise<OversightTarget | undefined>;
  getAllOversightTargets(): Promise<OversightTarget[]>;
  createOversightTarget(target: InsertOversightTarget): Promise<OversightTarget>;
  updateOversightTarget(id: number, data: Partial<OversightTarget>): Promise<OversightTarget | undefined>;
  
  // Oversight Visits
  getOversightVisitsByTarget(targetId: number): Promise<OversightVisit[]>;
  createOversightVisit(visit: InsertOversightVisit): Promise<OversightVisit>;
  
  // Staff Certifications
  getStaffCertification(id: number): Promise<StaffCertification | undefined>;
  getStaffCertificationsByOffice(officeId: number): Promise<StaffCertification[]>;
  getAllStaffCertifications(): Promise<StaffCertification[]>;
  createStaffCertification(cert: InsertStaffCertification): Promise<StaffCertification>;
  updateStaffCertification(id: number, data: Partial<StaffCertification>): Promise<StaffCertification | undefined>;
  
  // Staff Certification Documents
  getStaffCertDocuments(certificationId: number): Promise<StaffCertDocument[]>;
  createStaffCertDocument(doc: InsertStaffCertDocument): Promise<StaffCertDocument>;
  
  // Compliance Checks
  getComplianceCheck(id: number): Promise<ComplianceCheck | undefined>;
  getComplianceChecksByOffice(officeId: number): Promise<ComplianceCheck[]>;
  getAllComplianceChecks(): Promise<ComplianceCheck[]>;
  createComplianceCheck(check: InsertComplianceCheck): Promise<ComplianceCheck>;
  updateComplianceCheck(id: number, data: Partial<ComplianceCheck>): Promise<ComplianceCheck | undefined>;
  
  // Compliance Actions
  getComplianceActionsByCheck(checkId: number): Promise<ComplianceAction[]>;
  createComplianceAction(action: InsertComplianceAction): Promise<ComplianceAction>;
  
  // Enhanced Complaints
  getEnhancedComplaint(id: number): Promise<EnhancedComplaint | undefined>;
  getEnhancedComplaintsByOffice(officeId: number): Promise<EnhancedComplaint[]>;
  getAllEnhancedComplaints(): Promise<EnhancedComplaint[]>;
  createEnhancedComplaint(complaint: InsertEnhancedComplaint): Promise<EnhancedComplaint>;
  updateEnhancedComplaint(id: number, data: Partial<EnhancedComplaint>): Promise<EnhancedComplaint | undefined>;
  
  // Complaint Updates
  getComplaintUpdatesByComplaint(complaintId: number): Promise<ComplaintUpdate[]>;
  createComplaintUpdate(update: InsertComplaintUpdate): Promise<ComplaintUpdate>;
  
  seedAdminUser(): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async seedAdminUser(): Promise<void> {
    const existingAdmin = await this.getUserByEmail("atallaabutaha@gmail.com");
    if (!existingAdmin) {
      const passwordHash = await bcrypt.hash("Admin123", 10);
      await this.createUser({
        email: "atallaabutaha@gmail.com",
        passwordHash,
        role: "ADMIN",
        officeId: null,
      });
      console.log("Admin user seeded: atallaabutaha@gmail.com / Admin123");
    }
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(
      sql`LOWER(${users.email}) = LOWER(${email})`
    );
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUserOfficeId(userId: number, officeId: number): Promise<void> {
    await db.update(users).set({ officeId }).where(eq(users.id, userId));
  }

  async getOffice(id: number): Promise<Office | undefined> {
    const [office] = await db.select().from(offices).where(eq(offices.id, id));
    return office;
  }

  async getAllOffices(): Promise<Office[]> {
    return await db.select().from(offices).orderBy(desc(offices.createdAt));
  }

  async getOfficesByStatus(status: OfficeStatusType): Promise<Office[]> {
    return await db.select().from(offices)
      .where(eq(offices.status, status))
      .orderBy(desc(offices.createdAt));
  }

  async createOffice(insertOffice: InsertOffice): Promise<Office> {
    const [office] = await db.insert(offices).values({
      ...insertOffice,
      status: "PENDING_APPROVAL"
    }).returning();
    return office;
  }

  async updateOfficeStatus(id: number, status: OfficeStatusType, comment?: string): Promise<void> {
    const updates: Partial<Office> = { status };
    if (comment !== undefined) {
      updates.adminComment = comment;
    }
    await db.update(offices).set(updates).where(eq(offices.id, id));
  }

  async updateOfficeProfile(id: number, data: OfficeUpdateForm): Promise<Office | undefined> {
    const [office] = await db.update(offices).set(data).where(eq(offices.id, id)).returning();
    return office;
  }

  async updateOffice(id: number, data: Partial<Office>): Promise<Office | undefined> {
    const [office] = await db.update(offices).set({ ...data, updatedAt: new Date() }).where(eq(offices.id, id)).returning();
    return office;
  }

  async getBranches(officeId: number): Promise<Branch[]> {
    return await db.select().from(branches).where(eq(branches.officeId, officeId));
  }

  async createBranch(insertBranch: InsertBranch): Promise<Branch> {
    const [branch] = await db.insert(branches).values(insertBranch).returning();
    return branch;
  }

  async deleteBranchesByOffice(officeId: number): Promise<void> {
    await db.delete(branches).where(eq(branches.officeId, officeId));
  }

  async getDocument(id: number): Promise<Document | undefined> {
    const [doc] = await db.select().from(documents).where(eq(documents.id, id));
    return doc;
  }

  async getDocuments(officeId: number): Promise<Document[]> {
    return await db.select().from(documents)
      .where(eq(documents.officeId, officeId))
      .orderBy(desc(documents.uploadedAt));
  }

  async getDocumentsByRenewal(renewalId: number): Promise<Document[]> {
    return await db.select().from(documents).where(eq(documents.renewalId, renewalId));
  }

  async createDocument(insertDoc: InsertDocument): Promise<Document> {
    const [doc] = await db.insert(documents).values(insertDoc as any).returning();
    return doc;
  }

  async getRenewal(id: number): Promise<LicenseRenewal | undefined> {
    const [renewal] = await db.select().from(licenseRenewals).where(eq(licenseRenewals.id, id));
    return renewal;
  }

  async getRenewals(officeId: number): Promise<LicenseRenewal[]> {
    return await db.select().from(licenseRenewals)
      .where(eq(licenseRenewals.officeId, officeId))
      .orderBy(desc(licenseRenewals.createdAt));
  }

  async getAllRenewals(): Promise<LicenseRenewal[]> {
    return await db.select().from(licenseRenewals).orderBy(desc(licenseRenewals.createdAt));
  }

  async getPendingRenewals(): Promise<LicenseRenewal[]> {
    return await db.select().from(licenseRenewals)
      .where(inArray(licenseRenewals.status, ["SUBMITTED", "UNDER_REVIEW", "MINISTRY_DOC_UPLOADED"]))
      .orderBy(desc(licenseRenewals.createdAt));
  }

  async createRenewal(insertRenewal: InsertLicenseRenewal): Promise<LicenseRenewal> {
    const [renewal] = await db.insert(licenseRenewals).values({
      ...insertRenewal,
      status: "SUBMITTED"
    }).returning();
    return renewal;
  }

  async updateRenewalStatus(id: number, status: RenewalStatusType, comment?: string): Promise<void> {
    const updates: Partial<LicenseRenewal> = { status, updatedAt: new Date() };
    if (comment !== undefined) {
      updates.adminComment = comment;
    }
    await db.update(licenseRenewals).set(updates).where(eq(licenseRenewals.id, id));
  }

  async updateRenewalMinistryDoc(id: number, path: string): Promise<void> {
    await db.update(licenseRenewals).set({
      ministryDocumentPath: path,
      status: "MINISTRY_DOC_UPLOADED",
      updatedAt: new Date()
    }).where(eq(licenseRenewals.id, id));
  }

  async updateRenewal(id: number, data: Partial<LicenseRenewal>): Promise<LicenseRenewal | undefined> {
    const [renewal] = await db.update(licenseRenewals).set({ ...data, updatedAt: new Date() }).where(eq(licenseRenewals.id, id)).returning();
    return renewal;
  }

  async getPerson(id: number): Promise<Person | undefined> {
    const [person] = await db.select().from(people).where(eq(people.id, id));
    return person;
  }

  async getPeopleByOffice(officeId: number): Promise<Person[]> {
    return await db.select().from(people).where(eq(people.officeId, officeId)).orderBy(desc(people.createdAt));
  }

  async getPeopleByRenewal(renewalId: number): Promise<Person[]> {
    return await db.select().from(people).where(eq(people.renewalId, renewalId)).orderBy(desc(people.createdAt));
  }

  async getPersonByNationalId(officeId: number, nationalId: string): Promise<Person | undefined> {
    const [person] = await db.select().from(people)
      .where(and(eq(people.officeId, officeId), eq(people.nationalId, nationalId)));
    return person;
  }

  async createPerson(insertPerson: InsertPerson): Promise<Person> {
    const [person] = await db.insert(people).values(insertPerson).returning();
    return person;
  }

  async updatePerson(id: number, data: Partial<Person>): Promise<Person | undefined> {
    const [person] = await db.update(people).set({ ...data, updatedAt: new Date() }).where(eq(people.id, id)).returning();
    return person;
  }

  async upsertPersonByNationalId(officeId: number, nationalId: string, data: InsertPerson): Promise<Person> {
    const existing = await this.getPersonByNationalId(officeId, nationalId);
    if (existing) {
      const [updated] = await db.update(people)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(people.id, existing.id))
        .returning();
      return updated;
    }
    return this.createPerson(data);
  }

  async deletePerson(id: number): Promise<void> {
    await db.delete(people).where(eq(people.id, id));
  }

  async deletePeopleByRenewal(renewalId: number): Promise<void> {
    await db.delete(people).where(eq(people.renewalId, renewalId));
  }

  async getRolesInOffice(officeId: number): Promise<RoleInOffice[]> {
    return await db.select().from(rolesInOffice).where(eq(rolesInOffice.officeId, officeId));
  }

  async getRolesByRenewal(renewalId: number): Promise<RoleInOffice[]> {
    return await db.select().from(rolesInOffice).where(eq(rolesInOffice.renewalId, renewalId));
  }

  async getRolesByPerson(personId: number): Promise<RoleInOffice[]> {
    return await db.select().from(rolesInOffice).where(eq(rolesInOffice.personId, personId));
  }

  async createRoleInOffice(insertRole: InsertRoleInOffice): Promise<RoleInOffice> {
    const [role] = await db.insert(rolesInOffice).values(insertRole).returning();
    return role;
  }

  async deleteRolesByRenewal(renewalId: number): Promise<void> {
    await db.delete(rolesInOffice).where(eq(rolesInOffice.renewalId, renewalId));
  }

  async deleteRolesByPerson(personId: number): Promise<void> {
    await db.delete(rolesInOffice).where(eq(rolesInOffice.personId, personId));
  }

  async getConsents(officeId: number): Promise<Consent[]> {
    return await db.select().from(consents).where(eq(consents.officeId, officeId)).orderBy(desc(consents.acceptedAt));
  }

  async getConsentsByRenewal(renewalId: number): Promise<Consent[]> {
    return await db.select().from(consents).where(eq(consents.renewalId, renewalId));
  }

  async createConsent(insertConsent: InsertConsent): Promise<Consent> {
    const [consent] = await db.insert(consents).values(insertConsent).returning();
    return consent;
  }

  async getRenewalAttachments(renewalId: number): Promise<RenewalAttachment[]> {
    return await db.select().from(renewalAttachments).where(eq(renewalAttachments.renewalId, renewalId)).orderBy(desc(renewalAttachments.createdAt));
  }

  async getRenewalAttachmentsByCategory(renewalId: number, category: DocumentCategoryType): Promise<RenewalAttachment[]> {
    return await db.select().from(renewalAttachments)
      .where(and(eq(renewalAttachments.renewalId, renewalId), eq(renewalAttachments.category, category)))
      .orderBy(desc(renewalAttachments.createdAt));
  }

  async createRenewalAttachment(insertAttachment: InsertRenewalAttachment): Promise<RenewalAttachment> {
    const [attachment] = await db.insert(renewalAttachments).values(insertAttachment as any).returning();
    return attachment;
  }

  async deleteRenewalAttachment(id: number): Promise<void> {
    await db.delete(renewalAttachments).where(eq(renewalAttachments.id, id));
  }

  async getStats(): Promise<{
    offices: { total: number; pending: number; active: number; rejected: number };
    renewals: { total: number; pending: number; approved: number; rejected: number };
  }> {
    const officesArray = await this.getAllOffices();
    const renewalsArray = await this.getAllRenewals();

    return {
      offices: {
        total: officesArray.length,
        pending: officesArray.filter((o) => o.status === "PENDING_APPROVAL").length,
        active: officesArray.filter((o) => o.status === "ACTIVE").length,
        rejected: officesArray.filter((o) => o.status === "REJECTED").length,
      },
      renewals: {
        total: renewalsArray.length,
        pending: renewalsArray.filter((r) => 
          ["SUBMITTED", "UNDER_REVIEW", "APPROVED_FOR_DOWNLOAD", "MINISTRY_DOC_UPLOADED"].includes(r.status)
        ).length,
        approved: renewalsArray.filter((r) => r.status === "FINAL_APPROVED").length,
        rejected: renewalsArray.filter((r) => r.status === "REJECTED").length,
      },
    };
  }

  async getRenewalKPIs(): Promise<{
    total: number;
    draft: number;
    submitted: number;
    approved: number;
    rejected: number;
    formsCompleted: number;
    attachmentsUploaded: number;
    avgCompletionRate: number;
  }> {
    const renewalsArray = await this.getAllRenewals();
    const renewals2026 = renewalsArray.filter(r => r.year === 2026);
    
    const total = renewals2026.length;
    const draft = renewals2026.filter(r => r.status === "DRAFT").length;
    const submitted = renewals2026.filter(r => 
      ["SUBMITTED", "UNDER_REVIEW", "APPROVED_FOR_DOWNLOAD", "MINISTRY_DOC_UPLOADED"].includes(r.status)
    ).length;
    const approved = renewals2026.filter(r => r.status === "FINAL_APPROVED").length;
    const rejected = renewals2026.filter(r => r.status === "REJECTED").length;
    
    let formsCompleted = 0;
    let totalCompletionRate = 0;
    for (const renewal of renewals2026) {
      const officeForm = renewal.officeFormCompleted ? 1 : 0;
      const staffForm = renewal.staffFormCompleted ? 1 : 0;
      const commitmentForm = renewal.commitmentFormCompleted ? 1 : 0;
      formsCompleted += officeForm + staffForm + commitmentForm;
      totalCompletionRate += ((officeForm + staffForm + commitmentForm) / 3) * 100;
    }
    
    const avgCompletionRate = total > 0 ? Math.round(totalCompletionRate / total) : 0;
    
    const attachmentsArray = await db.select().from(renewalAttachments);
    const attachments2026 = attachmentsArray.filter(a => 
      renewals2026.some(r => r.id === a.renewalId)
    );
    const attachmentsUploaded = attachments2026.length;
    
    return { total, draft, submitted, approved, rejected, formsCompleted, attachmentsUploaded, avgCompletionRate };
  }

  async createAuditLog(insertLog: InsertAuditLog): Promise<AuditLog> {
    const [log] = await db.insert(auditLogs).values(insertLog as any).returning();
    return log;
  }

  async getAuditLogs(limit: number = 50, offset: number = 0): Promise<AuditLog[]> {
    return await db.select().from(auditLogs)
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit)
      .offset(offset);
  }

  async getAuditLogsCount(): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` }).from(auditLogs);
    return Number(result[0]?.count || 0);
  }

  async updateUserPassword(userId: number, hashedPassword: string): Promise<void> {
    await db.update(users).set({ passwordHash: hashedPassword }).where(eq(users.id, userId));
  }

  async getCommitmentForm(id: number): Promise<CommitmentFormRecord | undefined> {
    const [form] = await db.select().from(commitmentForms).where(eq(commitmentForms.id, id));
    return form;
  }

  async getCommitmentFormByOffice(officeId: number, renewalId?: number): Promise<CommitmentFormRecord | undefined> {
    if (renewalId) {
      const [form] = await db.select().from(commitmentForms)
        .where(and(eq(commitmentForms.officeId, officeId), eq(commitmentForms.renewalId, renewalId)));
      return form;
    }
    const [form] = await db.select().from(commitmentForms)
      .where(eq(commitmentForms.officeId, officeId))
      .orderBy(desc(commitmentForms.createdAt));
    return form;
  }

  async getAllCommitmentForms(): Promise<CommitmentFormRecord[]> {
    return await db.select().from(commitmentForms).orderBy(desc(commitmentForms.createdAt));
  }

  async createCommitmentForm(form: InsertCommitmentForm): Promise<CommitmentFormRecord> {
    const [created] = await db.insert(commitmentForms).values(form).returning();
    return created;
  }

  async getComplaintsByCommitment(commitmentId: number): Promise<Complaint[]> {
    return await db.select().from(complaints).where(eq(complaints.commitmentId, commitmentId));
  }

  async getComplaintsByOffice(officeId: number): Promise<Complaint[]> {
    return await db.select().from(complaints).where(eq(complaints.officeId, officeId)).orderBy(desc(complaints.createdAt));
  }

  async createComplaint(complaint: InsertComplaint): Promise<Complaint> {
    const [created] = await db.insert(complaints).values(complaint as any).returning();
    return created;
  }

  async deleteComplaintsByCommitment(commitmentId: number): Promise<void> {
    await db.delete(complaints).where(eq(complaints.commitmentId, commitmentId));
  }

  async getOfficeInfoForm(id: number): Promise<OfficeInfoFormRecord | undefined> {
    const [form] = await db.select().from(officeInfoForms).where(eq(officeInfoForms.id, id));
    return form;
  }

  async getOfficeInfoFormByOffice(officeId: number, renewalId?: number): Promise<OfficeInfoFormRecord | undefined> {
    if (renewalId) {
      const [form] = await db.select().from(officeInfoForms)
        .where(and(eq(officeInfoForms.officeId, officeId), eq(officeInfoForms.renewalId, renewalId)));
      return form;
    }
    const [form] = await db.select().from(officeInfoForms)
      .where(eq(officeInfoForms.officeId, officeId))
      .orderBy(desc(officeInfoForms.createdAt));
    return form;
  }

  async getAllOfficeInfoForms(): Promise<OfficeInfoFormRecord[]> {
    return await db.select().from(officeInfoForms).orderBy(desc(officeInfoForms.createdAt));
  }

  async createOfficeInfoForm(form: InsertOfficeInfoForm): Promise<OfficeInfoFormRecord> {
    const [created] = await db.insert(officeInfoForms).values(form).returning();
    return created;
  }

  async getPayment(id: number): Promise<Payment | undefined> {
    const [payment] = await db.select().from(payments).where(eq(payments.id, id));
    return payment;
  }

  async getPaymentByOffice(officeId: number, renewalId?: number): Promise<Payment | undefined> {
    if (renewalId) {
      const [payment] = await db.select().from(payments)
        .where(and(eq(payments.officeId, officeId), eq(payments.renewalId, renewalId)));
      return payment;
    }
    const [payment] = await db.select().from(payments)
      .where(eq(payments.officeId, officeId))
      .orderBy(desc(payments.createdAt));
    return payment;
  }

  async getPaymentsByOffice(officeId: number): Promise<Payment[]> {
    return await db.select().from(payments)
      .where(eq(payments.officeId, officeId))
      .orderBy(desc(payments.createdAt));
  }

  async getAllPayments(): Promise<Payment[]> {
    return await db.select().from(payments).orderBy(desc(payments.createdAt));
  }

  async createPayment(payment: InsertPayment): Promise<Payment> {
    const [created] = await db.insert(payments).values(payment as any).returning();
    return created;
  }

  async updatePayment(id: number, data: Partial<Payment>): Promise<Payment | undefined> {
    const [updated] = await db.update(payments)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(payments.id, id))
      .returning();
    return updated;
  }

  async updatePaymentStatus(id: number, status: PaymentStatusType, rejectionReason?: string, approvedByUserId?: number): Promise<void> {
    const updates: Partial<Payment> = { 
      status, 
      updatedAt: new Date() 
    };
    if (rejectionReason !== undefined) {
      updates.rejectionReason = rejectionReason;
    }
    if (approvedByUserId !== undefined) {
      updates.approvedByUserId = approvedByUserId;
      updates.approvedAt = new Date();
    }
    await db.update(payments).set(updates).where(eq(payments.id, id));
  }

  async getPromoCode(id: number): Promise<PromoCode | undefined> {
    const [promoCode] = await db.select().from(promoCodes).where(eq(promoCodes.id, id));
    return promoCode;
  }

  async getPromoCodeByCode(code: string): Promise<PromoCode | undefined> {
    const [promoCode] = await db.select().from(promoCodes)
      .where(sql`UPPER(${promoCodes.code}) = UPPER(${code})`);
    return promoCode;
  }

  async getAllPromoCodes(): Promise<PromoCode[]> {
    return await db.select().from(promoCodes).orderBy(desc(promoCodes.createdAt));
  }

  async createPromoCode(promoCode: InsertPromoCode): Promise<PromoCode> {
    const [created] = await db.insert(promoCodes).values(promoCode as any).returning();
    return created;
  }

  async updatePromoCode(id: number, data: Partial<PromoCode>): Promise<PromoCode | undefined> {
    const [updated] = await db.update(promoCodes)
      .set(data)
      .where(eq(promoCodes.id, id))
      .returning();
    return updated;
  }

  async incrementPromoCodeUses(id: number): Promise<void> {
    await db.update(promoCodes)
      .set({ currentUses: sql`${promoCodes.currentUses} + 1` })
      .where(eq(promoCodes.id, id));
  }

  // ============================================
  // NEW MODULE IMPLEMENTATIONS
  // ============================================

  // Membership Cards
  async getMembershipCard(id: number): Promise<MembershipCard | undefined> {
    const [card] = await db.select().from(membershipCards).where(eq(membershipCards.id, id));
    return card;
  }

  async getMembershipCardByOffice(officeId: number): Promise<MembershipCard | undefined> {
    const [card] = await db.select().from(membershipCards)
      .where(eq(membershipCards.officeId, officeId))
      .orderBy(desc(membershipCards.createdAt));
    return card;
  }

  async getAllMembershipCards(): Promise<MembershipCard[]> {
    return await db.select().from(membershipCards).orderBy(desc(membershipCards.createdAt));
  }

  async createMembershipCard(card: InsertMembershipCard): Promise<MembershipCard> {
    const [created] = await db.insert(membershipCards).values(card as any).returning();
    return created;
  }

  async updateMembershipCard(id: number, data: Partial<MembershipCard>): Promise<MembershipCard | undefined> {
    const [updated] = await db.update(membershipCards)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(membershipCards.id, id))
      .returning();
    return updated;
  }

  // Inspections
  async getInspection(id: number): Promise<Inspection | undefined> {
    const [inspection] = await db.select().from(inspections).where(eq(inspections.id, id));
    return inspection;
  }

  async getInspectionsByOffice(officeId: number): Promise<Inspection[]> {
    return await db.select().from(inspections)
      .where(eq(inspections.officeId, officeId))
      .orderBy(desc(inspections.createdAt));
  }

  async getAllInspections(): Promise<Inspection[]> {
    return await db.select().from(inspections).orderBy(desc(inspections.createdAt));
  }

  async createInspection(inspection: InsertInspection): Promise<Inspection> {
    const [created] = await db.insert(inspections).values(inspection as any).returning();
    return created;
  }

  async updateInspection(id: number, data: Partial<Inspection>): Promise<Inspection | undefined> {
    const [updated] = await db.update(inspections)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(inspections.id, id))
      .returning();
    return updated;
  }

  // Advocacy Cases
  async getAdvocacyCase(id: number): Promise<AdvocacyCase | undefined> {
    const [advocacyCase] = await db.select().from(advocacyCases).where(eq(advocacyCases.id, id));
    return advocacyCase;
  }

  async getAdvocacyCasesByOffice(officeId: number): Promise<AdvocacyCase[]> {
    return await db.select().from(advocacyCases)
      .where(eq(advocacyCases.officeId, officeId))
      .orderBy(desc(advocacyCases.createdAt));
  }

  async getAllAdvocacyCases(): Promise<AdvocacyCase[]> {
    return await db.select().from(advocacyCases).orderBy(desc(advocacyCases.createdAt));
  }

  async createAdvocacyCase(advocacyCase: InsertAdvocacyCase): Promise<AdvocacyCase> {
    const [created] = await db.insert(advocacyCases).values(advocacyCase as any).returning();
    return created;
  }

  async updateAdvocacyCase(id: number, data: Partial<AdvocacyCase>): Promise<AdvocacyCase | undefined> {
    const [updated] = await db.update(advocacyCases)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(advocacyCases.id, id))
      .returning();
    return updated;
  }

  // Advocacy Events
  async getAdvocacyEventsByCase(caseId: number): Promise<AdvocacyEvent[]> {
    return await db.select().from(advocacyEvents)
      .where(eq(advocacyEvents.caseId, caseId))
      .orderBy(desc(advocacyEvents.createdAt));
  }

  async createAdvocacyEvent(event: InsertAdvocacyEvent): Promise<AdvocacyEvent> {
    const [created] = await db.insert(advocacyEvents).values(event as any).returning();
    return created;
  }

  // Oversight Targets
  async getOversightTarget(id: number): Promise<OversightTarget | undefined> {
    const [target] = await db.select().from(oversightTargets).where(eq(oversightTargets.id, id));
    return target;
  }

  async getAllOversightTargets(): Promise<OversightTarget[]> {
    return await db.select().from(oversightTargets).orderBy(desc(oversightTargets.createdAt));
  }

  async createOversightTarget(target: InsertOversightTarget): Promise<OversightTarget> {
    const [created] = await db.insert(oversightTargets).values(target as any).returning();
    return created;
  }

  async updateOversightTarget(id: number, data: Partial<OversightTarget>): Promise<OversightTarget | undefined> {
    const [updated] = await db.update(oversightTargets)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(oversightTargets.id, id))
      .returning();
    return updated;
  }

  // Oversight Visits
  async getOversightVisitsByTarget(targetId: number): Promise<OversightVisit[]> {
    return await db.select().from(oversightVisits)
      .where(eq(oversightVisits.targetId, targetId))
      .orderBy(desc(oversightVisits.createdAt));
  }

  async createOversightVisit(visit: InsertOversightVisit): Promise<OversightVisit> {
    const [created] = await db.insert(oversightVisits).values(visit as any).returning();
    return created;
  }

  // Staff Certifications
  async getStaffCertification(id: number): Promise<StaffCertification | undefined> {
    const [cert] = await db.select().from(staffCertifications).where(eq(staffCertifications.id, id));
    return cert;
  }

  async getStaffCertificationsByOffice(officeId: number): Promise<StaffCertification[]> {
    return await db.select().from(staffCertifications)
      .where(eq(staffCertifications.officeId, officeId))
      .orderBy(desc(staffCertifications.createdAt));
  }

  async getAllStaffCertifications(): Promise<StaffCertification[]> {
    return await db.select().from(staffCertifications).orderBy(desc(staffCertifications.createdAt));
  }

  async createStaffCertification(cert: InsertStaffCertification): Promise<StaffCertification> {
    const [created] = await db.insert(staffCertifications).values(cert as any).returning();
    return created;
  }

  async updateStaffCertification(id: number, data: Partial<StaffCertification>): Promise<StaffCertification | undefined> {
    const [updated] = await db.update(staffCertifications)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(staffCertifications.id, id))
      .returning();
    return updated;
  }

  // Staff Certification Documents
  async getStaffCertDocuments(certificationId: number): Promise<StaffCertDocument[]> {
    return await db.select().from(staffCertDocuments)
      .where(eq(staffCertDocuments.certificationId, certificationId))
      .orderBy(desc(staffCertDocuments.uploadedAt));
  }

  async createStaffCertDocument(doc: InsertStaffCertDocument): Promise<StaffCertDocument> {
    const [created] = await db.insert(staffCertDocuments).values(doc as any).returning();
    return created;
  }

  // Compliance Checks
  async getComplianceCheck(id: number): Promise<ComplianceCheck | undefined> {
    const [check] = await db.select().from(complianceChecks).where(eq(complianceChecks.id, id));
    return check;
  }

  async getComplianceChecksByOffice(officeId: number): Promise<ComplianceCheck[]> {
    return await db.select().from(complianceChecks)
      .where(eq(complianceChecks.officeId, officeId))
      .orderBy(desc(complianceChecks.createdAt));
  }

  async getAllComplianceChecks(): Promise<ComplianceCheck[]> {
    return await db.select().from(complianceChecks).orderBy(desc(complianceChecks.createdAt));
  }

  async createComplianceCheck(check: InsertComplianceCheck): Promise<ComplianceCheck> {
    const [created] = await db.insert(complianceChecks).values(check as any).returning();
    return created;
  }

  async updateComplianceCheck(id: number, data: Partial<ComplianceCheck>): Promise<ComplianceCheck | undefined> {
    const [updated] = await db.update(complianceChecks)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(complianceChecks.id, id))
      .returning();
    return updated;
  }

  // Compliance Actions
  async getComplianceActionsByCheck(checkId: number): Promise<ComplianceAction[]> {
    return await db.select().from(complianceActions)
      .where(eq(complianceActions.checkId, checkId))
      .orderBy(desc(complianceActions.createdAt));
  }

  async createComplianceAction(action: InsertComplianceAction): Promise<ComplianceAction> {
    const [created] = await db.insert(complianceActions).values(action as any).returning();
    return created;
  }

  // Enhanced Complaints
  async getEnhancedComplaint(id: number): Promise<EnhancedComplaint | undefined> {
    const [complaint] = await db.select().from(enhancedComplaints).where(eq(enhancedComplaints.id, id));
    return complaint;
  }

  async getEnhancedComplaintsByOffice(officeId: number): Promise<EnhancedComplaint[]> {
    return await db.select().from(enhancedComplaints)
      .where(eq(enhancedComplaints.officeId, officeId))
      .orderBy(desc(enhancedComplaints.createdAt));
  }

  async getAllEnhancedComplaints(): Promise<EnhancedComplaint[]> {
    return await db.select().from(enhancedComplaints).orderBy(desc(enhancedComplaints.createdAt));
  }

  async createEnhancedComplaint(complaint: InsertEnhancedComplaint): Promise<EnhancedComplaint> {
    const [created] = await db.insert(enhancedComplaints).values(complaint as any).returning();
    return created;
  }

  async updateEnhancedComplaint(id: number, data: Partial<EnhancedComplaint>): Promise<EnhancedComplaint | undefined> {
    const [updated] = await db.update(enhancedComplaints)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(enhancedComplaints.id, id))
      .returning();
    return updated;
  }

  // Complaint Updates
  async getComplaintUpdatesByComplaint(complaintId: number): Promise<ComplaintUpdate[]> {
    return await db.select().from(complaintUpdates)
      .where(eq(complaintUpdates.complaintId, complaintId))
      .orderBy(desc(complaintUpdates.createdAt));
  }

  async createComplaintUpdate(update: InsertComplaintUpdate): Promise<ComplaintUpdate> {
    const [created] = await db.insert(complaintUpdates).values(update as any).returning();
    return created;
  }
}

export const storage = new DatabaseStorage();
