#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const config = require('./config.cjs');
const { extractData } = require('./01-extract-data.cjs');
const { transformOffices } = require('./02-transform-offices.cjs');
const { transformBranches } = require('./03-transform-branches.cjs');
const { transformEmployees, transformOwners } = require('./04-transform-people.cjs');
const { transformRenewals } = require('./05-transform-renewals.cjs');

async function runFullMigration() {
  console.log('='.repeat(60));
  console.log('JSTA Legacy Data Migration Tool');
  console.log('='.repeat(60));
  console.log();
  
  if (!fs.existsSync(config.legacySqlFile)) {
    console.error('ERROR: Legacy SQL file not found!');
    console.error(`Expected: ${config.legacySqlFile}`);
    process.exit(1);
  }
  
  if (!fs.existsSync(config.outputDir)) {
    fs.mkdirSync(config.outputDir, { recursive: true });
  }
  
  console.log('Step 1/6: Extracting data from legacy SQL file...');
  console.log('-'.repeat(40));
  await extractData();
  console.log();
  
  console.log('Step 2/6: Transforming offices...');
  console.log('-'.repeat(40));
  const travelagentFile = path.join(config.outputDir, 'travelagent.json');
  if (fs.existsSync(travelagentFile)) {
    const legacyOffices = JSON.parse(fs.readFileSync(travelagentFile, 'utf8'));
    const { transformed: offices, skipped: officesSkipped } = transformOffices(legacyOffices);
    fs.writeFileSync(path.join(config.outputDir, 'offices-transformed.json'), JSON.stringify(offices, null, 2));
    fs.writeFileSync(path.join(config.outputDir, 'offices-skipped.json'), JSON.stringify(officesSkipped, null, 2));
  }
  console.log();
  
  const officesFile = path.join(config.outputDir, 'offices-transformed.json');
  const transformedOffices = fs.existsSync(officesFile) 
    ? JSON.parse(fs.readFileSync(officesFile, 'utf8')) 
    : [];
  
  const officeIdMapping = {};
  transformedOffices.forEach((office, index) => {
    officeIdMapping[office.legacy_id] = index + 1;
  });
  
  console.log('Step 3/6: Transforming branches...');
  console.log('-'.repeat(40));
  const branchesFile = path.join(config.outputDir, 'officesbranch.json');
  if (fs.existsSync(branchesFile)) {
    const legacyBranches = JSON.parse(fs.readFileSync(branchesFile, 'utf8'));
    const { transformed: branches, skipped: branchesSkipped } = transformBranches(legacyBranches, officeIdMapping);
    fs.writeFileSync(path.join(config.outputDir, 'branches-transformed.json'), JSON.stringify(branches, null, 2));
    fs.writeFileSync(path.join(config.outputDir, 'branches-skipped.json'), JSON.stringify(branchesSkipped, null, 2));
  }
  console.log();
  
  console.log('Step 4/6: Transforming people (employees & owners)...');
  console.log('-'.repeat(40));
  let allPeople = [];
  let allPeopleSkipped = [];
  
  const employeesFile = path.join(config.outputDir, 'employees.json');
  if (fs.existsSync(employeesFile)) {
    const legacyEmployees = JSON.parse(fs.readFileSync(employeesFile, 'utf8'));
    const { transformed, skipped } = transformEmployees(legacyEmployees, officeIdMapping);
    allPeople.push(...transformed);
    allPeopleSkipped.push(...skipped);
  }
  
  const ownersFile = path.join(config.outputDir, 'owners.json');
  if (fs.existsSync(ownersFile)) {
    const legacyOwners = JSON.parse(fs.readFileSync(ownersFile, 'utf8'));
    const { transformed, skipped } = transformOwners(legacyOwners, officeIdMapping);
    allPeople.push(...transformed);
    allPeopleSkipped.push(...skipped);
  }
  
  fs.writeFileSync(path.join(config.outputDir, 'people-transformed.json'), JSON.stringify(allPeople, null, 2));
  fs.writeFileSync(path.join(config.outputDir, 'people-skipped.json'), JSON.stringify(allPeopleSkipped, null, 2));
  console.log(`  Total people: ${allPeople.length}`);
  console.log();
  
  console.log('Step 5/6: Transforming renewals...');
  console.log('-'.repeat(40));
  const renewalsFile = path.join(config.outputDir, 'annual_renewals.json');
  if (fs.existsSync(renewalsFile)) {
    const legacyRenewals = JSON.parse(fs.readFileSync(renewalsFile, 'utf8'));
    const { transformed: renewals, skipped: renewalsSkipped } = transformRenewals(legacyRenewals, officeIdMapping);
    fs.writeFileSync(path.join(config.outputDir, 'renewals-transformed.json'), JSON.stringify(renewals, null, 2));
    fs.writeFileSync(path.join(config.outputDir, 'renewals-skipped.json'), JSON.stringify(renewalsSkipped, null, 2));
  }
  console.log();
  
  console.log('Step 6/6: Generating SQL file...');
  console.log('-'.repeat(40));
  require('./06-generate-sql.cjs');
  console.log();
  
  console.log('='.repeat(60));
  console.log('Migration Complete!');
  console.log('='.repeat(60));
  console.log();
  console.log('Output files:');
  console.log(`  ${config.outputDir}/offices-transformed.json`);
  console.log(`  ${config.outputDir}/branches-transformed.json`);
  console.log(`  ${config.outputDir}/people-transformed.json`);
  console.log(`  ${config.outputDir}/renewals-transformed.json`);
  console.log(`  ${config.outputDir}/migration.sql`);
  console.log();
  console.log('Next steps:');
  console.log('  1. Review the generated migration.sql file');
  console.log('  2. Back up your current database');
  console.log('  3. Run: psql $DATABASE_URL < scripts/migration/output/migration.sql');
}

if (require.main === module) {
  runFullMigration().catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
  });
}

module.exports = { runFullMigration };
