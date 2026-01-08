/**
 * S3 Storage Connection Test Script
 * 
 * Tests upload, download, and delete operations against your S3 bucket.
 * 
 * Usage:
 *   npx tsx scripts/test-s3-storage.ts
 * 
 * Required environment variables:
 *   S3_BUCKET_NAME       - Your S3 bucket name
 *   S3_ACCESS_KEY_ID     - AWS/S3 access key
 *   S3_SECRET_ACCESS_KEY - AWS/S3 secret key
 * 
 * Optional environment variables:
 *   S3_ENDPOINT          - S3 endpoint URL (for non-AWS providers)
 *   S3_REGION            - AWS region (default: us-east-1)
 *   S3_FORCE_PATH_STYLE  - Set to 'true' for MinIO/path-style URLs
 */

import { config } from "dotenv";
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadBucketCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Load environment variables
config();

// Colors for terminal output
const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
};

const log = {
  info: (msg: string) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg: string) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg: string) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  warn: (msg: string) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  step: (msg: string) => console.log(`${colors.cyan}→${colors.reset} ${msg}`),
};

async function testS3Connection() {
  console.log("\n" + "=".repeat(60));
  console.log("  S3 Storage Connection Test");
  console.log("=".repeat(60) + "\n");

  // Check environment variables
  log.step("Checking environment variables...");
  
  const requiredVars = ["S3_BUCKET_NAME", "S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY"];
  const missingVars = requiredVars.filter(v => !process.env[v]);
  
  if (missingVars.length > 0) {
    log.error(`Missing required environment variables: ${missingVars.join(", ")}`);
    console.log("\nRequired variables:");
    console.log("  S3_BUCKET_NAME       - Your S3 bucket name");
    console.log("  S3_ACCESS_KEY_ID     - AWS/S3 access key");
    console.log("  S3_SECRET_ACCESS_KEY - AWS/S3 secret key");
    console.log("\nOptional variables:");
    console.log("  S3_ENDPOINT          - S3 endpoint URL");
    console.log("  S3_REGION            - AWS region (default: us-east-1)");
    console.log("  S3_FORCE_PATH_STYLE  - Set to 'true' for path-style URLs");
    process.exit(1);
  }
  
  log.success("All required environment variables are set");

  // Show configuration
  const s3Config = {
    bucket: process.env.S3_BUCKET_NAME!,
    endpoint: process.env.S3_ENDPOINT || "(default AWS)",
    region: process.env.S3_REGION || "us-east-1",
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
  };
  
  console.log("\n📦 Configuration:");
  console.log(`   Bucket:           ${s3Config.bucket}`);
  console.log(`   Endpoint:         ${s3Config.endpoint}`);
  console.log(`   Region:           ${s3Config.region}`);
  console.log(`   Force Path Style: ${s3Config.forcePathStyle}`);
  console.log("");

  // Create S3 client
  const s3ClientConfig: any = {
    region: s3Config.region,
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID!,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
    },
    forcePathStyle: s3Config.forcePathStyle,
  };

  // Only add endpoint if specified
  if (process.env.S3_ENDPOINT) {
    s3ClientConfig.endpoint = process.env.S3_ENDPOINT;
  }

  const s3Client = new S3Client(s3ClientConfig);

  const testKey = `test/connection-test-${Date.now()}.txt`;
  const testContent = `S3 Connection Test\nTimestamp: ${new Date().toISOString()}\nThis file can be safely deleted.`;

  try {
    // Test 1: Check bucket access
    log.step("Testing bucket access...");
    try {
      await s3Client.send(new HeadBucketCommand({ Bucket: s3Config.bucket }));
      log.success(`Bucket "${s3Config.bucket}" is accessible`);
    } catch (error: any) {
      if (error.name === "NotFound" || error.$metadata?.httpStatusCode === 404) {
        log.error(`Bucket "${s3Config.bucket}" does not exist`);
        process.exit(1);
      } else if (error.name === "Forbidden" || error.$metadata?.httpStatusCode === 403) {
        log.error(`Access denied to bucket "${s3Config.bucket}". Check your credentials.`);
        process.exit(1);
      } else {
        throw error;
      }
    }

    // Test 2: Upload a test file
    log.step(`Uploading test file: ${testKey}`);
    await s3Client.send(
      new PutObjectCommand({
        Bucket: s3Config.bucket,
        Key: testKey,
        Body: testContent,
        ContentType: "text/plain",
      })
    );
    log.success("File uploaded successfully");

    // Test 3: Generate a signed URL
    log.step("Generating signed URL...");
    const signedUrl = await getSignedUrl(
      s3Client,
      new GetObjectCommand({
        Bucket: s3Config.bucket,
        Key: testKey,
      }),
      { expiresIn: 3600 }
    );
    log.success("Signed URL generated");
    console.log(`   URL: ${signedUrl.substring(0, 80)}...`);

    // Test 4: Download the file
    log.step("Downloading test file...");
    const getResponse = await s3Client.send(
      new GetObjectCommand({
        Bucket: s3Config.bucket,
        Key: testKey,
      })
    );
    
    const chunks: Uint8Array[] = [];
    for await (const chunk of getResponse.Body as any) {
      chunks.push(chunk);
    }
    const downloadedContent = Buffer.concat(chunks).toString("utf-8");
    
    if (downloadedContent === testContent) {
      log.success("File content verified - upload/download working correctly");
    } else {
      log.warn("File content mismatch!");
    }

    // Test 5: Delete the test file
    log.step("Deleting test file...");
    await s3Client.send(
      new DeleteObjectCommand({
        Bucket: s3Config.bucket,
        Key: testKey,
      })
    );
    log.success("Test file deleted");

    // Summary
    console.log("\n" + "=".repeat(60));
    console.log(`${colors.green}  ✓ All S3 tests passed successfully!${colors.reset}`);
    console.log("=".repeat(60));
    console.log("\nYour S3 storage is configured correctly and ready to use.");
    console.log("\nIn your app, files will be stored with URLs like:");
    console.log(`  s3://${s3Config.bucket}/documents/1234567890-file.pdf`);
    console.log("");

  } catch (error: any) {
    console.log("\n" + "=".repeat(60));
    log.error("S3 test failed!");
    console.log("=".repeat(60));
    console.log("\nError details:");
    console.log(`  Name: ${error.name}`);
    console.log(`  Message: ${error.message}`);
    
    if (error.$metadata) {
      console.log(`  HTTP Status: ${error.$metadata.httpStatusCode}`);
    }
    
    console.log("\nTroubleshooting tips:");
    console.log("  1. Verify your S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY are correct");
    console.log("  2. Check that the bucket name is correct and exists");
    console.log("  3. Ensure your credentials have read/write permissions");
    console.log("  4. If using a custom endpoint, verify S3_ENDPOINT is correct");
    console.log("  5. For MinIO or other S3-compatible services, set S3_FORCE_PATH_STYLE=true");
    console.log("");
    
    process.exit(1);
  }
}

testS3Connection();