const fs = require('fs');
const path = require('path');
const { parseInsertStatements } = require('./sql-parser.cjs');
const config = require('./config.cjs');

async function extractData() {
  console.log('Starting data extraction from legacy SQL file...\n');
  
  if (!fs.existsSync(config.outputDir)) {
    fs.mkdirSync(config.outputDir, { recursive: true });
  }
  
  const tables = [
    'travelagent',
    'officesbranch',
    'employees',
    'owners',
    'annual_renewals',
    'cities',
    'countries',
    'jobtitle',
    'tourism_activity'
  ];
  
  const extractedData = {};
  
  for (const table of tables) {
    console.log(`Extracting ${table}...`);
    try {
      const records = await parseInsertStatements(config.legacySqlFile, table);
      extractedData[table] = records;
      console.log(`  Found ${records.length} records`);
      
      const outputFile = path.join(config.outputDir, `${table}.json`);
      fs.writeFileSync(outputFile, JSON.stringify(records, null, 2));
    } catch (err) {
      console.log(`  Error extracting ${table}: ${err.message}`);
      extractedData[table] = [];
    }
  }
  
  console.log('\n--- Extraction Summary ---');
  for (const [table, records] of Object.entries(extractedData)) {
    console.log(`${table}: ${records.length} records`);
  }
  
  const summaryFile = path.join(config.outputDir, 'extraction-summary.json');
  fs.writeFileSync(summaryFile, JSON.stringify({
    extractedAt: new Date().toISOString(),
    tables: Object.fromEntries(
      Object.entries(extractedData).map(([t, r]) => [t, r.length])
    )
  }, null, 2));
  
  console.log(`\nData saved to: ${config.outputDir}`);
  return extractedData;
}

if (require.main === module) {
  extractData().catch(console.error);
}

module.exports = { extractData };
