import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

const doc = new PDFDocument({
  size: 'A4',
  margins: { top: 50, bottom: 50, left: 50, right: 50 },
  info: {
    Title: 'JSTA Portal User Manual',
    Author: 'Jordan Society of Tourism and Travel Agents',
    Subject: '2026 License Renewal System Guide',
  }
});

const outputPath = path.join(process.cwd(), 'public', 'JSTA_Portal_User_Manual.pdf');

const dir = path.dirname(outputPath);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

const writeStream = fs.createWriteStream(outputPath);
doc.pipe(writeStream);

const colors = {
  primary: '#4F46E5',
  secondary: '#6B7280',
  accent: '#10B981',
  dark: '#1F2937',
  light: '#F3F4F6',
};

function addHeader(text: string, level: number = 1) {
  const sizes = { 1: 24, 2: 18, 3: 14 };
  const size = sizes[level as keyof typeof sizes] || 14;
  
  doc.fontSize(size)
     .fillColor(colors.primary)
     .font('Helvetica-Bold')
     .text(text, { continued: false });
  
  if (level === 1) {
    doc.moveDown(0.3);
    doc.strokeColor(colors.primary)
       .lineWidth(2)
       .moveTo(50, doc.y)
       .lineTo(545, doc.y)
       .stroke();
  }
  doc.moveDown(0.5);
}

function addParagraph(text: string) {
  doc.fontSize(11)
     .fillColor(colors.dark)
     .font('Helvetica')
     .text(text, { align: 'justify', lineGap: 3 });
  doc.moveDown(0.5);
}

function addBullet(text: string, indent: number = 0) {
  const x = 60 + (indent * 15);
  doc.fontSize(11)
     .fillColor(colors.dark)
     .font('Helvetica')
     .text(`• ${text}`, x, doc.y, { continued: false });
  doc.moveDown(0.3);
}

function addTableRow(cells: string[], isHeader: boolean = false) {
  const startX = 50;
  const cellWidths = cells.length === 2 ? [150, 345] : 
                     cells.length === 3 ? [120, 100, 275] : 
                     [100, 60, 335];
  const y = doc.y;
  
  doc.font(isHeader ? 'Helvetica-Bold' : 'Helvetica')
     .fontSize(10)
     .fillColor(isHeader ? colors.primary : colors.dark);
  
  let x = startX;
  cells.forEach((cell, i) => {
    doc.text(cell, x + 5, y + 5, { width: cellWidths[i] - 10, height: 20 });
    x += cellWidths[i];
  });
  
  doc.moveDown(1);
}

function addWorkflowStep(step: string, who: string, action: string) {
  const y = doc.y;
  
  doc.rect(50, y, 495, 35)
     .fillAndStroke(colors.light, colors.primary);
  
  doc.fillColor(colors.primary)
     .font('Helvetica-Bold')
     .fontSize(10)
     .text(step, 55, y + 5, { width: 100 });
  
  doc.fillColor(colors.secondary)
     .font('Helvetica')
     .fontSize(9)
     .text(who, 55, y + 18, { width: 100 });
  
  doc.fillColor(colors.dark)
     .font('Helvetica')
     .fontSize(10)
     .text(action, 160, y + 10, { width: 380 });
  
  doc.moveDown(1.5);
}

doc.fontSize(32)
   .fillColor(colors.primary)
   .font('Helvetica-Bold')
   .text('JSTA Portal', { align: 'center' });

doc.fontSize(18)
   .fillColor(colors.secondary)
   .font('Helvetica')
   .text('User Manual', { align: 'center' });

doc.moveDown(2);

doc.fontSize(14)
   .fillColor(colors.dark)
   .font('Helvetica')
   .text('Jordan Society of Tourism and Travel Agents', { align: 'center' });

doc.moveDown(0.5);

doc.fontSize(12)
   .fillColor(colors.secondary)
   .text('2026 License Renewal System', { align: 'center' });

doc.moveDown(3);

