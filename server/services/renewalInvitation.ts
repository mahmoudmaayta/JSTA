import crypto from 'crypto';
import { db } from '../storage';
import { renewalInvites, renewalSteps, licenseRenewals, offices, users, RenewalInviteStatusType } from '@shared/schema';
import { eq, and, sql } from 'drizzle-orm';
import { sendRenewalInvitationEmail, sendRenewalReminderEmail } from '../email';

const TOKEN_BYTES = 32;
const TOKEN_EXPIRY_DAYS = 30;

export interface InvitationResult {
  success: boolean;
  inviteId?: number;
  emailSent?: boolean;
  error?: string;
}

export interface TokenValidationResult {
  valid: boolean;
  inviteId?: number;
  officeId?: number;
  renewalId?: number;
  /** Invite status at lookup time: PENDING / SENT / CONSUMED. */
  status?: string;
  error?: string;
}

function generateSecureToken(): string {
  return crypto.randomBytes(TOKEN_BYTES).toString('hex');
}

function hashTokenSHA256(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function createRenewalInvitation(officeId: number, renewalId: number): Promise<InvitationResult> {
  try {
    const office = await db.select().from(offices).where(eq(offices.id, officeId)).limit(1);
    if (!office.length) {
      return { success: false, error: 'Office not found' };
    }

    await db.update(renewalInvites)
      .set({ status: 'EXPIRED' })
      .where(
        and(
          eq(renewalInvites.officeId, officeId),
          eq(renewalInvites.status, 'PENDING')
        )
      );

    const token = generateSecureToken();
    const tokenHash = hashTokenSHA256(token);
    
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + TOKEN_EXPIRY_DAYS);

    const user = await db.select().from(users).where(eq(users.officeId, officeId)).limit(1);
    const sentToEmail = user.length ? user[0].email : null;

    const [invite] = await db.insert(renewalInvites).values({
      officeId,
      renewalId,
      tokenHash,
      status: 'PENDING',
      expiresAt,
      sentToEmail
    }).returning();

    await db.insert(renewalSteps).values({
      renewalId,
      officeId,
      stepType: 'INVITE_SENT',
      payload: { inviteId: invite.id },
      completedAt: new Date()
    });

    await db.update(licenseRenewals)
      .set({ renewalState: 'INVITED' })
      .where(eq(licenseRenewals.id, renewalId));

    let emailSent = false;
    if (sentToEmail) {
      try {
        const officeName = office[0].tradeNameAr || 'Office';
        const officeNameEn = office[0].tradeNameEn ?? undefined;
        const portalUrl = process.env.APP_URL || 'http://localhost:5000';
        
        // Send bilingual invitation emails (Arabic first, then English)
        sendRenewalInvitationEmail({
          to: sentToEmail,
          officeName,
          officeNameEn,
          renewalUrl: `${portalUrl}/renew/${token}`,
          expiresAt,
          language: 'ar'
        });
        
        // Also send English version
        sendRenewalInvitationEmail({
          to: sentToEmail,
          officeName,
          officeNameEn,
          renewalUrl: `${portalUrl}/renew/${token}`,
          expiresAt,
          language: 'en'
        });

        await db.update(renewalInvites)
          .set({ status: 'SENT', sentAt: new Date() })
          .where(eq(renewalInvites.id, invite.id));
        
        emailSent = true;
      } catch (emailError) {
        console.error('Failed to send renewal invitation email:', emailError);
      }
    }

    return { success: true, inviteId: invite.id, emailSent };
  } catch (error) {
    console.error('Failed to create renewal invitation:', error);
    return { success: false, error: 'Failed to create invitation' };
  }
}

async function lookupInvitationByToken(
  token: string,
  allowedStatuses: string[]
): Promise<TokenValidationResult> {
  try {
    if (typeof token !== 'string' || token.length === 0) {
      return { valid: false, error: 'Invalid or expired token' };
    }

    const tokenHash = hashTokenSHA256(token);
    const statusList = sql.join(allowedStatuses.map((s) => sql`${s}`), sql`, `);

    const [invite] = await db.select()
      .from(renewalInvites)
      .where(
        and(
          eq(renewalInvites.tokenHash, tokenHash),
          sql`${renewalInvites.status} IN (${statusList})`,
          sql`${renewalInvites.expiresAt} > NOW()`
        )
      )
      .limit(1);

    if (!invite) {
      return { valid: false, error: 'Invalid or expired token' };
    }

    return {
      valid: true,
      inviteId: invite.id,
      officeId: invite.officeId,
      renewalId: invite.renewalId ?? undefined,
      status: invite.status
    };
  } catch (error) {
    console.error('Token validation error:', error);
    return { valid: false, error: 'Token validation failed' };
  }
}

export async function validateInvitationToken(token: string): Promise<TokenValidationResult> {
  return lookupInvitationByToken(token, ['PENDING', 'SENT']);
}

/**
 * Resolves a token that may already have been redeemed. Used by the credential-set
 * step, which runs after the invitation has been consumed but must still prove that
 * the caller holds the token issued for that renewal.
 */
export async function resolveRedeemedInvitationToken(token: string): Promise<TokenValidationResult> {
  return lookupInvitationByToken(token, ['PENDING', 'SENT', 'CONSUMED']);
}

