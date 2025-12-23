const fs = require('fs');
const path = require('path');
const config = require('./config.cjs');

function transformOffices(legacyOffices) {
  console.log(`Transforming ${legacyOffices.length} offices...`);
  
  const transformed = [];
  const skipped = [];
  
  for (const office of legacyOffices) {
    try {
      const cityName = config.cityMapping[office.city] || office.city?.toString() || null;
      const tourismActivities = office.TourismActivity 
        ? [config.tourismActivityMapping[office.TourismActivity] || 'GENERAL']
        : ['GENERAL'];
      
      const newOffice = {
        legacy_id: office.id,
        trade_name_ar: cleanString(office.nameAR) || cleanString(office.TradeName) || `Office ${office.id}`,
        trade_name_en: cleanString(office.name) || cleanString(office.TradeName) || null,
        legal_name_ar: cleanString(office.TradeName) || null,
        legal_name_registrar: null,
        national_entity_no: cleanString(office.file) || null,
        national_establishment_number: null,
        trademark: cleanString(office.Brand) || null,
        awqaf_approval_no: cleanString(office.MinistryAwqaf) || null,
        social_security_number: null,
        guarantee_expiry_date: null,
        tourism_activities: tourismActivities,
        main_city: cityName,
        main_area: null,
        main_street: cleanString(office.street) || null,
        main_building_number: cleanString(office.BuildingNo) || null,
        phone: cleanString(office.tel) || null,
        mobile: cleanString(office.mobile) || null,
        fax: cleanString(office.fax) || null,
        website: cleanString(office.website) || null,
        main_email: cleanString(office.email) || null,
        extra_email: cleanString(office.otherEmail) || null,
        po_box: office.box?.toString() || null,
        postal_code: cleanString(office.postal) || null,
        status: 'ACTIVE',
        admin_comment: `Migrated from legacy system. Original ID: ${office.id}`,
        iata_code: office.IATA?.toString() || null,
        legacy_file_number: cleanString(office.file) || null,
        last_renewal_year: office.lastRenewalYear || null
      };
      
      transformed.push(newOffice);
    } catch (err) {
      skipped.push({ id: office.id, error: err.message });
    }
  }
  
  console.log(`  Transformed: ${transformed.length}`);
  console.log(`  Skipped: ${skipped.length}`);
  
  return { transformed, skipped };
}

function cleanString(val) {
  if (val === null || val === undefined || val === '') return null;
  if (typeof val !== 'string') val = String(val);
  return val.trim().replace(/\s+/g, ' ') || null;
}

async function main() {
  const inputFile = path.join(config.outputDir, 'travelagent.json');
  
  if (!fs.existsSync(inputFile)) {
    console.error('Run 01-extract-data.js first!');
    process.exit(1);
  }
  
  const legacyOffices = JSON.parse(fs.readFileSync(inputFile, 'utf8'));
  const { transformed, skipped } = transformOffices(legacyOffices);
  
  const outputFile = path.join(config.outputDir, 'offices-transformed.json');
  fs.writeFileSync(outputFile, JSON.stringify(transformed, null, 2));
  
  const skippedFile = path.join(config.outputDir, 'offices-skipped.json');
  fs.writeFileSync(skippedFile, JSON.stringify(skipped, null, 2));
  
  console.log(`\nOutput saved to: ${outputFile}`);
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { transformOffices };
