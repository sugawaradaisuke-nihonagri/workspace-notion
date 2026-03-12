/**
 * File storage abstraction.
 *
 * - Development: writes to public/uploads/ (local filesystem)
 * - Production: S3-compatible API (Cloudflare R2, AWS S3, MinIO)
 *
 * Set STORAGE_BACKEND=s3 + S3_* env vars to enable cloud storage.
 */

import { randomUUID } from "crypto";
import path from "path";
import fs from "fs/promises";

export interface UploadResult {
  url: string;
  key: string;
  size: number;
  mimeType: string;
}

const ALLOWED_MIME_TYPES = new Set([
  // Images
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  "image/avif",
  // Video
  "video/mp4",
  "video/webm",
  "video/quicktime",
  // Audio
  "audio/mpeg",
  "audio/wav",
  "audio/ogg",
  "audio/webm",
  // Documents
  "application/pdf",
  "application/zip",
  "text/plain",
  "text/csv",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

function getExtension(mimeType: string): string {
  const map: Record<string, string> = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/gif": ".gif",
    "image/webp": ".webp",
    "image/svg+xml": ".svg",
    "image/avif": ".avif",
    "video/mp4": ".mp4",
    "video/webm": ".webm",
    "video/quicktime": ".mov",
    "audio/mpeg": ".mp3",
    "audio/wav": ".wav",
    "audio/ogg": ".ogg",
    "audio/webm": ".weba",
    "application/pdf": ".pdf",
    "application/zip": ".zip",
    "text/plain": ".txt",
    "text/csv": ".csv",
  };
  return map[mimeType] ?? "";
}

export function validateFile(mimeType: string, size: number): string | null {
  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    return `Unsupported file type: ${mimeType}`;
  }
  if (size > MAX_FILE_SIZE) {
    return `File too large: ${(size / 1024 / 1024).toFixed(1)}MB (max 10MB)`;
  }
  return null;
}

/** Store file locally in public/uploads/ */
async function uploadLocal(
  buffer: Buffer,
  mimeType: string,
): Promise<UploadResult> {
  const key = `${randomUUID()}${getExtension(mimeType)}`;
  const uploadsDir = path.join(process.cwd(), "public", "uploads");
  await fs.mkdir(uploadsDir, { recursive: true });
  await fs.writeFile(path.join(uploadsDir, key), buffer);

  return {
    url: `/uploads/${key}`,
    key,
    size: buffer.length,
    mimeType,
  };
}

/** Store file in S3-compatible storage (requires @aws-sdk/client-s3) */
async function uploadS3(
  buffer: Buffer,
  mimeType: string,
): Promise<UploadResult> {
  // Dynamic import to avoid bundling SDK when not needed
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const sdk = await (Function(
    'return import("@aws-sdk/client-s3")',
  )() as Promise<{
    S3Client: new (config: Record<string, unknown>) => {
      send: (command: unknown) => Promise<unknown>;
    };
    PutObjectCommand: new (input: Record<string, unknown>) => unknown;
  }>);

  const client = new sdk.S3Client({
    region: process.env.S3_REGION ?? "auto",
    endpoint: process.env.S3_ENDPOINT,
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID!,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
    },
  });

  const key = `${randomUUID()}${getExtension(mimeType)}`;
  const bucket = process.env.S3_BUCKET!;

  await client.send(
    new sdk.PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
    }),
  );

  const publicUrl = process.env.S3_PUBLIC_URL
    ? `${process.env.S3_PUBLIC_URL}/${key}`
    : `https://${bucket}.s3.amazonaws.com/${key}`;

  return {
    url: publicUrl,
    key,
    size: buffer.length,
    mimeType,
  };
}

export async function uploadFile(
  buffer: Buffer,
  mimeType: string,
): Promise<UploadResult> {
  const error = validateFile(mimeType, buffer.length);
  if (error) throw new Error(error);

  if (process.env.STORAGE_BACKEND === "s3") {
    return uploadS3(buffer, mimeType);
  }
  return uploadLocal(buffer, mimeType);
}
