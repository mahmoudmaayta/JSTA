/**
 * Email notification stub
 * 
 * TODO: Integrate real SMTP service (e.g., SendGrid, AWS SES, Nodemailer)
 * For now, this function just logs the email to console
 */

interface EmailOptions {
  to: string;
  subject: string;
  body: string;
}

export function sendEmail({ to, subject, body }: EmailOptions): void {
  console.log("=".repeat(60));
  console.log("EMAIL NOTIFICATION (STUB)");
  console.log("=".repeat(60));
  console.log(`To: ${to}`);
  console.log(`Subject: ${subject}`);
  console.log("-".repeat(60));
  console.log(body);
  console.log("=".repeat(60));
  console.log("");
}

export function sendAccountApprovedEmail(email: string, officeName: string): void {
  sendEmail({
    to: email,
    subject: "Your Tourism Office Account Has Been Approved",
    body: `
Dear ${officeName},

Great news! Your tourism office account has been approved by the association.

You can now log in to the portal to:
- View your office information
- Request license renewals
- Manage your documents

Please log in at: [Portal URL]

Best regards,
Tourism Association
    `.trim(),
  });
}

export function sendAccountRejectedEmail(email: string, officeName: string, reason?: string): void {
  sendEmail({
    to: email,
    subject: "Your Tourism Office Registration Status",
    body: `
Dear ${officeName},

We regret to inform you that your tourism office registration has been rejected.

${reason ? `Reason: ${reason}` : ""}

If you have any questions or would like to reapply, please contact the association.

Best regards,
Tourism Association
    `.trim(),
  });
}

export function sendRenewalRequestedEmail(adminEmail: string, officeName: string, year: number): void {
  sendEmail({
    to: adminEmail,
    subject: `New License Renewal Request - ${officeName}`,
    body: `
A new license renewal request has been submitted:

Office: ${officeName}
Year: ${year}

Please review the request in the admin portal.

Best regards,
Tourism Portal System
    `.trim(),
  });
}

export function sendRenewalApprovedForDownloadEmail(email: string, officeName: string, year: number): void {
  sendEmail({
    to: email,
    subject: `License Renewal Approved for Download - Year ${year}`,
    body: `
Dear ${officeName},

Your license renewal request for year ${year} has been approved.

You can now download your renewal document from the portal to take to the Ministry.

After visiting the Ministry, please upload the signed/approved document back to the portal.

Best regards,
Tourism Association
    `.trim(),
  });
}

export function sendMinistryDocUploadedEmail(adminEmail: string, officeName: string, year: number): void {
  sendEmail({
    to: adminEmail,
    subject: `Ministry Document Uploaded - ${officeName} (Year ${year})`,
    body: `
${officeName} has uploaded their Ministry-approved document for year ${year}.

Please review and provide final approval in the admin portal.

Best regards,
Tourism Portal System
    `.trim(),
  });
}

export function sendRenewalFinalApprovedEmail(email: string, officeName: string, year: number): void {
  sendEmail({
    to: email,
    subject: `License Renewal Fully Approved - Year ${year}`,
    body: `
Dear ${officeName},

Congratulations! Your license renewal for year ${year} has been fully approved.

Thank you for your continued membership with the association.

Best regards,
Tourism Association
    `.trim(),
  });
}

export function sendRenewalRejectedEmail(email: string, officeName: string, year: number, reason?: string): void {
  sendEmail({
    to: email,
    subject: `License Renewal Rejected - Year ${year}`,
    body: `
Dear ${officeName},

We regret to inform you that your license renewal request for year ${year} has been rejected.

${reason ? `Reason: ${reason}` : ""}

Please contact the association if you have any questions.

Best regards,
Tourism Association
    `.trim(),
  });
}