doc.fontSize(10)
   .fillColor(colors.secondary)
   .text(`Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, { align: 'center' });

doc.addPage();

addHeader('1. System Overview');
addParagraph('The JSTA Portal is a comprehensive membership management system designed for the Jordan Society of Tourism and Travel Agents. It streamlines the annual license renewal process and provides centralized management of tourism office data.');

doc.moveDown(0.5);
addHeader('What the System Manages:', 3);
addBullet('1,701 tourism offices across Jordan');
addBullet('13,942 employees linked to these offices');
addBullet('296 branch locations');
addBullet('Annual license renewal process with the Ministry of Tourism');
addBullet('Payment tracking and audit logging');

doc.moveDown(0.5);
addHeader('Who Uses It:', 3);
addBullet('JSTA Admin Staff - Review applications, manage renewals, track payments, view audit logs');
addBullet('Tourism Offices - Submit renewals, update information, upload documents, track status');

doc.addPage();

addHeader('2. User Roles & Permissions');
addParagraph('The system has two distinct user roles with different access levels and capabilities:');

doc.moveDown(0.5);
addTableRow(['Role', 'Access', 'Capabilities'], true);
addTableRow(['Admin', 'Admin Panel', 'View all offices, send invitations, approve renewals, manage payments, view audit logs, manage promo codes']);
addTableRow(['Office', 'Office Portal', 'Update office info, submit declarations, upload payment proof, track renewal status']);

doc.moveDown(1);
addParagraph('Admin users can access all administrative functions including sending bulk renewal invitations, reviewing submissions, and managing the entire renewal workflow. Office users can only access their own office data and renewal process.');

doc.addPage();

addHeader('3. 2026 License Renewal Workflow');
addParagraph('The renewal process follows a structured 8-step workflow. Each step must be completed before proceeding to the next:');

doc.moveDown(0.5);
addHeader('Workflow Steps:', 3);

addWorkflowStep('1. Invitation Sent', 'Admin', 'Admin sends renewal invitation email to office with secure, time-limited link');
addWorkflowStep('2. Link Accessed', 'Office', 'Office representative clicks the secure link in email to access renewal portal');
addWorkflowStep('3. Credentials Updated', 'Office', 'Office sets a new password for their account for the renewal period');
addWorkflowStep('4. Info Reviewed', 'Office', 'Reviews and updates office details including contact info, address, and activities');
addWorkflowStep('5. Declarations Accepted', 'Office', 'Signs required commitment and declaration forms electronically');
addWorkflowStep('6. Payment Initiated', 'Office', 'Uploads payment proof (bank transfer receipt) for renewal fees');
addWorkflowStep('7. Payment Confirmed', 'Admin', 'Admin reviews and confirms the payment receipt is valid');
addWorkflowStep('8. Renewal Completed', 'Admin', 'Final approval granted - license renewed for 2026');

doc.addPage();

addHeader('4. Admin Panel Guide');
addParagraph('The Admin Panel provides comprehensive tools for managing the entire renewal process and office database.');

doc.moveDown(0.5);

addHeader('Dashboard', 3);
addBullet('Overview statistics (total offices, active renewals, pending payments)');
addBullet('Visual charts showing office distribution by category and city');
addBullet('Quick links to items requiring attention');

addHeader('Offices', 3);
addBullet('Browse all 1,701 registered tourism offices');
addBullet('Filter by license category (A, B, C, D), city, or IATA membership');
addBullet('Search by name, registration number, or email');
addBullet('Click any office to view full details including branches and employees');

addHeader('Renewals', 3);
addBullet('Track all renewal applications and their current workflow status');
addBullet('See which step each office is at in the renewal process');
addBullet('View detailed renewal timeline with timestamps');

addHeader('Renewal Invitations', 3);
addBullet('Send bulk or individual renewal invitations to eligible offices');
addBullet('Track invitation status (sent/pending)');
addBullet('Resend invitations when needed');

doc.addPage();

addHeader('Office Info Forms', 3);
addBullet('View all submitted office information updates');
addBullet('Review changes offices have made to their profiles');
addBullet('Search by office name');

addHeader('Payments', 3);
addBullet('Track all payment submissions');
addBullet('Review uploaded payment proofs');
addBullet('Confirm or reject payments');
addBullet('View payment history and amounts');

addHeader('Staff Dashboard', 3);
addBullet('Browse all 13,942 employees across all offices');
addBullet('Filter by office, nationality, or job role');
addBullet('Search by name, national ID, or mobile number');
addBullet('Export employee data to CSV');

addHeader('Pledges (Commitments)', 3);
addBullet('View all signed declaration and commitment forms');
addBullet('Track which offices have completed required forms');

addHeader('Audit Logs', 3);
addBullet('Complete activity history for all system actions');
addBullet('Shows who performed each action and when');
addBullet('Email status indicators (sent/not sent) for each action');
addBullet('Filter by action type, user, or date range');

addHeader('Promo Codes', 3);
addBullet('Create and manage discount codes for renewal fees');
addBullet('Set usage limits and expiration dates');
addBullet('Track usage statistics');

doc.addPage();

addHeader('5. Office Portal Guide');
addParagraph('When a tourism office receives their renewal invitation email, they follow these steps to complete their license renewal:');

doc.moveDown(0.5);

addHeader('Step 1: Access the Portal', 3);
addParagraph('Click the secure link in the invitation email. This link is unique to your office and expires after a set period.');

addHeader('Step 2: Set New Password', 3);
addParagraph('Create new login credentials for the 2026 renewal period. Use a strong password that you will remember.');

addHeader('Step 3: Dashboard', 3);
addParagraph('After login, the dashboard shows your current renewal status and the next steps you need to complete.');

addHeader('Step 4: Update Office Information', 3);
addBullet('Trade names (Arabic and English)');
addBullet('Contact information (phone, email, fax)');
addBullet('Address and location details');
addBullet('Tourism activities and services offered');
addBullet('IATA/UFTAA/ASTA membership status');

addHeader('Step 5: Review Staff Information', 3);
addParagraph('Review the list of employees linked to your office. Report any changes or updates needed.');

addHeader('Step 6: Sign Declarations', 3);
addParagraph('Read and accept the required commitment and declaration forms. These include compliance agreements and professional standards.');

addHeader('Step 7: Submit Payment', 3);
addParagraph('Upload proof of your bank transfer payment for the renewal fee. Ensure the receipt clearly shows the amount and transaction details.');

addHeader('Step 8: Track Status', 3);
addParagraph('Monitor your renewal application status. You will receive email notifications when your payment is confirmed and when your renewal is approved.');

doc.addPage();

addHeader('6. Key Data Relationships');
addParagraph('The system organizes data in a hierarchical structure centered around tourism offices:');

doc.moveDown(1);

doc.font('Courier')
   .fontSize(10)
   .fillColor(colors.dark)
   .text('Office (Tourism Company)', 70);
doc.text(' ├── Branches (multiple locations)', 70);
doc.text(' ├── Employees (via work history records)', 70);
doc.text(' ├── Documents (uploaded files)', 70);
doc.text(' ├── License Renewals', 70);
doc.text(' │    ├── Renewal Steps (workflow progress)', 70);
doc.text(' │    ├── Payments', 70);
doc.text(' │    └── Consent/Declarations', 70);
doc.text(' └── User Account (login credentials)', 70);

doc.moveDown(1.5);
doc.font('Helvetica');

addHeader('Data Elements:', 3);
addBullet('Offices: Core business entities with license categories, contact info, and activities');
addBullet('Branches: Physical locations belonging to an office');
addBullet('People/Employees: Staff members with job titles and work history');
addBullet('Documents: Uploaded files for registration and renewal');
addBullet('License Renewals: Annual renewal records with status tracking');
addBullet('Payments: Financial transactions linked to renewals');
addBullet('Audit Logs: System activity tracking for compliance');

doc.addPage();

addHeader('7. Email Notifications');
addParagraph('The system sends automatic email notifications at key points in the renewal process:');

doc.moveDown(0.5);
addBullet('Renewal invitation with secure access link');
addBullet('Password reset confirmation');
addBullet('Payment submission acknowledgment');
addBullet('Payment confirmation or rejection notice');
addBullet('Renewal completion notification');

doc.moveDown(1);
addParagraph('All email activity is tracked in the Audit Logs with status badges showing whether emails were successfully sent and to which recipient.');

doc.moveDown(2);

addHeader('Need Help?');
addParagraph('For technical support or questions about the renewal process, please contact JSTA headquarters.');

doc.moveDown(2);
doc.fontSize(9)
   .fillColor(colors.secondary)
   .text('© 2025 Jordan Society of Tourism and Travel Agents. All rights reserved.', { align: 'center' });

doc.end();

writeStream.on('finish', () => {
  console.log(`PDF generated successfully: ${outputPath}`);
});

writeStream.on('error', (err) => {
  console.error('Error generating PDF:', err);
});
