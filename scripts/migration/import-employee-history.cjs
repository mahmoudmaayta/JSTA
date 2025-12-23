const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

function cleanStr(str) {
  if (!str || str === 'Null' || str === 'NULL' || str === '-' || str === '0' || str === '' || str === 'NA') return null;
  return str.trim();
}

function parseDate(dateStr) {
  if (!dateStr || dateStr === '0000-00-00' || dateStr === '0000-00-00 00:00:00' || dateStr === 'Null' || dateStr === '') return null;
  // Extract just the date portion if it's a datetime
  if (dateStr.includes(' ')) dateStr = dateStr.split(' ')[0];
  return dateStr;
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
  // First extract employeehistory from the full dump
  const fullDumpPath = path.join(__dirname, '../../attached_assets/jstaorg_members_(22-12-2025)_1766494354374.sql');
  console.log('Reading full database dump:', fullDumpPath);
  
  const fullContent = fs.readFileSync(fullDumpPath, 'utf8');
  
  // Find the employeehistory INSERT statements
  const historyStartIndex = fullContent.indexOf('INSERT INTO `employeehistory`');
  if (historyStartIndex === -1) {
    console.error('Could not find employeehistory INSERT statements');
    return;
  }
  
  // Get a chunk of the content starting from employeehistory
  const endIndex = fullContent.indexOf('CREATE TABLE', historyStartIndex + 100);
  const historyContent = fullContent.substring(historyStartIndex, endIndex > 0 ? endIndex : historyStartIndex + 5000000);
  
  console.log('Extracting employee history records...');
  const records = extractAllRecords(historyContent);
  console.log('Found', records.length, 'employee history records to import');
  
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  // First, get a mapping of legacy employee IDs to new person IDs
  console.log('Building employee ID mapping...');
  const employeeMapping = new Map();
  const empResult = await pool.query('SELECT id, legacy_id FROM people WHERE legacy_id IS NOT NULL');
  empResult.rows.forEach(row => {
    employeeMapping.set(row.legacy_id, row.id);
  });
  console.log('Found', employeeMapping.size, 'employees with legacy IDs');
  
  // Get a mapping of legacy office IDs to new office IDs
  console.log('Building office ID mapping...');
  const officeMapping = new Map();
  const officeResult = await pool.query('SELECT id, legacy_id FROM offices WHERE legacy_id IS NOT NULL');
  officeResult.rows.forEach(row => {
    officeMapping.set(row.legacy_id, row.id);
  });
  console.log('Found', officeMapping.size, 'offices with legacy IDs');
  
  let imported = 0;
  let skipped = 0;
  let noEmployee = 0;
  let noOffice = 0;
  const errors = [];
  
  for (let i = 0; i < records.length; i++) {
    try {
      const v = parseRecord(records[i]);
      
      if (v.length < 20) {
        skipped++;
        continue;
      }
      
      // Fields from employeehistory table:
      // 0-id, 1-empID, 2-officeID, 3-branchId, 4-dateIn, 5-dateOut, 6-JobTitle, 7-description,
      // 8-LetterAppointment, 9-ContractAppointment, 10-IntelligenceModel, 11-NoCriminalRecord,
      // 12-Permit, 13-PhotoID, 14-BookEnd, 15-HealthInsurance, 16-SocialSecurity, 17-DisclaimersFile,
      // 18-createdOn, 19-createdBy, 20-modfiedOn, 21-modfiedBy
      
      const legacyId = parseInt(v[0]) || null;
      const legacyEmpId = parseInt(v[1]) || null;
      const legacyOfficeId = parseInt(v[2]) || null;
      const branchId = parseInt(v[3]) || null;
      const dateIn = parseDate(v[4]);
      const dateOut = parseDate(v[5]);
      const jobTitle = parseInt(v[6]) || null;
      const description = cleanStr(v[7]);
      const letterAppointment = cleanStr(v[8]);
      const contractAppointment = cleanStr(v[9]);
      const intelligenceModel = cleanStr(v[10]);
      const noCriminalRecord = cleanStr(v[11]);
      const permit = cleanStr(v[12]);
      const photoId = cleanStr(v[13]);
      const bookEnd = cleanStr(v[14]);
      const healthInsurance = cleanStr(v[15]);
      const socialSecurity = cleanStr(v[16]);
      const disclaimersFile = cleanStr(v[17]);
      
      // Map to new IDs
      const personId = employeeMapping.get(legacyEmpId);
      const officeId = officeMapping.get(legacyOfficeId);
      
      if (!personId) {
        noEmployee++;
        continue;
      }
      
      if (!officeId) {
        noOffice++;
        continue;
      }
      
      await pool.query(`
        INSERT INTO employee_work_history (
          legacy_id, person_id, office_id, branch_id, date_in, date_out,
          job_title, description, letter_appointment, contract_appointment,
          intelligence_model, no_criminal_record, permit, photo_id,
          book_end, health_insurance, social_security, disclaimers_file
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18
        )
      `, [
        legacyId, personId, officeId, branchId, dateIn, dateOut,
        jobTitle, description, letterAppointment, contractAppointment,
        intelligenceModel, noCriminalRecord, permit, photoId,
        bookEnd, healthInsurance, socialSecurity, disclaimersFile
      ]);
      
      // Also update the person's officeId with the most recent office assignment
      await pool.query(`
        UPDATE people SET office_id = $1 WHERE id = $2 AND (office_id IS NULL OR office_id = 0)
      `, [officeId, personId]);
      
      imported++;
      if (imported % 1000 === 0) {
        console.log(`Imported ${imported} work history records...`);
      }
      
    } catch (err) {
      skipped++;
      if (errors.length < 20) {
        errors.push({ index: i, error: err.message });
      }
    }
  }
  
  console.log('\n=== Import Summary ===');
  console.log('Total records found:', records.length);
  console.log('Successfully imported:', imported);
  console.log('Skipped (no matching employee):', noEmployee);
  console.log('Skipped (no matching office):', noOffice);
  console.log('Skipped (other):', skipped);
  
  if (errors.length > 0) {
    console.log('\nFirst errors:');
    errors.forEach(e => console.log(`  Record ${e.index}: ${e.error}`));
  }
  
  // Get count of employees now linked to offices
  const linkedResult = await pool.query('SELECT COUNT(*) as count FROM people WHERE office_id IS NOT NULL');
  console.log('\nEmployees linked to offices:', linkedResult.rows[0].count);
  
  await pool.end();
}

main().catch(console.error);
