const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const CITY_MAP = {
  1: 'عمان', 2: 'اربد', 3: 'الزرقاء', 4: 'السلط', 5: 'الصويفية',
  6: 'المفرق', 7: 'الرابية', 8: 'عمان', 15: 'عمان', 25: 'عمان',
  27: 'اربد', 37: 'الزرقاء', 40: 'عمان', 73: 'جبل الحسين',
  75: 'الشميساني', 95: 'الوكالات', 106: 'وصفي التل', 117: 'العبدلي',
  118: 'عمان', 145: 'اربد', 158: 'عمان', 189: 'عمان'
};

function cleanStr(str) {
  if (!str || str === 'Null' || str === 'NULL' || str === '-' || str === '0' || str === '') return null;
  return str.trim();
}

function parseDate(dateStr) {
  if (!dateStr || dateStr === '0000-00-00' || dateStr === 'Null' || dateStr === '') return null;
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
  const sqlPath = path.join(__dirname, '../../attached_assets/officesbranch_1766524752990.sql');
  console.log('Reading SQL file:', sqlPath);
  
  const sqlContent = fs.readFileSync(sqlPath, 'utf8');
  console.log('SQL file size:', sqlContent.length, 'bytes');
  
  const records = extractAllRecords(sqlContent);
  console.log('Found', records.length, 'branch records to import');
  
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  const officesRes = await pool.query('SELECT id, legacy_id FROM offices WHERE legacy_id IS NOT NULL');
  const officeMap = {};
  officesRes.rows.forEach(row => {
    officeMap[row.legacy_id] = row.id;
  });
  console.log('Loaded', Object.keys(officeMap).length, 'offices with legacy IDs');
  
  let imported = 0;
  let skipped = 0;
  let noOffice = 0;
  const errors = [];
  
  for (let i = 0; i < records.length; i++) {
    try {
      const v = parseRecord(records[i]);
      
      if (v.length < 25) {
        skipped++;
        errors.push({ index: i, error: `Only ${v.length} values` });
        continue;
      }
      
      const legacyId = parseInt(v[0]) || null;
      const offIdLegacy = parseInt(v[1]) || null;
      const officeId = officeMap[offIdLegacy];
      
      if (!officeId) {
        noOffice++;
        continue;
      }
      
      const cityId = parseInt(v[15]) || null;
      const regionId = parseInt(v[16]) || null;
      const iataNum = parseInt(v[4]) || null;
      
      await pool.query(`
        INSERT INTO branches (
          legacy_id, office_id, file_num, open_date, close_date,
          iata_number, ministry_file_num,
          manager_first_name, manager_second_name, manager_middle_name, manager_last_name,
          manager_file, phone, fax, mobile, email,
          city_id, city, region_id, region, street, building_number,
          po_box, zip_code, notes, is_legacy
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, true)
      `, [
        legacyId,
        officeId,
        cleanStr(v[2]),
        parseDate(v[3]),
        parseDate(v[22]),
        iataNum ? iataNum.toString() : null,
        cleanStr(v[5]),
        cleanStr(v[6]),
        cleanStr(v[7]),
        cleanStr(v[8]),
        cleanStr(v[9]),
        cleanStr(v[10]),
        cleanStr(v[11]),
        cleanStr(v[12]),
        cleanStr(v[13]),
        cleanStr(v[14]),
        cityId,
        CITY_MAP[cityId] || null,
        regionId,
        null,
        cleanStr(v[17]),
        cleanStr(v[18]),
        v[19] ? v[19].toString() : null,
        cleanStr(v[20]),
        cleanStr(v[21])
      ]);
      
      imported++;
      if (imported % 50 === 0) console.log(`Imported ${imported} branches...`);
    } catch (err) {
      errors.push({ index: i, error: err.message });
    }
  }
  
  console.log('\n=== Import Summary ===');
  console.log('Total records found:', records.length);
  console.log('Successfully imported:', imported);
  console.log('Skipped (parse error):', skipped);
  console.log('No matching office:', noOffice);
  console.log('Errors:', errors.length);
  
  if (errors.length > 0 && errors.length <= 10) {
    console.log('\nErrors:');
    errors.forEach(e => console.log(`  Record ${e.index}: ${e.error}`));
  }
  
  console.log('\n=== Updating Office Branch Flags ===');
  const updateResult = await pool.query(`
    UPDATE offices o SET 
      has_branch = true,
      branch_count = (SELECT COUNT(*) FROM branches b WHERE b.office_id = o.id)
    WHERE EXISTS (SELECT 1 FROM branches b WHERE b.office_id = o.id)
  `);
  console.log('Offices updated with branch flags:', updateResult.rowCount);
  
  const branchCount = await pool.query('SELECT COUNT(*) FROM branches WHERE is_legacy = true');
  console.log('\nTotal legacy branches in database:', branchCount.rows[0].count);
  
  const officesWithBranches = await pool.query('SELECT COUNT(*) FROM offices WHERE has_branch = true');
  console.log('Offices with branches:', officesWithBranches.rows[0].count);
  
  await pool.end();
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
