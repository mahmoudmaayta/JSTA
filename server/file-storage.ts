import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Storage } from "@google-cloud/storage";
import fs from "fs";
import path from "path";

// Check if we're in a deployed environment (production)
const isDeployed = () => {
  return !!process.env.REPLIT_DEPLOYMENT;
};

// Check if external S3 (Railway) is configured
const isExternalS3Enabled = () => {
  return !!(
    process.env.S3_BUCKET_NAME &&
    process.env.S3_ACCESS_KEY_ID &&
    process.env.S3_SECRET_ACCESS_KEY
  );
};

// Check if Replit App Storage (GCS) is available
const isReplitStorageEnabled = () => {
  return !!(
    process.env.PRIVATE_OBJECT_DIR ||
    process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID
  );
};

// Determine which storage backend to use
const getStorageBackend = (): "s3" | "replit" | "local" => {
  // In production deployment, prefer external S3 if configured
  if (isDeployed() && isExternalS3Enabled()) {
    return "s3";
  }
  // In development, use Replit App Storage if available
  if (!isDeployed() && isReplitStorageEnabled()) {
    return "replit";
  }
  // If S3 is configured (even in dev), use it
  if (isExternalS3Enabled()) {
    return "s3";
  }
  // Fall back to local file system
  return "local";
};

// Legacy function for backward compatibility
const isS3Enabled = () => {
  return isExternalS3Enabled();
};

const getS3Client = () => {
  if (!isExternalS3Enabled()) return null;
  
  return new S3Client({
    endpoint: process.env.S3_ENDPOINT || "https://storage.railway.app",
    region: process.env.S3_REGION || "us-east-1",
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID!,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
    },
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
  });
};

// Replit App Storage (GCS) client
const REPLIT_SIDECAR_ENDPOINT = "http://127.0.0.1:1106";

const getReplitStorageClient = () => {
  if (!isReplitStorageEnabled()) return null;
  
  return new Storage({
    credentials: {
      audience: "replit",
      subject_token_type: "access_token",
      token_url: `${REPLIT_SIDECAR_ENDPOINT}/token`,
      type: "external_account",
      credential_source: {
        url: `${REPLIT_SIDECAR_ENDPOINT}/credential`,
        format: {
          type: "json",
          subject_token_field_name: "access_token",
        },
      },
      universe_domain: "googleapis.com",
    },
    projectId: "",
  });
};

const getReplitBucketName = () => {
  if (process.env.PRIVATE_OBJECT_DIR) {
    // Extract bucket name from path like "/bucket-name/private"
    const parts = process.env.PRIVATE_OBJECT_DIR.split("/").filter(Boolean);
    return parts[0] || "";
  }
  return process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID || "";
};

export interface UploadResult {
  fileUrl: string;
  fileName: string;
  isS3: boolean;
}

export async function uploadFile(
  buffer: Buffer,
  originalFilename: string,
  category: string,
  mimeType?: string
): Promise<UploadResult> {
  const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
  const sanitizedFilename = originalFilename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const filename = `${uniqueSuffix}-${sanitizedFilename}`;
  const backend = getStorageBackend();
  
  if (backend === "s3") {
    // External S3 (Railway) storage
    const s3Client = getS3Client()!;
    const key = `${category}/${filename}`;
    
    await s3Client.send(
      new PutObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME!,
        Key: key,
        Body: buffer,
        ContentType: mimeType || "application/octet-stream",
      })
    );
    
    return {
      fileUrl: `s3://${process.env.S3_BUCKET_NAME}/${key}`,
      fileName: originalFilename,
      isS3: true,
    };
  } else if (backend === "replit") {
    // Replit App Storage (GCS)
    const gcsClient = getReplitStorageClient()!;
    const bucketName = getReplitBucketName();
    const key = `${category}/${filename}`;
    
    const bucket = gcsClient.bucket(bucketName);
    const file = bucket.file(key);
    
    await file.save(buffer, {
      contentType: mimeType || "application/octet-stream",
    });
    
    return {
      fileUrl: `gcs://${bucketName}/${key}`,
      fileName: originalFilename,
      isS3: false,
    };
  } else {
    // Local file system storage
    const uploadsDir = path.join(process.cwd(), "uploads", category);
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    
    const filePath = path.join(uploadsDir, filename);
    fs.writeFileSync(filePath, buffer);
    
    return {
      fileUrl: filePath,
      fileName: originalFilename,
      isS3: false,
    };
  }
}

export async function getFileUrl(fileUrl: string): Promise<string> {
  if (fileUrl.startsWith("s3://")) {
    if (!isExternalS3Enabled()) {
      throw new Error("S3 is not configured but file is stored in S3");
    }
    
    const s3Client = getS3Client()!;
    const bucketAndKey = fileUrl.replace("s3://", "");
    const slashIndex = bucketAndKey.indexOf("/");
    const bucket = bucketAndKey.substring(0, slashIndex);
    const key = bucketAndKey.substring(slashIndex + 1);
    
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    });
    
    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    return signedUrl;
  } else if (fileUrl.startsWith("gcs://")) {
    // Replit App Storage (GCS) - generate signed URL via Replit sidecar
    const bucketAndKey = fileUrl.replace("gcs://", "");
    const slashIndex = bucketAndKey.indexOf("/");
    const bucketName = bucketAndKey.substring(0, slashIndex);
    const objectName = bucketAndKey.substring(slashIndex + 1);
    
    const response = await fetch(
      `${REPLIT_SIDECAR_ENDPOINT}/object-storage/signed-object-url`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bucket_name: bucketName,
          object_name: objectName,
          method: "GET",
          expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
        }),
      }
    );
    
    if (!response.ok) {
      throw new Error(`Failed to get signed URL for GCS object`);
    }
    
    const { signed_url } = await response.json();
    return signed_url;
  } else {
    return fileUrl;
  }
}

