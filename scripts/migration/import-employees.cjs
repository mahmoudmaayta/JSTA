const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

function cleanStr(str) {
  if (!str || str === 'Null' || str === 'NULL' || str === '-' || str === '0' || str === '' || str === 'NA' || str === 'na') return null;
  return str.trim();
}

function parseDate(dateStr) {
  if (!dateStr || dateStr === '0000-00-00' || dateStr === 'Null' || dateStr === '' || dateStr === 'NA') return null;
  return dateStr;
}

function parseGender(sex) {
  if (sex === 'M') return 'ذكر';
  if (sex === 'F') return 'أنثى';
  return null;
}

function extractAllRecords(sqlContent) {
  const records = [];
  const lines = sqlContent.split('\n');
  let inValues = false;
  let currentRecord = '';
  let parenDepth = 0;
  let inString = false;
  
  for (const line of lines) {
    if (line.includes('INSERT INTO') && line.includes('VALUES')) {
      inValues = true;
      continue;
    }
    if (!inValues) continue;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const prevChar = i > 0 ? line[i-1] : '';
      
      if (char === "'" && prevChar !== '\\') {
        inString = !inString;
        currentRecord += char;
        continue;
      }
      
      if (!inString) {
        if (char === '(') {
          parenDepth++;
          if (parenDepth === 1) { currentRecord = ''; continue; }
        } else if (char === ')') {
          parenDepth--;
          if (parenDepth === 0) { records.push(currentRecord); currentRecord = ''; continue; }
        } else if (char === ';') { inValues = false; continue; }
      }
      if (parenDepth > 0) currentRecord += char;
    }
    if (parenDepth > 0) currentRecord += '\n';
  }
  return records;
}

function parseRecord(recordStr) {
  const values = [];
  let current = '';
  let inString = false;
  let escapeNext = false;
  
  for (let i = 0; i < recordStr.length; i++) {
    const char = recordStr[i];
    if (escapeNext) {
      if (char === 'r') current += '\r';
      else if (char === 'n') current += '\n';
      else current += char;
      escapeNext = false;
      continue;
    }
    if (char === '\\') { escapeNext = true; continue; }
    if (char === "'") { inString = !inString; continue; }
    if (char === ',' && !inString) { values.push(current.trim()); current = ''; continue; }
    current += char;
  }
  values.push(current.trim());
  return values;
}

async function main() {
  const sqlPath = path.join(__dirname, '../../attached_assets/employees_1766506496310.sql');
  console.log('Reading SQL file:', sqlPath);
  
  const sqlContent = fs.readFileSync(sqlPath, 'utf8');
  console.log('SQL file size:', sqlContent.length, 'bytes');
  
  const records = extractAllRecords(sqlContent);
  console.log('Found', records.length, 'employee records to import');
  
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  let imported = 0;
  let skipped = 0;
  const errors = [];
  
  for (let i = 0; i < records.length; i++) {
    try {
      const v = parseRecord(records[i]);
      
      if (v.length < 30) {
        skipped++;
        errors.push({ index: i, error: `Only ${v.length} values` });
        continue;
      }
      
      // Fields from employees table:
      // 0-id, 1-name, 2-sName, 3-mName, 4-lName, 5-nameEn, 6-sNameEn, 7-mNameEn, 8-lNameEn,
      // 9-jstaIdNum, 10-NationalityNum, 11-nationality, 12-SocialSecurityNum, 13-birthdate,
      // 14-sex, 15-MotherName, 16-Qualification, 17-QualificationFile, 18-JobTitle, 19-Courses,
      // 20-job, 21-phone, 22-email, 23-PassportNumber, 24-PassportFile, 25-LocationFile,
      // 26-picture, 27-CV, 28-createdOn, 29-createdBy, 30-modifiedOn, 31-modifiedBy
      
      const legacyId = parseInt(v[0]) || null;
      const firstName = cleanStr(v[1]);
      const secondName = cleanStr(v[2]);
      const middleName = cleanStr(v[3]);
      const lastName = cleanStr(v[4]);
      const firstNameEn = cleanStr(v[5]);
      const secondNameEn = cleanStr(v[6]);
      const middleNameEn = cleanStr(v[7]);
      const lastNameEn = cleanStr(v[8]);
      const jstaIdNum = cleanStr(v[9]);
      const nationalId = cleanStr(v[10]);
      const nationality = cleanStr(v[11]);
      const socialSecurityNo = cleanStr(v[12]);
      const birthDate = parseDate(v[13]);
      const gender = parseGender(v[14]);
      const motherName = cleanStr(v[15]);
      const qualification = parseInt(v[16]) || null;
      const qualificationFile = cleanStr(v[17]);
      const jobTitle = parseInt(v[18]) || null;
      const courses = cleanStr(v[19]);
      const job = cleanStr(v[20]);
      const mobile = cleanStr(v[21]);
      const email = cleanStr(v[22]);
      const passportNumber = cleanStr(v[23]);
      const passportFile = cleanStr(v[24]);
      const locationFile = cleanStr(v[25]);
      const picture = cleanStr(v[26]);
      const cv = cleanStr(v[27]);
      
      // Build full names
      const nameParts = [firstName, secondName, middleName, lastName].filter(Boolean);
      const fullNameAr = nameParts.length > 0 ? nameParts.join(' ') : null;
      
      const namePartsEn = [firstNameEn, secondNameEn, middleNameEn, lastNameEn].filter(Boolean);
      const fullNameEn = namePartsEn.length > 0 ? namePartsEn.join(' ') : null;
      
      if (!firstName && !firstNameEn) {
        skipped++;
        continue;
      }
      
      await pool.query(`
        INSERT INTO people (
          legacy_id, first_name, second_name, middle_name, last_name,
          first_name_en, second_name_en, middle_name_en, last_name_en,
          full_name_ar, full_name_en, jsta_id_num, national_id, nationality,
          social_security_no, birth_date, gender, mother_name, qualification,
          qualification_file, job_title, courses, job, mobile, email,
          passport_number, passport_file, location_file, picture, cv
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
          $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30
        )
      `, [
        legacyId, firstName, secondName, middleName, lastName,
        firstNameEn, secondNameEn, middleNameEn, lastNameEn,
        fullNameAr, fullNameEn, jstaIdNum, nationalId, nationality,
        socialSecurityNo, birthDate, gender, motherName, qualification,
        qualificationFile, jobTitle, courses, job, mobile, email,
        passportNumber, passportFile, locationFile, picture, cv
      ]);
      
      imported++;
      if (imported % 500 === 0) {
        console.log(`Imported ${imported} employees...`);
      }
      
    } catch (err) {
      skipped++;
      errors.push({ index: i, error: err.message });
    }
  }
  
  console.log('\n=== Import Summary ===');
  console.log('Total records found:', records.length);
  console.log('Successfully imported:', imported);
  console.log('Skipped:', skipped);
  
  if (errors.length > 0 && errors.length <= 20) {
    console.log('\nErrors:');
    errors.forEach(e => console.log(`  Record ${e.index}: ${e.error}`));
  } else if (errors.length > 20) {
    console.log('\nFirst 20 errors:');
    errors.slice(0, 20).forEach(e => console.log(`  Record ${e.index}: ${e.error}`));
  }
  
  // Get count by gender
  const genderResult = await pool.query(`
    SELECT gender, COUNT(*) as count FROM people WHERE legacy_id IS NOT NULL GROUP BY gender
  `);
  console.log('\nEmployees by gender:');
  genderResult.rows.forEach(r => console.log(`  ${r.gender || 'Unknown'}: ${r.count}`));
  
  await pool.end();
}

main().catch(console.error);
