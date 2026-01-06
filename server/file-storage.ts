import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import fs from "fs";
import path from "path";

const isS3Enabled = () => {
  return !!(
    process.env.S3_BUCKET_NAME &&
    process.env.S3_ACCESS_KEY_ID &&
    process.env.S3_SECRET_ACCESS_KEY
  );
};

const getS3Client = () => {
  if (!isS3Enabled()) return null;
  
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
  
  if (isS3Enabled()) {
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
  } else {
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
    if (!isS3Enabled()) {
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
  } else {
    return fileUrl;
  }
}

export async function getFileBuffer(fileUrl: string): Promise<Buffer> {
  if (fileUrl.startsWith("s3://")) {
    if (!isS3Enabled()) {
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
  } else {
    return fs.readFileSync(fileUrl);
  }
}

export async function deleteFile(fileUrl: string): Promise<void> {
  if (fileUrl.startsWith("s3://")) {
    if (!isS3Enabled()) {
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
  } else {
    if (fs.existsSync(fileUrl)) {
      fs.unlinkSync(fileUrl);
    }
  }
}

export function isS3StorageEnabled(): boolean {
  return isS3Enabled();
}

export function isS3Path(filePath: string): boolean {
  return filePath.startsWith("s3://");
}

export async function fileExists(filePath: string): Promise<boolean> {
  if (isS3Path(filePath)) {
    if (!isS3Enabled()) return false;
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
  } else {
    return fs.existsSync(filePath);
  }
}
