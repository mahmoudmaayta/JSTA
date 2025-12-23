# JSTA Legacy Data Migration

This folder contains scripts to migrate data from the legacy MySQL database to the new PostgreSQL system.

## Overview

The migration process:
1. **Extract** - Parses the legacy SQL dump and extracts data from each table
2. **Transform** - Converts data to match the new PostgreSQL schema
3. **Generate** - Creates SQL statements for import

## Quick Start

```bash
# Run the full migration pipeline
node scripts/migration/run-migration.js

# Or run steps individually:
node scripts/migration/01-extract-data.js
node scripts/migration/02-transform-offices.js
node scripts/migration/03-transform-branches.js
node scripts/migration/04-transform-people.js
node scripts/migration/05-transform-renewals.js
node scripts/migration/06-generate-sql.js
```

## Output Files

After running, check the `output/` directory:

| File | Description |
|------|-------------|
| `offices-transformed.json` | Transformed office data |
| `branches-transformed.json` | Transformed branch data |
| `people-transformed.json` | Combined employees & owners |
| `renewals-transformed.json` | Historical renewal records |
| `migration.sql` | Final SQL for import |
| `*-skipped.json` | Records that couldn't be migrated |

## Schema Mapping

### Offices (travelagent → offices)
- Combines Arabic/English names
- Maps city IDs to city names
- Converts tourism activity codes to enum values
- All imported offices set to ACTIVE status

### Branches (officesbranch → branches)
- Links to new office IDs
- Combines 4 manager name fields into one
- Preserves contact information

### People (employees + owners → people)
- Merges two legacy tables into unified people table
- Sets role_type: EMPLOYEE or PARTNER
- Combines 4 name fields into full_name_ar/en

### Renewals (annual_renewals → license_renewals)
- Historical records marked as FINAL_APPROVED
- Preserves year and expiry dates
- Links to new office IDs

## Important Notes

1. **No user accounts are migrated** - Offices must register fresh for security
2. **Review the SQL** - Check `migration.sql` before running
3. **Backup first** - Always backup your database before migration
4. **Check skipped records** - Review `*-skipped.json` files for issues

## Running the Migration

```bash
# 1. Generate migration files
node scripts/migration/run-migration.js

# 2. Review the output
cat scripts/migration/output/migration.sql | head -100

# 3. Backup your database
pg_dump $DATABASE_URL > backup.sql

# 4. Run the migration
psql $DATABASE_URL < scripts/migration/output/migration.sql
```

## Configuration

Edit `config.js` to customize:
- City ID to name mappings
- Tourism activity mappings
- Job title mappings
- Nationality code mappings

## Troubleshooting

### "No mapping for office ID"
The branch/employee references an office that doesn't exist in the legacy data.

### Encoding issues
The legacy database uses UTF-8. Ensure your terminal supports UTF-8 for Arabic text.

### Missing data
Check the `*-skipped.json` files to see which records couldn't be migrated and why.
