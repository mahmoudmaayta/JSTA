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

// ============================================
// 2026 Renewal Invitation Emails
// ============================================

interface RenewalInviteEmailOptions {
  to: string;
  officeName: string;
  officeNameEn?: string;
  renewalUrl: string;
  expiresAt: Date;
  language: 'en' | 'ar';
}

export function sendRenewalInvitationEmail(options: RenewalInviteEmailOptions): void {
  const { to, officeName, officeNameEn, renewalUrl, expiresAt, language } = options;
  const expiryDateStr = expiresAt.toLocaleDateString(language === 'ar' ? 'ar-JO' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  if (language === 'ar') {
    sendEmail({
      to,
      subject: 'دعوة تجديد عضوية جمعية شركات السياحة والسفر - 2026',
      body: `
${officeName} الكرام،

يسر جمعية شركات السياحة والسفر الأردنية دعوتكم لتجديد عضويتكم لعام 2026.

للبدء بعملية التجديد، يرجى الضغط على الرابط التالي:
${renewalUrl}

هذا الرابط صالح حتى: ${expiryDateStr}

خطوات التجديد:
1. تعيين بيانات الدخول الجديدة (البريد الإلكتروني وكلمة المرور)
2. مراجعة بيانات المكتب والتأكد من صحتها
3. قبول التعهدات والإقرارات
4. إتمام عملية الدفع

في حال وجود أي استفسار، يرجى التواصل مع الجمعية.

مع أطيب التحيات،
جمعية شركات السياحة والسفر الأردنية
      `.trim(),
    });
  } else {
    sendEmail({
      to,
      subject: 'JSTA Membership Renewal Invitation - 2026',
      body: `
Dear ${officeNameEn || officeName},

The Jordan Society of Tourism and Travel Agents (JSTA) invites you to renew your membership for 2026.

To begin your renewal process, please click the following link:
${renewalUrl}

This link is valid until: ${expiryDateStr}

Renewal Steps:
1. Set up new login credentials (email and password)
2. Review your office information and confirm accuracy
3. Accept declarations and commitments
4. Complete payment

If you have any questions, please contact the association.

Best regards,
Jordan Society of Tourism and Travel Agents
      `.trim(),
    });
  }
}

export function sendRenewalReminderEmail(options: RenewalInviteEmailOptions): void {
  const { to, officeName, officeNameEn, renewalUrl, expiresAt, language } = options;
  const expiryDateStr = expiresAt.toLocaleDateString(language === 'ar' ? 'ar-JO' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  if (language === 'ar') {
    sendEmail({
      to,
      subject: 'تذكير: لم يتم إكمال تجديد عضويتكم لعام 2026',
      body: `
${officeName} الكرام،

نود تذكيركم بأن عملية تجديد عضويتكم لعام 2026 لم تكتمل بعد.

يرجى الضغط على الرابط التالي لإكمال عملية التجديد:
${renewalUrl}

هام: هذا الرابط صالح حتى ${expiryDateStr} فقط.

لن تتمكنوا من إجراء أي معاملات مع الجمعية اعتباراً من 1 يناير 2026 حتى إتمام عملية التجديد.

في حال وجود أي استفسار، يرجى التواصل مع الجمعية.

مع أطيب التحيات،
جمعية شركات السياحة والسفر الأردنية
      `.trim(),
    });
  } else {
    sendEmail({
      to,
      subject: 'Reminder: Your 2026 Membership Renewal is Incomplete',
      body: `
Dear ${officeNameEn || officeName},

This is a reminder that your 2026 membership renewal process has not been completed.

Please click the following link to complete your renewal:
${renewalUrl}

Important: This link is valid until ${expiryDateStr} only.

You will not be able to conduct any transactions with the association starting January 1, 2026 until your renewal is complete.

If you have any questions, please contact the association.

Best regards,
Jordan Society of Tourism and Travel Agents
      `.trim(),
    });
  }
}

interface PaymentConfirmationOptions {
  to: string;
  officeName: string;
  officeNameEn?: string;
  amount: number;
  transactionId: string;
  paymentDate: Date;
  language: 'en' | 'ar';
}

export function sendPaymentConfirmationEmail(options: PaymentConfirmationOptions): void {
  const { to, officeName, officeNameEn, amount, transactionId, paymentDate, language } = options;
  const dateStr = paymentDate.toLocaleDateString(language === 'ar' ? 'ar-JO' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  if (language === 'ar') {
    sendEmail({
      to,
      subject: 'تأكيد الدفع - تجديد عضوية 2026',
      body: `
${officeName} الكرام،

نشكركم على إتمام دفع رسوم تجديد عضويتكم لعام 2026.

تفاصيل الدفع:
- المبلغ: ${amount.toFixed(2)} دينار أردني
- رقم العملية: ${transactionId}
- التاريخ: ${dateStr}

تم تفعيل عضويتكم لعام 2026 بنجاح. يمكنكم الآن إجراء جميع المعاملات مع الجمعية.

للدخول إلى حسابكم، يرجى استخدام بيانات الدخول التي قمتم بتعيينها أثناء عملية التجديد.

شكراً لاستمرار عضويتكم معنا.

مع أطيب التحيات،
جمعية شركات السياحة والسفر الأردنية
      `.trim(),
    });
  } else {
    sendEmail({
      to,
      subject: 'Payment Confirmation - 2026 Membership Renewal',
      body: `
Dear ${officeNameEn || officeName},

Thank you for completing your 2026 membership renewal payment.

Payment Details:
- Amount: ${amount.toFixed(2)} JOD
- Transaction ID: ${transactionId}
- Date: ${dateStr}

Your 2026 membership has been successfully activated. You can now conduct all transactions with the association.

To access your account, please use the login credentials you set during the renewal process.

Thank you for your continued membership.

Best regards,
Jordan Society of Tourism and Travel Agents
      `.trim(),
    });
  }
}

export function sendRenewalCompletedEmail(options: Omit<PaymentConfirmationOptions, 'amount' | 'transactionId' | 'paymentDate'> & { renewalYear: number }): void {
  const { to, officeName, officeNameEn, renewalYear, language } = options;

  if (language === 'ar') {
    sendEmail({
      to,
      subject: `تم إكمال تجديد العضوية لعام ${renewalYear}`,
      body: `
${officeName} الكرام،

تهانينا! تم إكمال تجديد عضويتكم لعام ${renewalYear} بنجاح.

يمكنكم الآن:
- الدخول إلى حسابكم باستخدام البريد الإلكتروني وكلمة المرور الجديدة
- إجراء جميع المعاملات مع الجمعية
- الوصول إلى جميع خدمات البوابة

شكراً لثقتكم المستمرة.

مع أطيب التحيات،
جمعية شركات السياحة والسفر الأردنية
      `.trim(),
    });
  } else {
    sendEmail({
      to,
      subject: `Membership Renewal Completed for ${renewalYear}`,
      body: `
Dear ${officeNameEn || officeName},

Congratulations! Your membership renewal for ${renewalYear} has been successfully completed.

You can now:
- Log in to your account using your new email and password
- Conduct all transactions with the association
- Access all portal services

Thank you for your continued trust.

Best regards,
Jordan Society of Tourism and Travel Agents
      `.trim(),
    });
  }
}
