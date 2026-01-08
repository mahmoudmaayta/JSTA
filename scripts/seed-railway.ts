/**
 * Railway Database Seed Script
 * 
 * This script seeds the Railway PostgreSQL database with the admin user.
 * Run this after deploying to Railway if the database is empty.
 * 
 * Usage:
 *   DATABASE_URL="postgresql://..." npx tsx scripts/seed-railway.ts
 * 
 * Or set DATABASE_URL in your environment and run:
 *   npx tsx scripts/seed-railway.ts
 */

import { drizzle } from "drizzle-orm/node-postgres";
import pkg from "pg";
const { Pool } = pkg;
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { users, offices, branches, documents, licenseRenewals, people, payments } from "../shared/schema.js";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL environment variable is required");
  console.error("");
  console.error("Usage:");
  console.error('  DATABASE_URL="postgresql://user:pass@host:port/db" npx tsx scripts/seed-railway.ts');
  process.exit(1);
}

async function seedDatabase() {
  console.log("🚀 Starting Railway database seed...");
  console.log("");

  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: {
      rejectUnauthorized: false, // Railway uses self-signed certs
    },
    connectionTimeoutMillis: 10000,
  });

  const db = drizzle(pool);

  try {
    // Test connection
    console.log("🔄 Testing database connection...");
    await pool.query("SELECT 1");
    console.log("✅ Database connection successful");
    console.log("");

    // Check if admin user exists
    console.log("🔍 Checking for existing admin user...");
    const existingAdmin = await db
      .select()
      .from(users)
      .where(eq(users.email, "atallaabutaha@gmail.com"))
      .limit(1);

    if (existingAdmin.length > 0) {
      console.log("ℹ️  Admin user already exists, skipping seed");
    } else {
      console.log("📝 Creating admin user...");
      const passwordHash = await bcrypt.hash("Admin123", 10);
      
      await db.insert(users).values({
        email: "atallaabutaha@gmail.com",
        passwordHash,
        role: "ADMIN",
        officeId: null,
      });
      
      console.log("✅ Admin user created successfully!");
      console.log("");
      console.log("   📧 Email: atallaabutaha@gmail.com");
      console.log("   🔑 Password: Admin123");
      console.log("");
      console.log("   ⚠️  Please change the password after first login!");
    }

    // Show table counts
    console.log("");
    console.log("📊 Current database status:");
    
    const tables = [
      { name: "users", table: users },
      { name: "offices", table: offices },
      { name: "branches", table: branches },
      { name: "documents", table: documents },
      { name: "license_renewals", table: licenseRenewals },
      { name: "people", table: people },
      { name: "payments", table: payments },
    ];

    for (const { name, table } of tables) {
      try {
        const result = await db.select().from(table);
        console.log(`   ${name}: ${result.length} records`);
      } catch (e) {
        console.log(`   ${name}: (table may not exist yet)`);
      }
    }

    console.log("");
    console.log("✅ Database seed completed successfully!");

  } catch (error: any) {
    console.error("");
    console.error("❌ Database seed failed:", error.message);
    
    if (error.message.includes("relation") && error.message.includes("does not exist")) {
      console.error("");
      console.error("💡 It looks like the schema hasn't been pushed yet.");
      console.error("   Run this command first:");
      console.error('   DATABASE_URL="your_url" npm run db:push');
    }
    
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seedDatabase();