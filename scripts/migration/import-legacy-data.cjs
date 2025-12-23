const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const CITY_MAP = {
  1: 'عمان', 2: 'اربد', 3: 'الزرقاء', 4: 'العقبة', 5: 'السلط', 6: 'المفرق',
  7: 'عمان', 8: 'عمان', 15: 'عمان', 27: 'اربد', 75: 'عمان', 118: 'عمان',
  145: 'اربد', 158: 'عمان', 189: 'عمان'
};

function cleanStr(str) {
  if (!str || str === 'Null' || str === 'NULL' || str === '-' || str === '0' || str === '') return null;
  return str.trim();
}

function parseDate(dateStr) {
  if (!dateStr || dateStr === '0000-00-00' || dateStr === 'Null' || dateStr === '') return null;
  return dateStr;
}

function parseBool(val) {
  return val === 1 || val === '1' || val === true;
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
  const sqlPath = path.join(__dirname, '../../attached_assets/travelagent_1766501697477.sql');
  console.log('Reading SQL file:', sqlPath);
  
  const sqlContent = fs.readFileSync(sqlPath, 'utf8');
  console.log('SQL file size:', sqlContent.length, 'bytes');
  
  const records = extractAllRecords(sqlContent);
  console.log('Found', records.length, 'records to import');
  
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  let imported = 0;
  let skipped = 0;
  const errors = [];
  
  for (let i = 0; i < records.length; i++) {
    try {
      const v = parseRecord(records[i]);
      
      if (v.length < 50) {
        skipped++;
        errors.push({ index: i, error: `Only ${v.length} values` });
        continue;
      }
      
      // Fields: 0-id, 1-file, 2-IATA, 3-CD, 4-nameAR, 5-name, 6-TradeName, 7-NoTourismPromotion, 
      // 8-MinistryAwqaf, 9-TourismActivity, 10-Brand, 11-tel, 12-fax, 13-mobile, 14-website,
      // 15-email, 16-otherEmail, 17-box, 18-city, 19-region, 20-street, 21-BuildingNo, 22-postal,
      // 23-address, 24-manager, 25-sManName, 26-mManName, 27-lManName, 28-owner, 29-lastRenewalYear,
      // 30-branch, 31-Authorized, 32-AuthorizedSignature, 33-closeDate, 34-nationalNum, 35-openDate,
      // 36-socialSecNum, 37-ministrtFileNum, 38-logo, 39-TourismImported, 40-AirlineTickets,
      // 41-HajjUmrah, 42-DomesticTourism, 43-OutboundTourism, 44-IsIATA, 45-IsUFTTA, 46-IsASTA,
      // 47-IsWTO, 48-BankGuarantee, 49-BankGuaranteeEnd, 50-BranchNum, 51-createdOn, 52-createdBy,
      // 53-modfiedOn, 54-modfiedBy, 55-separate

      const cityCode = parseInt(v[18]) || 1;
      const mainCity = CITY_MAP[cityCode] || 'عمان';
      const tradeNameAr = cleanStr(v[6]) || cleanStr(v[4]) || 'غير محدد';
      
      const params = [
        parseInt(v[0]) || null,                    // 1: legacy_id
        cleanStr(v[1]),                            // 2: registration_number
        tradeNameAr,                               // 3: trade_name_ar
        cleanStr(v[5]),                            // 4: trade_name_en
        cleanStr(v[4]),                            // 5: legal_name_ar
        cleanStr(v[10]),                           // 6: brand
        cleanStr(v[3]),                            // 7: license_category
        v[2] && v[2] !== '0' ? v[2] : null,        // 8: iata_number
        parseBool(parseInt(v[44])),                // 9: is_iata
        parseBool(parseInt(v[45])),                // 10: is_uftaa
        parseBool(parseInt(v[46])),                // 11: is_asta
        parseBool(parseInt(v[47])),                // 12: is_wto
        cleanStr(v[7]),                            // 13: no_tourism_promotion
        cleanStr(v[8]),                            // 14: ministry_awqaf
        parseBool(parseInt(v[39])),                // 15: tourism_imported
        parseBool(parseInt(v[40])),                // 16: airline_tickets
        parseBool(parseInt(v[41])),                // 17: hajj_umrah
        parseBool(parseInt(v[42])),                // 18: domestic_tourism
        parseBool(parseInt(v[43])),                // 19: outbound_tourism
        parseInt(v[48]) || null,                   // 20: bank_guarantee
        parseDate(v[49]),                          // 21: bank_guarantee_end
        mainCity,                                  // 22: main_city
        cityCode,                                  // 23: main_city_code
        parseInt(v[19]) || null,                   // 24: main_area_code
        cleanStr(v[20]),                           // 25: main_street
        cleanStr(v[21]),                           // 26: main_building_number
        cleanStr(v[23]),                           // 27: full_address
        cleanStr(v[11]),                           // 28: phone
        cleanStr(v[13]),                           // 29: mobile
        cleanStr(v[12]),                           // 30: fax
        cleanStr(v[14]),                           // 31: website
        cleanStr(v[15]),                           // 32: main_email
        cleanStr(v[16]),                           // 33: extra_email
        v[17] && v[17] !== '0' ? v[17] : null,     // 34: po_box
        cleanStr(v[22]),                           // 35: postal_code
        cleanStr(v[24]),                           // 36: manager_first_name
        cleanStr(v[25]),                           // 37: manager_second_name
        cleanStr(v[26]),                           // 38: manager_middle_name
        cleanStr(v[27]),                           // 39: manager_last_name
        cleanStr(v[28]),                           // 40: owner
        cleanStr(v[31]),                           // 41: authorized
        cleanStr(v[32]),                           // 42: authorized_signature
        v[34] && v[34] !== '0' ? v[34] : null,     // 43: national_number
        v[36] && v[36] !== '0' ? v[36].toString() : null, // 44: social_security_number
        cleanStr(v[37]),                           // 45: ministry_file_number
        cleanStr(v[38]),                           // 46: logo_path
        parseDate(v[35]),                          // 47: open_date
        parseDate(v[33]),                          // 48: close_date
        parseInt(v[29]) || null,                   // 49: last_renewal_year
        parseBool(parseInt(v[30])),                // 50: has_branch
        parseInt(v[50]) || 0,                      // 51: branch_count
        'ACTIVE',                                  // 52: status
        'Migrated from legacy system'              // 53: admin_comment
      ];
      
      const query = `
        INSERT INTO offices (
          legacy_id, registration_number, trade_name_ar, trade_name_en, legal_name_ar,
          brand, license_category, iata_number, is_iata, is_uftaa, is_asta, is_wto,
          no_tourism_promotion, ministry_awqaf,
          tourism_imported, airline_tickets, hajj_umrah, domestic_tourism, outbound_tourism,
          bank_guarantee, bank_guarantee_end,
          main_city, main_city_code, main_area_code, main_street, main_building_number,
          full_address, phone, mobile, fax, website, main_email, extra_email,
          po_box, postal_code,
          manager_first_name, manager_second_name, manager_middle_name, manager_last_name,
          owner, authorized, authorized_signature,
          national_number, social_security_number, ministry_file_number, logo_path,
          open_date, close_date, last_renewal_year, has_branch, branch_count,
          status, admin_comment
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
          $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
          $21, $22, $23, $24, $25, $26, $27, $28, $29, $30,
          $31, $32, $33, $34, $35, $36, $37, $38, $39, $40,
          $41, $42, $43, $44, $45, $46, $47, $48, $49, $50,
          $51, $52, $53
        )
      `;
      
      await pool.query(query, params);
      imported++;
      
      if (imported % 200 === 0) console.log(`Progress: ${imported}/${records.length}`);
    } catch (err) {
      skipped++;
      if (errors.length < 20) errors.push({ index: i, error: err.message.substring(0, 80) });
    }
  }
  
  console.log('\n=== MIGRATION COMPLETE ===');
  console.log(`Imported: ${imported}`);
  console.log(`Skipped: ${skipped}`);
  
  if (errors.length > 0) {
    console.log('\nErrors:');
    errors.forEach(e => console.log(`  Record ${e.index}: ${e.error}`));
  }
  
  const result = await pool.query('SELECT COUNT(*) as count FROM offices');
  console.log(`\nTotal offices in database: ${result.rows[0].count}`);
  
  const catResult = await pool.query(`
    SELECT license_category, COUNT(*) as count 
    FROM offices GROUP BY license_category ORDER BY count DESC
  `);
  console.log('\nBy License Category:');
  catResult.rows.forEach(r => console.log(`  ${r.license_category || 'NULL'}: ${r.count}`));
  
  const cityResult = await pool.query(`
    SELECT main_city, COUNT(*) as count 
    FROM offices GROUP BY main_city ORDER BY count DESC LIMIT 5
  `);
  console.log('\nBy City (Top 5):');
  cityResult.rows.forEach(r => console.log(`  ${r.main_city}: ${r.count}`));
  
  await pool.end();
}

main().catch(console.error);
