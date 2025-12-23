const fs = require('fs');
const path = require('path');
const config = require('./config.cjs');

function transformEmployees(legacyEmployees, officeIdMapping) {
  console.log(`Transforming ${legacyEmployees.length} employees...`);
  
  const transformed = [];
  const skipped = [];
  
  for (const emp of legacyEmployees) {
    try {
      const newOfficeId = officeIdMapping[emp.offID];
      if (!newOfficeId) {
        skipped.push({ id: emp.id, type: 'employee', error: `No mapping for office ID: ${emp.offID}` });
        continue;
      }
      
      const nameParts = [
        cleanString(emp.name),
        cleanString(emp.sName),
        cleanString(emp.mName),
        cleanString(emp.lName)
      ].filter(Boolean);
      const fullNameAr = nameParts.length > 0 ? nameParts.join(' ') : `Employee ${emp.id}`;
      
      const nameEnParts = [
        cleanString(emp.nameEn),
        cleanString(emp.sNameEn),
        cleanString(emp.mNameEn),
        cleanString(emp.lNameEn)
      ].filter(Boolean);
      const fullNameEn = nameEnParts.length > 0 ? nameEnParts.join(' ') : null;
      
      const nationality = config.nationalityMapping[emp.nationality] || emp.nationality || null;
      const jobTitle = config.jobTitleMapping[emp.JobTitle] || emp.JobTitle?.toString() || null;
      
      const person = {
        legacy_id: emp.id,
        legacy_table: 'employees',
        legacy_office_id: emp.offID,
        office_id: newOfficeId,
        renewal_id: null,
        full_name_ar: fullNameAr,
        full_name_en: fullNameEn,
        national_id: cleanString(emp.NationalityNum) || null,
        social_security_no: cleanString(emp.SocialSecurityNum) || null,
        nationality: nationality,
        gender: emp.sex === 'M' || emp.sex === '1' ? 'male' : emp.sex === 'F' || emp.sex === '2' ? 'female' : null,
        mother_name: cleanString(emp.MotherName) || null,
        mobile: null,
        birth_date: emp.birthdate || null,
        current_position: jobTitle,
        start_date: emp.startDate || null,
        role_type: 'EMPLOYEE',
        jsta_id_number: cleanString(emp.jstaIdNum) || null
      };
      
      transformed.push(person);
    } catch (err) {
      skipped.push({ id: emp.id, type: 'employee', error: err.message });
    }
  }
  
  return { transformed, skipped };
}

function transformOwners(legacyOwners, officeIdMapping) {
  console.log(`Transforming ${legacyOwners.length} owners...`);
  
  const transformed = [];
  const skipped = [];
  
  for (const owner of legacyOwners) {
    try {
      const newOfficeId = officeIdMapping[owner.offID];
      if (!newOfficeId) {
        skipped.push({ id: owner.id, type: 'owner', error: `No mapping for office ID: ${owner.offID}` });
        continue;
      }
      
      const nameParts = [
        cleanString(owner.name),
        cleanString(owner.sName),
        cleanString(owner.mName),
        cleanString(owner.lName)
      ].filter(Boolean);
      const fullNameAr = nameParts.length > 0 ? nameParts.join(' ') : `Owner ${owner.id}`;
      
      const nationality = config.nationalityMapping[owner.Nationality] || owner.Nationality || null;
      
      const person = {
        legacy_id: owner.id,
        legacy_table: 'owners',
        legacy_office_id: owner.offID,
        office_id: newOfficeId,
        renewal_id: null,
        full_name_ar: fullNameAr,
        full_name_en: null,
        national_id: null,
        social_security_no: cleanString(owner.SocialNum) || null,
        nationality: nationality,
        gender: null,
        mother_name: null,
        mobile: cleanString(owner.phone) || null,
        birth_date: null,
        current_position: 'شريك',
        start_date: owner.dateStart || null,
        role_type: 'PARTNER',
        ownership_percentage: cleanString(owner.ValueQuota) || null,
        passport_number: cleanString(owner.PassportNumber) || null
      };
      
      transformed.push(person);
    } catch (err) {
      skipped.push({ id: owner.id, type: 'owner', error: err.message });
    }
  }
  
  return { transformed, skipped };
}

function cleanString(val) {
  if (val === null || val === undefined || val === '') return null;
  if (typeof val !== 'string') val = String(val);
  return val.trim().replace(/\s+/g, ' ') || null;
}

async function main() {
  const employeesFile = path.join(config.outputDir, 'employees.json');
  const ownersFile = path.join(config.outputDir, 'owners.json');
  const officesFile = path.join(config.outputDir, 'offices-transformed.json');
  
  if (!fs.existsSync(officesFile)) {
    console.error('Run previous scripts first!');
    process.exit(1);
  }
  
  const transformedOffices = JSON.parse(fs.readFileSync(officesFile, 'utf8'));
  const officeIdMapping = {};
  transformedOffices.forEach((office, index) => {
    officeIdMapping[office.legacy_id] = index + 1;
  });
  
  let allTransformed = [];
  let allSkipped = [];
  
  if (fs.existsSync(employeesFile)) {
    const legacyEmployees = JSON.parse(fs.readFileSync(employeesFile, 'utf8'));
    const { transformed, skipped } = transformEmployees(legacyEmployees, officeIdMapping);
    allTransformed.push(...transformed);
    allSkipped.push(...skipped);
    console.log(`  Employees - Transformed: ${transformed.length}, Skipped: ${skipped.length}`);
  }
  
  if (fs.existsSync(ownersFile)) {
    const legacyOwners = JSON.parse(fs.readFileSync(ownersFile, 'utf8'));
    const { transformed, skipped } = transformOwners(legacyOwners, officeIdMapping);
    allTransformed.push(...transformed);
    allSkipped.push(...skipped);
    console.log(`  Owners - Transformed: ${transformed.length}, Skipped: ${skipped.length}`);
  }
  
  console.log(`\nTotal People: ${allTransformed.length}`);
  
  const outputFile = path.join(config.outputDir, 'people-transformed.json');
  fs.writeFileSync(outputFile, JSON.stringify(allTransformed, null, 2));
  
  const skippedFile = path.join(config.outputDir, 'people-skipped.json');
  fs.writeFileSync(skippedFile, JSON.stringify(allSkipped, null, 2));
  
  console.log(`Output saved to: ${outputFile}`);
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { transformEmployees, transformOwners };
