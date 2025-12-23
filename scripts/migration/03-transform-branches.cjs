const fs = require('fs');
const path = require('path');
const config = require('./config.cjs');

function transformBranches(legacyBranches, officeIdMapping) {
  console.log(`Transforming ${legacyBranches.length} branches...`);
  
  const transformed = [];
  const skipped = [];
  
  for (const branch of legacyBranches) {
    try {
      const newOfficeId = officeIdMapping[branch.offID];
      if (!newOfficeId) {
        skipped.push({ id: branch.id, error: `No mapping for office ID: ${branch.offID}` });
        continue;
      }
      
      const cityName = config.cityMapping[branch.cityID] || branch.cityID?.toString() || null;
      
      const managerParts = [
        cleanString(branch.manager),
        cleanString(branch.sManName),
        cleanString(branch.mManName),
        cleanString(branch.lManName)
      ].filter(Boolean);
      const managerName = managerParts.length > 0 ? managerParts.join(' ') : null;
      
      const newBranch = {
        legacy_id: branch.id,
        legacy_office_id: branch.offID,
        office_id: newOfficeId,
        city: cityName,
        area: null,
        street: cleanString(branch.street) || null,
        building_number: cleanString(branch.BuildingNo) || null,
        manager_name: managerName,
        manager_mobile: cleanString(branch.mobile) || null,
        phone: cleanString(branch.phone) || null,
        fax: cleanString(branch.fax) || null,
        email: cleanString(branch.email) || null,
        file_number: cleanString(branch.FileNum) || null,
        ministry_file_number: cleanString(branch.ministrtFileNum) || null,
        iata_code: branch.IATA?.toString() || null,
        open_date: branch.openDate || null
      };
      
      transformed.push(newBranch);
    } catch (err) {
      skipped.push({ id: branch.id, error: err.message });
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
  const branchesFile = path.join(config.outputDir, 'officesbranch.json');
  const officesFile = path.join(config.outputDir, 'offices-transformed.json');
  
  if (!fs.existsSync(branchesFile) || !fs.existsSync(officesFile)) {
    console.error('Run previous scripts first!');
    process.exit(1);
  }
  
  const legacyBranches = JSON.parse(fs.readFileSync(branchesFile, 'utf8'));
  const transformedOffices = JSON.parse(fs.readFileSync(officesFile, 'utf8'));
  
  const officeIdMapping = {};
  transformedOffices.forEach((office, index) => {
    officeIdMapping[office.legacy_id] = index + 1;
  });
  
  const { transformed, skipped } = transformBranches(legacyBranches, officeIdMapping);
  
  const outputFile = path.join(config.outputDir, 'branches-transformed.json');
  fs.writeFileSync(outputFile, JSON.stringify(transformed, null, 2));
  
  const skippedFile = path.join(config.outputDir, 'branches-skipped.json');
  fs.writeFileSync(skippedFile, JSON.stringify(skipped, null, 2));
  
  console.log(`\nOutput saved to: ${outputFile}`);
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { transformBranches };
