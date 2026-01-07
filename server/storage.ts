import { 
  users, offices, branches, documents, licenseRenewals, auditLogs,
  people, rolesInOffice, consents, renewalAttachments, employeeWorkHistory,
  complaints, commitmentForms, officeInfoForms, payments, promoCodes, jobTitles,
  renewalSteps, renewalInvites, inspections, cities,
  type EmployeeWorkHistory,
  type RenewalInvite,
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
  type RenewalStep, type InsertRenewalStep,
  type Inspection, type InsertInspection, type InspectionStatusType,
  type OfficeStatusType, type RenewalStatusType, type PersonRoleTypeType,
  type OfficeUpdateForm, type DocumentCategoryType,
  type City,
  type ChangeRequest, type InsertChangeRequest, type ChangeRequestStatusType,
  changeRequests
} from "@shared/schema";
import { drizzle } from "drizzle-orm/node-postgres";
import pkg from "pg";
const { Pool } = pkg;
import { eq, desc, inArray, sql, and, gte, lte, count, avg } from "drizzle-orm";
import bcrypt from "bcryptjs";

export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 30000,
  idleTimeoutMillis: 30000,
  max: 10
});
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
  
  getCities(): Promise<City[]>;
  getCity(id: number): Promise<City | undefined>;
  
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
  
  getEmployeesByOffice(officeId: number): Promise<{ person: Person; workHistory: EmployeeWorkHistory[] }[]>;
  getWorkHistoryByOffice(officeId: number): Promise<EmployeeWorkHistory[]>;
  
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
  
  getStaffAnalytics(): Promise<{
    totalStaff: number;
    linkedToOffices: number;
    workHistoryRecords: number;
    byGender: { name: string; value: number }[];
    byJobTitle: { name: string; value: number }[];
    byNationality: { name: string; value: number }[];
    byOffice: { name: string; value: number }[];
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
  updateOfficeInfoForm(id: number, data: Partial<OfficeInfoFormRecord>): Promise<OfficeInfoFormRecord | undefined>;
  
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
  
  getUserByOfficeId(officeId: number): Promise<User | undefined>;
  updateUser(id: number, data: Partial<User>): Promise<User | undefined>;
  
  getLicenseRenewal(id: number): Promise<LicenseRenewal | undefined>;
  updateLicenseRenewal(id: number, data: Partial<LicenseRenewal>): Promise<LicenseRenewal | undefined>;
  createLicenseRenewal(renewal: InsertLicenseRenewal): Promise<LicenseRenewal>;
  getRenewalByOfficeAndYear(officeId: number, year: number): Promise<LicenseRenewal | undefined>;
  
  createRenewalStep(step: InsertRenewalStep): Promise<RenewalStep>;
  getRenewalStepsByRenewalId(renewalId: number): Promise<RenewalStep[]>;
  getRenewalStepsByOfficeId(officeId: number): Promise<RenewalStep[]>;
  
  getActiveOfficesForRenewal(lastRenewalYear: number): Promise<Office[]>;
  getLatestInviteForRenewal(renewalId: number): Promise<RenewalInvite | undefined>;
  
  getInspection(id: number): Promise<Inspection | undefined>;
  getInspectionsByOffice(officeId: number): Promise<Inspection[]>;
  getAllInspections(): Promise<Inspection[]>;
  createInspection(inspection: InsertInspection): Promise<Inspection>;
  updateInspection(id: number, data: Partial<Inspection>): Promise<Inspection | undefined>;
  updateInspectionStatus(id: number, status: InspectionStatusType): Promise<void>;
  
  getChangeRequest(id: number): Promise<ChangeRequest | undefined>;
  getChangeRequestsByOffice(officeId: number): Promise<ChangeRequest[]>;
  getChangeRequestsByStatus(status: ChangeRequestStatusType): Promise<ChangeRequest[]>;
  getPendingChangeRequests(): Promise<ChangeRequest[]>;
  createChangeRequest(request: InsertChangeRequest): Promise<ChangeRequest>;
  updateChangeRequest(id: number, data: Partial<ChangeRequest>): Promise<ChangeRequest | undefined>;
  submitChangeRequest(id: number, submittedBy: number): Promise<ChangeRequest | undefined>;
  approveChangeRequest(id: number, reviewedBy: number, note?: string): Promise<ChangeRequest | undefined>;
  rejectChangeRequest(id: number, reviewedBy: number, note?: string): Promise<ChangeRequest | undefined>;
  
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

  async getCities(): Promise<City[]> {
    return await db.select().from(cities).orderBy(cities.id);
  }

  async getCity(id: number): Promise<City | undefined> {
    const [city] = await db.select().from(cities).where(eq(cities.id, id));
    return city;
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

  async getWorkHistoryByOffice(officeId: number): Promise<EmployeeWorkHistory[]> {
    return await db.select().from(employeeWorkHistory).where(eq(employeeWorkHistory.officeId, officeId));
  }

  async getEmployeesByOffice(officeId: number): Promise<{ person: Person; workHistory: EmployeeWorkHistory[] }[]> {
    const workHistory = await this.getWorkHistoryByOffice(officeId);
    const personIds = Array.from(new Set(workHistory.map(wh => wh.personId)));
    
    if (personIds.length === 0) {
      return [];
    }
    
    const employees = await db.select().from(people).where(inArray(people.id, personIds));
    
    return employees.map(person => ({
      person,
      workHistory: workHistory.filter(wh => wh.personId === person.id)
    }));
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
        // Active offices = those with last renewal in 2025
        active: officesArray.filter((o) => o.lastRenewalYear === 2025).length,
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

  async getStaffAnalytics(): Promise<{
    totalStaff: number;
    linkedToOffices: number;
    workHistoryRecords: number;
    byGender: { name: string; value: number }[];
    byJobTitle: { name: string; value: number }[];
    byNationality: { name: string; value: number }[];
    byOffice: { name: string; value: number }[];
  }> {
    const allPeople = await db.select().from(people);
    const allWorkHistory = await db.select({
      personId: employeeWorkHistory.personId,
      officeId: employeeWorkHistory.officeId,
      jobTitle: employeeWorkHistory.jobTitle
    }).from(employeeWorkHistory);
    
    const allOffices = await this.getAllOffices();
    
    // Filter to active offices only (lastRenewalYear = 2025)
    const activeOffices = allOffices.filter(o => o.lastRenewalYear === 2025);
    const activeOfficeIds = new Set(activeOffices.map(o => o.id));
    const officeMap = new Map(activeOffices.map(o => [o.id, o.tradeNameAr || o.tradeNameEn || `Office #${o.id}`]));
    
    // Filter work history to only active offices
    const activeWorkHistory = allWorkHistory.filter(wh => activeOfficeIds.has(wh.officeId));
    
    // Get person IDs linked to active offices
    const activePersonIds = new Set(activeWorkHistory.map(wh => wh.personId));
    
    // Filter people to only those linked to active offices
    const activePeople = allPeople.filter(p => activePersonIds.has(p.id));
    
    // Load job titles lookup table (legacy_id -> name)
    const allJobTitles = await db.select().from(jobTitles);
    const jobTitleMap = new Map<string, string>();
    for (const jt of allJobTitles) {
      if (jt.legacyId) {
        jobTitleMap.set(String(jt.legacyId), jt.nameAr || jt.name || `Job #${jt.legacyId}`);
      }
    }
    
    // Gender distribution (from active people only)
    const genderBreakdown: Record<string, number> = {};
    for (const person of activePeople) {
      const gender = person.gender || 'غير محدد';
      genderBreakdown[gender] = (genderBreakdown[gender] || 0) + 1;
    }
    
    // Job title distribution - from active work history records
    const jobTitleBreakdown: Record<string, number> = {};
    for (const wh of activeWorkHistory) {
      if (wh.jobTitle) {
        const jobTitleId = String(wh.jobTitle);
        const titleName = jobTitleMap.get(jobTitleId) || `Job #${jobTitleId}`;
        jobTitleBreakdown[titleName] = (jobTitleBreakdown[titleName] || 0) + 1;
      }
    }
    
    // Nationality distribution (from active people only)
    const nationalityBreakdown: Record<string, number> = {};
    for (const person of activePeople) {
      const nationality = person.nationality || 'غير محدد';
      nationalityBreakdown[nationality] = (nationalityBreakdown[nationality] || 0) + 1;
    }
    
    // Distinct employees per active office
    const officeEmployees: Record<number, Set<number>> = {};
    for (const wh of activeWorkHistory) {
      if (!officeEmployees[wh.officeId]) {
        officeEmployees[wh.officeId] = new Set();
      }
      officeEmployees[wh.officeId].add(wh.personId);
    }
    
    return {
      totalStaff: activePeople.length,
      linkedToOffices: activePersonIds.size,
      workHistoryRecords: activeWorkHistory.length,
      byGender: Object.entries(genderBreakdown)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value),
      byJobTitle: Object.entries(jobTitleBreakdown)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 10),
      byNationality: Object.entries(nationalityBreakdown)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 8),
      byOffice: Object.entries(officeEmployees)
        .map(([officeIdStr, personSet]) => ({
          name: officeMap.get(parseInt(officeIdStr)) || `Office #${officeIdStr}`,
          value: personSet.size
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 10)
    };
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

  async updateOfficeInfoForm(id: number, data: Partial<OfficeInfoFormRecord>): Promise<OfficeInfoFormRecord | undefined> {
    const [updated] = await db.update(officeInfoForms)
      .set(data)
      .where(eq(officeInfoForms.id, id))
      .returning();
    return updated;
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

  async getUserByOfficeId(officeId: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.officeId, officeId));
    return user;
  }

  async updateUser(id: number, data: Partial<User>): Promise<User | undefined> {
    const [updated] = await db.update(users)
      .set(data)
      .where(eq(users.id, id))
      .returning();
    return updated;
  }

  async getLicenseRenewal(id: number): Promise<LicenseRenewal | undefined> {
    return this.getRenewal(id);
  }

  async updateLicenseRenewal(id: number, data: Partial<LicenseRenewal>): Promise<LicenseRenewal | undefined> {
    return this.updateRenewal(id, data);
  }

  async createLicenseRenewal(renewal: InsertLicenseRenewal): Promise<LicenseRenewal> {
    return this.createRenewal(renewal);
  }

  async getRenewalByOfficeAndYear(officeId: number, year: number): Promise<LicenseRenewal | undefined> {
    const [renewal] = await db.select()
      .from(licenseRenewals)
      .where(
        and(
          eq(licenseRenewals.officeId, officeId),
          eq(licenseRenewals.year, year)
        )
      );
    return renewal;
  }

  async createRenewalStep(step: InsertRenewalStep): Promise<RenewalStep> {
    const [created] = await db.insert(renewalSteps).values({
      ...step,
      completedAt: new Date()
    } as any).returning();
    return created;
  }

  async getRenewalStepsByRenewalId(renewalId: number): Promise<RenewalStep[]> {
    return await db.select()
      .from(renewalSteps)
      .where(eq(renewalSteps.renewalId, renewalId))
      .orderBy(renewalSteps.completedAt);
  }

  async getRenewalStepsByOfficeId(officeId: number): Promise<RenewalStep[]> {
    return await db.select()
      .from(renewalSteps)
      .where(eq(renewalSteps.officeId, officeId))
      .orderBy(renewalSteps.completedAt);
  }

  async getActiveOfficesForRenewal(lastRenewalYear: number): Promise<Office[]> {
    return await db.select()
      .from(offices)
      .where(eq(offices.lastRenewalYear, lastRenewalYear))
      .orderBy(offices.tradeNameAr);
  }

  async getLatestInviteForRenewal(renewalId: number): Promise<RenewalInvite | undefined> {
    const [invite] = await db.select()
      .from(renewalInvites)
      .where(eq(renewalInvites.renewalId, renewalId))
      .orderBy(desc(renewalInvites.createdAt))
      .limit(1);
    return invite;
  }

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

  async updateInspectionStatus(id: number, status: InspectionStatusType): Promise<void> {
    await db.update(inspections)
      .set({ status, updatedAt: new Date() })
      .where(eq(inspections.id, id));
  }

  async getChangeRequest(id: number): Promise<ChangeRequest | undefined> {
    const [request] = await db.select().from(changeRequests).where(eq(changeRequests.id, id));
    return request;
  }

  async getChangeRequestsByOffice(officeId: number): Promise<ChangeRequest[]> {
    return await db.select().from(changeRequests)
      .where(eq(changeRequests.officeId, officeId))
      .orderBy(desc(changeRequests.createdAt));
  }

  async getChangeRequestsByStatus(status: ChangeRequestStatusType): Promise<ChangeRequest[]> {
    return await db.select().from(changeRequests)
      .where(eq(changeRequests.status, status))
      .orderBy(desc(changeRequests.createdAt));
  }

  async getPendingChangeRequests(): Promise<ChangeRequest[]> {
    return await db.select().from(changeRequests)
      .where(eq(changeRequests.status, 'SUBMITTED'))
      .orderBy(desc(changeRequests.submittedAt));
  }

  async createChangeRequest(request: InsertChangeRequest): Promise<ChangeRequest> {
    const [created] = await db.insert(changeRequests).values(request as any).returning();
    return created;
  }

  async updateChangeRequest(id: number, data: Partial<ChangeRequest>): Promise<ChangeRequest | undefined> {
    const [updated] = await db.update(changeRequests)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(changeRequests.id, id))
      .returning();
    return updated;
  }

  async submitChangeRequest(id: number, submittedBy: number): Promise<ChangeRequest | undefined> {
    const [updated] = await db.update(changeRequests)
      .set({ 
        status: 'SUBMITTED' as ChangeRequestStatusType, 
        submittedBy, 
        submittedAt: new Date(),
        updatedAt: new Date() 
      })
      .where(eq(changeRequests.id, id))
      .returning();
    return updated;
  }

  async approveChangeRequest(id: number, reviewedBy: number, note?: string): Promise<ChangeRequest | undefined> {
    const [updated] = await db.update(changeRequests)
      .set({ 
        status: 'APPROVED' as ChangeRequestStatusType, 
        reviewedBy, 
        reviewedAt: new Date(),
        decisionNote: note || null,
        updatedAt: new Date() 
      })
      .where(eq(changeRequests.id, id))
      .returning();
    return updated;
  }

  async rejectChangeRequest(id: number, reviewedBy: number, note?: string): Promise<ChangeRequest | undefined> {
    const [updated] = await db.update(changeRequests)
      .set({ 
        status: 'REJECTED' as ChangeRequestStatusType, 
        reviewedBy, 
        reviewedAt: new Date(),
        decisionNote: note || null,
        updatedAt: new Date() 
      })
      .where(eq(changeRequests.id, id))
      .returning();
    return updated;
  }
}

export const storage = new DatabaseStorage();
