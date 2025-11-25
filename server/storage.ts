import { 
  users, offices, branches, documents, licenseRenewals, auditLogs,
  type User, type InsertUser,
  type Office, type InsertOffice,
  type Branch, type InsertBranch,
  type Document, type InsertDocument,
  type LicenseRenewal, type InsertLicenseRenewal,
  type AuditLog, type InsertAuditLog,
  type OfficeStatusType, type RenewalStatusType,
  type OfficeUpdateForm
} from "@shared/schema";
import { drizzle } from "drizzle-orm/node-postgres";
import pkg from "pg";
const { Pool } = pkg;
import { eq, desc, inArray, sql } from "drizzle-orm";
import bcrypt from "bcryptjs";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
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
  updateOfficeStatus(id: number, status: OfficeStatusType, comment?: string): Promise<void>;
  updateOfficeProfile(id: number, data: OfficeUpdateForm): Promise<Office | undefined>;
  
  getBranches(officeId: number): Promise<Branch[]>;
  createBranch(branch: InsertBranch): Promise<Branch>;
  
  getDocument(id: number): Promise<Document | undefined>;
  getDocuments(officeId: number): Promise<Document[]>;
  getDocumentsByRenewal(renewalId: number): Promise<Document[]>;
  createDocument(doc: InsertDocument): Promise<Document>;
  
  getRenewal(id: number): Promise<LicenseRenewal | undefined>;
  getRenewals(officeId: number): Promise<LicenseRenewal[]>;
  getAllRenewals(): Promise<LicenseRenewal[]>;
  getPendingRenewals(): Promise<LicenseRenewal[]>;
  createRenewal(renewal: InsertLicenseRenewal): Promise<LicenseRenewal>;
  updateRenewalStatus(id: number, status: RenewalStatusType, comment?: string): Promise<void>;
  updateRenewalMinistryDoc(id: number, path: string): Promise<void>;
  
  getStats(): Promise<{
    offices: { total: number; pending: number; active: number; rejected: number };
    renewals: { total: number; pending: number; approved: number; rejected: number };
  }>;
  
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;
  getAuditLogs(limit?: number, offset?: number): Promise<AuditLog[]>;
  getAuditLogsCount(): Promise<number>;
  
  updateUserPassword(userId: number, hashedPassword: string): Promise<void>;
  
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

  async getBranches(officeId: number): Promise<Branch[]> {
    return await db.select().from(branches).where(eq(branches.officeId, officeId));
  }

  async createBranch(insertBranch: InsertBranch): Promise<Branch> {
    const [branch] = await db.insert(branches).values(insertBranch).returning();
    return branch;
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
    const [doc] = await db.insert(documents).values(insertDoc).returning();
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

  async createAuditLog(insertLog: InsertAuditLog): Promise<AuditLog> {
    const [log] = await db.insert(auditLogs).values(insertLog).returning();
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
}

export const storage = new DatabaseStorage();