export async function getFileBuffer(fileUrl: string): Promise<Buffer> {
  if (fileUrl.startsWith("s3://")) {
    if (!isExternalS3Enabled()) {
      throw new Error("S3 is not configured but file is stored in S3");
    }
    
    const s3Client = getS3Client()!;
    const bucketAndKey = fileUrl.replace("s3://", "");
    const slashIndex = bucketAndKey.indexOf("/");
    const bucket = bucketAndKey.substring(0, slashIndex);
    const key = bucketAndKey.substring(slashIndex + 1);
    
    const response = await s3Client.send(
      new GetObjectCommand({
        Bucket: bucket,
        Key: key,
      })
    );
    
    const chunks: Uint8Array[] = [];
    for await (const chunk of response.Body as any) {
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);
  } else if (fileUrl.startsWith("gcs://")) {
    // Replit App Storage (GCS)
    const gcsClient = getReplitStorageClient();
    if (!gcsClient) {
      throw new Error("Replit storage is not available but file is stored in GCS");
    }
    
    const bucketAndKey = fileUrl.replace("gcs://", "");
    const slashIndex = bucketAndKey.indexOf("/");
    const bucketName = bucketAndKey.substring(0, slashIndex);
    const key = bucketAndKey.substring(slashIndex + 1);
    
    const bucket = gcsClient.bucket(bucketName);
    const file = bucket.file(key);
    
    const [contents] = await file.download();
    return contents;
  } else {
    return fs.readFileSync(fileUrl);
  }
}

export async function deleteFile(fileUrl: string): Promise<void> {
  if (fileUrl.startsWith("s3://")) {
    if (!isExternalS3Enabled()) {
      throw new Error("S3 is not configured but file is stored in S3");
    }
    
    const s3Client = getS3Client()!;
    const bucketAndKey = fileUrl.replace("s3://", "");
    const slashIndex = bucketAndKey.indexOf("/");
    const bucket = bucketAndKey.substring(0, slashIndex);
    const key = bucketAndKey.substring(slashIndex + 1);
    
    await s3Client.send(
      new DeleteObjectCommand({
        Bucket: bucket,
        Key: key,
      })
    );
  } else if (fileUrl.startsWith("gcs://")) {
    // Replit App Storage (GCS)
    const gcsClient = getReplitStorageClient();
    if (!gcsClient) {
      throw new Error("Replit storage is not available but file is stored in GCS");
    }
    
    const bucketAndKey = fileUrl.replace("gcs://", "");
    const slashIndex = bucketAndKey.indexOf("/");
    const bucketName = bucketAndKey.substring(0, slashIndex);
    const key = bucketAndKey.substring(slashIndex + 1);
    
    const bucket = gcsClient.bucket(bucketName);
    const file = bucket.file(key);
    await file.delete();
  } else {
    if (fs.existsSync(fileUrl)) {
      fs.unlinkSync(fileUrl);
    }
  }
}

export function isS3StorageEnabled(): boolean {
  return isExternalS3Enabled();
}

export function isCloudStoragePath(filePath: string): boolean {
  return filePath.startsWith("s3://") || filePath.startsWith("gcs://");
}

export function isS3Path(filePath: string): boolean {
  return filePath.startsWith("s3://");
}

export function isGcsPath(filePath: string): boolean {
  return filePath.startsWith("gcs://");
}

export function getActiveStorageBackend(): string {
  return getStorageBackend();
}

export async function fileExists(filePath: string): Promise<boolean> {
  if (filePath.startsWith("s3://")) {
    if (!isExternalS3Enabled()) return false;
    try {
      const s3Client = getS3Client()!;
      const bucketAndKey = filePath.replace("s3://", "");
      const slashIndex = bucketAndKey.indexOf("/");
      const bucket = bucketAndKey.substring(0, slashIndex);
      const key = bucketAndKey.substring(slashIndex + 1);
      
      await s3Client.send(
        new GetObjectCommand({
          Bucket: bucket,
          Key: key,
        })
      );
      return true;
    } catch {
      return false;
    }
  } else if (filePath.startsWith("gcs://")) {
    const gcsClient = getReplitStorageClient();
    if (!gcsClient) return false;
    try {
      const bucketAndKey = filePath.replace("gcs://", "");
      const slashIndex = bucketAndKey.indexOf("/");
      const bucketName = bucketAndKey.substring(0, slashIndex);
      const key = bucketAndKey.substring(slashIndex + 1);
      
      const bucket = gcsClient.bucket(bucketName);
      const file = bucket.file(key);
      const [exists] = await file.exists();
      return exists;
    } catch {
      return false;
    }
  } else {
    return fs.existsSync(filePath);
  }
}
