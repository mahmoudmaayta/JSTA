import { config } from "dotenv";
config();

import { S3Client, PutObjectCommand, ListObjectsV2Command, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { drizzle } from "drizzle-orm/node-postgres";
import pkg from "pg";
const { Pool } = pkg;
import { eq, desc } from "drizzle-orm";
import fs from "fs";
import { documents, offices } from "../shared/schema.js";

async function testIntegration() {
  console.log("\n" + "=".repeat(60));
  console.log("  S3 + Database Integration Test");
  console.log("=".repeat(60) + "\n");

  // Connect to S3
  const s3Client = new S3Client({
    endpoint: process.env.S3_ENDPOINT,
    region: process.env.S3_REGION || "us-east-1",
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID!,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
    },
  });
  const bucket = process.env.S3_BUCKET_NAME!;

  // Connect to Database
  console.log("→ Connecting to database...");
  console.log("  DATABASE_URL:", process.env.DATABASE_URL ? process.env.DATABASE_URL.substring(0, 40) + "..." : "NOT SET");
  
  const pool = new Pool({ 
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 10000,
  });
  const db = drizzle(pool);

  try {
    // Test DB connection first
    console.log("→ Testing database connection...");
    await pool.query("SELECT 1");
    console.log("✓ Database connected!");

    // 1. Get a sample office from database
    console.log("\n→ Fetching a sample office from database...");
    const sampleOffices = await db.select().from(offices).limit(1);
    if (sampleOffices.length === 0) {
      console.log("✗ No offices found in database");
      process.exit(1);
    }
    const office = sampleOffices[0];
    console.log("✓ Found office:", office.tradeNameEn || office.tradeNameAr, "(ID:", office.id + ")");

    // 2. Upload test file to S3
    const testFile = fs.readFileSync("test_files/commercial_registry.pdf");
    const testKey = "test-integration/" + Date.now() + "-test-document.pdf";
    
    console.log("\n→ Uploading test file to S3...");
    await s3Client.send(new PutObjectCommand({
      Bucket: bucket,
      Key: testKey,
      Body: testFile,
      ContentType: "application/pdf",
    }));
    const s3Url = "s3://" + bucket + "/" + testKey;
    console.log("✓ File uploaded:", s3Url);

    // 3. Create document record in database linked to office
    console.log("\n→ Creating document record in database...");
    const [newDoc] = await db.insert(documents).values({
      officeId: office.id,
      renewalId: null,
      category: "COMMERCIAL_REGISTRY",
      filePath: s3Url,
      originalFilename: "test-document.pdf",
      uploadedByUserId: null,
    }).returning();
    console.log("✓ Document record created (ID:", newDoc.id + ")");

    // 4. Verify the link by querying
    console.log("\n→ Verifying database-S3 link...");
    const docs = await db.select().from(documents).where(eq(documents.officeId, office.id)).orderBy(desc(documents.uploadedAt)).limit(5);
    console.log("✓ Found", docs.length, "document(s) for office", office.id);
    docs.forEach(doc => {
      const isS3 = doc.filePath.startsWith("s3://");
      console.log("   -", doc.originalFilename, isS3 ? "(S3)" : "(Local)", doc.category);
    });

    // 5. List S3 bucket contents
    console.log("\n→ Listing S3 bucket contents...");
    const listResult = await s3Client.send(new ListObjectsV2Command({ Bucket: bucket, MaxKeys: 10 }));
    if (listResult.Contents) {
      console.log("✓ S3 bucket has", listResult.Contents.length, "file(s):");
      listResult.Contents.forEach(obj => {
        console.log("   -", obj.Key, "(" + Math.round((obj.Size || 0) / 1024) + " KB)");
      });
    }

    // 6. Cleanup - delete test document from DB and S3
    console.log("\n→ Cleaning up test data...");
    await db.delete(documents).where(eq(documents.id, newDoc.id));
    await s3Client.send(new DeleteObjectCommand({ Bucket: bucket, Key: testKey }));
    console.log("✓ Test document deleted from database and S3");

    console.log("\n" + "=".repeat(60));
    console.log("  ✓ Integration test passed!");
    console.log("=".repeat(60));
    console.log("\nDatabase and S3 are correctly linked:");
    console.log("  • Files upload to: s3://" + bucket + "/category/filename");
    console.log("  • Database stores: officeId + filePath (S3 URL)");
    console.log("  • Each office's documents are tracked in 'documents' table\n");

  } catch (error: any) {
    console.log("\n✗ Integration test failed!");
    console.log("  Error name:", error.name);
    console.log("  Error message:", error.message);
    if (error.code) console.log("  Error code:", error.code);
    console.log("");
    process.exit(1);
  } finally {
    await pool.end();
  }
}

testIntegration();
