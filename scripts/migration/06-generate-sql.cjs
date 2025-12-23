const fs = require('fs');
const path = require('path');
const config = require('./config.cjs');

function escapeSQL(val) {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number') return val.toString();
  if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
  if (Array.isArray(val)) return `'${JSON.stringify(val).replace(/'/g, "''")}'::jsonb`;
  const escaped = String(val).replace(/'/g, "''");
  return `'${escaped}'`;
}

function generateOfficesSQL(offices) {
  let sql = '-- Offices Migration\n';
  sql += '-- Generated: ' + new Date().toISOString() + '\n\n';
  
  for (const office of offices) {
    sql += `INSERT INTO offices (
  trade_name_ar, trade_name_en, legal_name_ar, national_entity_no,
  trademark, awqaf_approval_no, tourism_activities,
  main_city, main_street, main_building_number,
  phone, mobile, fax, website, main_email, extra_email,
  po_box, postal_code, status, admin_comment
) VALUES (
  ${escapeSQL(office.trade_name_ar)}, ${escapeSQL(office.trade_name_en)},
  ${escapeSQL(office.legal_name_ar)}, ${escapeSQL(office.national_entity_no)},
  ${escapeSQL(office.trademark)}, ${escapeSQL(office.awqaf_approval_no)},
  ${escapeSQL(office.tourism_activities)},
  ${escapeSQL(office.main_city)}, ${escapeSQL(office.main_street)}, ${escapeSQL(office.main_building_number)},
  ${escapeSQL(office.phone)}, ${escapeSQL(office.mobile)}, ${escapeSQL(office.fax)},
  ${escapeSQL(office.website)}, ${escapeSQL(office.main_email)}, ${escapeSQL(office.extra_email)},
  ${escapeSQL(office.po_box)}, ${escapeSQL(office.postal_code)},
  'ACTIVE', ${escapeSQL(office.admin_comment)}
);\n\n`;
  }
  
  return sql;
}

function generateBranchesSQL(branches) {
  let sql = '-- Branches Migration\n\n';
  
  for (const branch of branches) {
    sql += `INSERT INTO branches (
  office_id, city, area, street, building_number,
  manager_name, manager_mobile, phone, fax
) VALUES (
  ${branch.office_id}, ${escapeSQL(branch.city)}, ${escapeSQL(branch.area)},
  ${escapeSQL(branch.street)}, ${escapeSQL(branch.building_number)},
  ${escapeSQL(branch.manager_name)}, ${escapeSQL(branch.manager_mobile)},
  ${escapeSQL(branch.phone)}, ${escapeSQL(branch.fax)}
);\n\n`;
  }
  
  return sql;
}

function generatePeopleSQL(people) {
  let sql = '-- People Migration (Employees & Owners)\n\n';
  
  for (const person of people) {
    sql += `INSERT INTO people (
  office_id, renewal_id, full_name_ar, full_name_en,
  national_id, social_security_no, nationality, gender,
  mother_name, mobile, birth_date, current_position, start_date, role_type
) VALUES (
  ${person.office_id}, NULL, ${escapeSQL(person.full_name_ar)}, ${escapeSQL(person.full_name_en)},
  ${escapeSQL(person.national_id)}, ${escapeSQL(person.social_security_no)},
  ${escapeSQL(person.nationality)}, ${escapeSQL(person.gender)},
  ${escapeSQL(person.mother_name)}, ${escapeSQL(person.mobile)},
  ${escapeSQL(person.birth_date)}, ${escapeSQL(person.current_position)},
  ${escapeSQL(person.start_date)}, ${escapeSQL(person.role_type)}
);\n\n`;
  }
  
  return sql;
}

function generateRenewalsSQL(renewals) {
  let sql = '-- Renewals Migration (Historical)\n\n';
  
  for (const renewal of renewals) {
    sql += `INSERT INTO license_renewals (
  office_id, year, status, expiry_date, admin_comment,
  office_form_completed, staff_form_completed, commitment_form_completed, submitted_at
) VALUES (
  ${renewal.office_id}, ${renewal.year}, 'FINAL_APPROVED',
  ${escapeSQL(renewal.expiry_date)}, ${escapeSQL(renewal.admin_comment)},
  TRUE, TRUE, TRUE, ${escapeSQL(renewal.submitted_at)}
);\n\n`;
  }
  
  return sql;
}

async function main() {
  const outputDir = config.outputDir;
  
  let fullSQL = '-- JSTA Legacy Data Migration\n';
  fullSQL += '-- Generated: ' + new Date().toISOString() + '\n';
  fullSQL += '-- WARNING: Review this file before running!\n\n';
  fullSQL += 'BEGIN;\n\n';
  
  const officesFile = path.join(outputDir, 'offices-transformed.json');
  if (fs.existsSync(officesFile)) {
    const offices = JSON.parse(fs.readFileSync(officesFile, 'utf8'));
    fullSQL += generateOfficesSQL(offices);
    console.log(`Generated SQL for ${offices.length} offices`);
  }
  
  const branchesFile = path.join(outputDir, 'branches-transformed.json');
  if (fs.existsSync(branchesFile)) {
    const branches = JSON.parse(fs.readFileSync(branchesFile, 'utf8'));
    fullSQL += generateBranchesSQL(branches);
    console.log(`Generated SQL for ${branches.length} branches`);
  }
  
  const peopleFile = path.join(outputDir, 'people-transformed.json');
  if (fs.existsSync(peopleFile)) {
    const people = JSON.parse(fs.readFileSync(peopleFile, 'utf8'));
    fullSQL += generatePeopleSQL(people);
    console.log(`Generated SQL for ${people.length} people`);
  }
  
  const renewalsFile = path.join(outputDir, 'renewals-transformed.json');
  if (fs.existsSync(renewalsFile)) {
    const renewals = JSON.parse(fs.readFileSync(renewalsFile, 'utf8'));
    fullSQL += generateRenewalsSQL(renewals);
    console.log(`Generated SQL for ${renewals.length} renewals`);
  }
  
  fullSQL += 'COMMIT;\n';
  
  const sqlFile = path.join(outputDir, 'migration.sql');
  fs.writeFileSync(sqlFile, fullSQL);
  console.log(`\nSQL file saved to: ${sqlFile}`);
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { generateOfficesSQL, generateBranchesSQL, generatePeopleSQL, generateRenewalsSQL };
