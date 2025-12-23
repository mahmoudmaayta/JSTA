const fs = require('fs');
const path = require('path');
const config = require('./config.cjs');

function transformRenewals(legacyRenewals, officeIdMapping) {
  console.log(`Transforming ${legacyRenewals.length} renewals...`);
  
  const transformed = [];
  const skipped = [];
  
  for (const renewal of legacyRenewals) {
    try {
      const newOfficeId = officeIdMapping[renewal.offId];
      if (!newOfficeId) {
        skipped.push({ id: renewal.id, error: `No mapping for office ID: ${renewal.offId}` });
        continue;
      }
      
      const newRenewal = {
        legacy_id: renewal.id,
        legacy_office_id: renewal.offId,
        office_id: newOfficeId,
        year: renewal.renewalYear,
        status: 'FINAL_APPROVED',
        ministry_document_path: null,
        official_license_url: null,
        expiry_date: renewal.renealEndDate || null,
        admin_comment: cleanString(renewal.notes) || null,
        reviewer_notes: null,
        office_form_completed: true,
        staff_form_completed: true,
        commitment_form_completed: true,
        submitted_at: renewal.renewalDate || null,
        voucher_number: cleanString(renewal.voucherNum) || null,
        voucher_file: cleanString(renewal.voucherFile) || null,
        created_by: renewal.createdBy || null,
        created_on: renewal.createdOn || null
      };
      
      transformed.push(newRenewal);
    } catch (err) {
      skipped.push({ id: renewal.id, error: err.message });
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
  const renewalsFile = path.join(config.outputDir, 'annual_renewals.json');
  const officesFile = path.join(config.outputDir, 'offices-transformed.json');
  
  if (!fs.existsSync(renewalsFile) || !fs.existsSync(officesFile)) {
    console.error('Run previous scripts first!');
    process.exit(1);
  }
  
  const legacyRenewals = JSON.parse(fs.readFileSync(renewalsFile, 'utf8'));
  const transformedOffices = JSON.parse(fs.readFileSync(officesFile, 'utf8'));
  
  const officeIdMapping = {};
  transformedOffices.forEach((office, index) => {
    officeIdMapping[office.legacy_id] = index + 1;
  });
  
  const { transformed, skipped } = transformRenewals(legacyRenewals, officeIdMapping);
  
  const renewalsByYear = {};
  for (const r of transformed) {
    renewalsByYear[r.year] = (renewalsByYear[r.year] || 0) + 1;
  }
  console.log('\nRenewals by Year:');
  Object.keys(renewalsByYear).sort().forEach(year => {
    console.log(`  ${year}: ${renewalsByYear[year]} renewals`);
  });
  
  const outputFile = path.join(config.outputDir, 'renewals-transformed.json');
  fs.writeFileSync(outputFile, JSON.stringify(transformed, null, 2));
  
  const skippedFile = path.join(config.outputDir, 'renewals-skipped.json');
  fs.writeFileSync(skippedFile, JSON.stringify(skipped, null, 2));
  
  console.log(`\nOutput saved to: ${outputFile}`);
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { transformRenewals };
