/**
 * r2.ts — Cloudflare R2 file storage helpers (S3-compatible).
 *
 * Uses AWS SDK v3 S3 client pointed at R2's S3-compatible endpoint.
 * All operations are gated on R2 being configured via env vars.
 */

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export type R2Config = {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  publicUrl?: string; // optional public bucket URL (e.g. https://files.filetrail.app)
};

export function createR2Client(config: R2Config): S3Client {
  return new S3Client({
    region: 'auto',
    endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
}

export function r2ConfigFromEnv(): R2Config | null {
  const accountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID?.trim();
  const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY?.trim();
  const bucket = process.env.CLOUDFLARE_R2_BUCKET?.trim();
  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) return null;
  return {
    accountId,
    accessKeyId,
    secretAccessKey,
    bucket,
    publicUrl: process.env.CLOUDFLARE_R2_PUBLIC_URL?.trim() || undefined,
  };
}

/**
 * Returns a pre-signed PUT URL the mobile client can upload directly to R2.
 * Expires in 15 minutes.
 */
export async function getUploadUrl(
  client: S3Client,
  bucket: string,
  key: string,
  mimeType: string,
): Promise<string> {
  const cmd = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: mimeType,
  });
  return getSignedUrl(client, cmd, { expiresIn: 900 });
}

/**
 * Returns a pre-signed GET URL valid for 1 hour.
 */
export async function getDownloadUrl(
  client: S3Client,
  bucket: string,
  key: string,
): Promise<string> {
  const cmd = new GetObjectCommand({ Bucket: bucket, Key: key });
  return getSignedUrl(client, cmd, { expiresIn: 3600 });
}

/**
 * Deletes an object from R2. Silent on missing key.
 */
export async function deleteObject(
  client: S3Client,
  bucket: string,
  key: string,
): Promise<void> {
  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}

/**
 * Returns whether an object currently exists in R2.
 */
export async function objectExists(
  client: S3Client,
  bucket: string,
  key: string,
): Promise<boolean> {
  try {
    await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return true;
  } catch (error) {
    if (
      (typeof error === 'object' &&
        error !== null &&
        '$metadata' in error &&
        typeof (error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode === 'number' &&
        (error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode === 404)
    ) {
      return false;
    }
    throw error;
  }
}

// Sanitize a path segment: keep alphanumerics, spaces, hyphens, underscores,
// dots. Collapse runs of unsafe chars into a single underscore.
function safeSegment(value: string | undefined, fallback: string): string {
  if (!value) return fallback;
  return (
    value
      .trim()
      .replace(/[^a-zA-Z0-9 ._-]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_+|_+$/g, '')
      .substring(0, 100) || fallback
  );
}

// Sanitize an email for use as the top-level folder. Keeps the @ so the
// folder reads as the actual address (R2/S3 keys allow @ safely).
function safeEmailSegment(email: string): string {
  return (
    email
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9@._+-]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_+|_+$/g, '')
      .substring(0, 100) || 'unknown-user'
  );
}

/**
 * Derives the R2 object key for a document.
 *
 * With a user email: {email}/{sanitized-title}/{sanitized-title}.{ext}
 *   - top-level folder is the owner's email address
 *   - per-document folder carries the human-readable document title
 *
 * Without an email (older app builds): documents/{documentId}/{title}.{ext}
 *   - documentId keeps each key globally unique (UUID)
 *
 * Note: title-based keys mean two documents with the exact same title share
 * a key. The client stores the returned key (storageUrl) per document, so
 * downloads always resolve, but identical titles will overwrite each other
 * in the bucket.
 */
export function documentKey(
  documentId: string,
  mimeType: string,
  title?: string,
  userEmail?: string,
): string {
  const ext = mimeType.split('/')[1]?.split('+')[0] ?? 'bin';
  const safeName = safeSegment(title, 'document');
  if (userEmail) {
    return `${safeEmailSegment(userEmail)}/${safeName}/${safeName}.${ext}`;
  }
  return `documents/${documentId}/${safeName}.${ext}`;
}