export async function redeemInvitationToken(
  token: string,
  ipAddress?: string,
  userAgent?: string
): Promise<TokenValidationResult> {
  const validation = await validateInvitationToken(token);
  
  if (!validation.valid || !validation.inviteId) {
    return validation;
  }

  try {
    await db.update(renewalInvites)
      .set({ 
        status: 'CONSUMED',
        consumedAt: new Date(),
        ipAddress,
        userAgent
      })
      .where(eq(renewalInvites.id, validation.inviteId));

    await db.insert(renewalSteps).values({
      renewalId: validation.renewalId!,
      officeId: validation.officeId!,
      stepType: 'TOKEN_REDEEMED',
      ipAddress,
      userAgent,
      completedAt: new Date()
    });

    await db.update(licenseRenewals)
      .set({ renewalState: 'ACCESS_GRANTED' })
      .where(eq(licenseRenewals.id, validation.renewalId!));

    return validation;
  } catch (error) {
    console.error('Token redemption error:', error);
    return { valid: false, error: 'Failed to redeem token' };
  }
}

export async function sendBulkInvitations(year: number = 2026): Promise<{
  sent: number;
  failed: number;
  errors: string[];
}> {
  const result = { sent: 0, failed: 0, errors: [] as string[] };

  try {
    const activeOffices = await db.select({
      id: offices.id,
      tradeNameEn: offices.tradeNameEn,
      tradeNameAr: offices.tradeNameAr,
      lastRenewalYear: offices.lastRenewalYear
    })
    .from(offices)
    .where(eq(offices.lastRenewalYear, year - 1));

    for (const office of activeOffices) {
      let renewal = await db.select()
        .from(licenseRenewals)
        .where(
          and(
            eq(licenseRenewals.officeId, office.id),
            eq(licenseRenewals.year, year)
          )
        )
        .limit(1);

      if (!renewal.length) {
        const [newRenewal] = await db.insert(licenseRenewals).values({
          officeId: office.id,
          year: year,
          status: 'DRAFT',
          renewalState: 'NOT_STARTED',
          canTransact2026: false
        }).returning();
        renewal = [newRenewal];
      }

      const invitation = await createRenewalInvitation(office.id, renewal[0].id);
      
      if (invitation.success) {
        result.sent++;
      } else {
        result.failed++;
        result.errors.push(`Office ${office.id}: ${invitation.error}`);
      }
    }
  } catch (error) {
    console.error('Bulk invitation error:', error);
    result.errors.push(`System error: ${(error as Error).message}`);
  }

  return result;
}

export async function resendInvitation(officeId: number, renewalId: number): Promise<InvitationResult> {
  return await createRenewalInvitation(officeId, renewalId);
}

export async function getInvitationStats(year: number = 2026): Promise<{
  total: number;
  pending: number;
  sent: number;
  consumed: number;
  expired: number;
  byState: Record<string, number>;
}> {
  try {
    const renewals = await db.select({
      renewalState: licenseRenewals.renewalState
    })
    .from(licenseRenewals)
    .where(eq(licenseRenewals.year, year));

    const byState: Record<string, number> = {};
    for (const r of renewals) {
      const state = r.renewalState || 'NOT_STARTED';
      byState[state] = (byState[state] || 0) + 1;
    }

    const invites = await db.select({
      status: renewalInvites.status
    })
    .from(renewalInvites)
    .innerJoin(licenseRenewals, eq(renewalInvites.renewalId, licenseRenewals.id))
    .where(eq(licenseRenewals.year, year));

    return {
      total: renewals.length,
      pending: invites.filter((i: { status: RenewalInviteStatusType }) => i.status === 'PENDING').length,
      sent: invites.filter((i: { status: RenewalInviteStatusType }) => i.status === 'SENT').length,
      consumed: invites.filter((i: { status: RenewalInviteStatusType }) => i.status === 'CONSUMED').length,
      expired: invites.filter((i: { status: RenewalInviteStatusType }) => i.status === 'EXPIRED').length,
      byState
    };
  } catch (error) {
    console.error('Get invitation stats error:', error);
    return { total: 0, pending: 0, sent: 0, consumed: 0, expired: 0, byState: {} };
  }
}

export async function getOfficeRenewalStatus(officeId: number, year: number = 2026): Promise<{
  hasRenewal: boolean;
  renewalId?: number;
  renewalState?: string;
  canTransact2026?: boolean;
  inviteStatus?: string;
}> {
  try {
    const [renewal] = await db.select()
      .from(licenseRenewals)
      .where(
        and(
          eq(licenseRenewals.officeId, officeId),
          eq(licenseRenewals.year, year)
        )
      )
      .limit(1);

    if (!renewal) {
      return { hasRenewal: false };
    }

    const [invite] = await db.select()
      .from(renewalInvites)
      .where(eq(renewalInvites.renewalId, renewal.id))
      .orderBy(sql`${renewalInvites.id} DESC`)
      .limit(1);

    return {
      hasRenewal: true,
      renewalId: renewal.id,
      renewalState: renewal.renewalState || 'NOT_STARTED',
      canTransact2026: renewal.canTransact2026 || false,
      inviteStatus: invite?.status
    };
  } catch (error) {
    console.error('Get office renewal status error:', error);
    return { hasRenewal: false };
  }
}
