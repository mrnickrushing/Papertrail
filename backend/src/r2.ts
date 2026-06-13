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
  ListObjectsV2Command,
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
 * Uploads a raw buffer directly to R2 (used for email attachments).
 */
export async function uploadBuffer(
  client: S3Client,
  bucket: string,
  key: string,
  content: Buffer,
  mimeType: string,
): Promise<void> {
  await client.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: content,
    ContentType: mimeType,
  }));
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

export async function headObjectInfo(
  client: S3Client,
  bucket: string,
  key: string,
): Promise<{ contentLength?: number; contentType?: string; lastModified?: string } | null> {
  try {
    const response = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return {
      contentLength: typeof response.ContentLength === 'number' ? response.ContentLength : undefined,
      contentType: response.ContentType ?? undefined,
      lastModified: response.LastModified?.toISOString(),
    };
  } catch (error) {
    if (
      (typeof error === 'object' &&
        error !== null &&
        '$metadata' in error &&
        typeof (error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode === 'number' &&
        (error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode === 404)
    ) {
      return null;
    }
    throw error;
  }
}

export async function listObjectKeys(
  client: S3Client,
  bucket: string,
  prefix: string,
): Promise<string[]> {
  const keys: string[] = [];
  let continuationToken: string | undefined;

  do {
    const response = await client.send(new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: prefix,
      ContinuationToken: continuationToken,
    }));
    for (const item of response.Contents ?? []) {
      if (item.Key) keys.push(item.Key);
    }
    continuationToken = response.IsTruncated ? response.NextContinuationToken : undefined;
  } while (continuationToken);

  return keys;
}

export function storageUrlToKey(storageUrl: string | undefined): string | null {
  if (!storageUrl) return null;
  const match = storageUrl.match(/^r2:\/\/[^/]+\/(.+)$/i);
  return match ? match[1] : null;
}

export function mimeTypeFromStorageKey(key: string): string {
  const extension = key.split('.').pop()?.toLowerCase() ?? '';
  switch (extension) {
    case 'pdf':
      return 'application/pdf';
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'heic':
      return 'image/heic';
    case 'heif':
      return 'image/heif';
    case 'webp':
      return 'image/webp';
    case 'gif':
      return 'image/gif';
    case 'tif':
    case 'tiff':
      return 'image/tiff';
    default:
      return 'application/octet-stream';
  }
}

export function normalizeStorageCategory(value: string): string {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, '');

  if (normalized === 'receipt' || normalized.includes('receipt')) return 'receipt';
  if (normalized === 'bill' || normalized.includes('bill')) return 'bill';
  if (normalized === 'contract' || normalized.includes('contract')) return 'contract';
  if (normalized === 'id' || normalized === 'ids' || normalized.includes('ident')) return 'id';
  if (normalized === 'warranty' || normalized.includes('warrant')) return 'warranty';
  if (normalized === 'medical' || normalized.includes('med') || normalized.includes('health')) return 'medical';
  if (normalized === 'tax' || normalized.includes('tax')) return 'tax';
  if (normalized === 'work' || normalized.includes('work') || normalized.includes('job')) return 'work';
  if (normalized === 'retirement' || normalized.includes('retirement') || normalized.includes('401k') || normalized.includes('ira')) return 'retirement';
  if (normalized === 'insurance' || normalized.includes('insur')) return 'insurance';
  if (normalized === 'legal' || normalized.includes('legal')) return 'legal';
  if (normalized === 'vehicle' || normalized.includes('vehicle') || normalized.includes('auto') || normalized.includes('car')) return 'vehicle';
  if (normalized === 'property' || normalized.includes('property') || normalized.includes('home') || normalized.includes('house') || normalized.includes('mortgage')) return 'property';
  if (normalized === 'education' || normalized.includes('school') || normalized.includes('education')) return 'education';
  if (normalized === 'travel' || normalized.includes('travel') || normalized.includes('trip')) return 'travel';
  if (normalized === 'pet' || normalized.includes('pet')) return 'pet';
  return 'other';
}

export function parseEmailStorageKey(
  key: string,
  email: string,
): { category: string; ownerName: string; title: string; mimeType: string } | null {
  const parts = key.split('/');
  if (parts.length < 4) return null;
  const [keyEmail, category, ownerName, ...fileParts] = parts;
  if (keyEmail.toLowerCase() !== email.toLowerCase()) return null;
  const fileName = fileParts.join('/');
  if (!fileName) return null;
  const title = fileName.replace(/\.[^/.]+$/, '') || 'Document';
  return {
    category: normalizeStorageCategory(category),
    ownerName,
    title,
    mimeType: mimeTypeFromStorageKey(fileName),
  };
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

function safeCategorySegment(category: string | undefined): string {
  return (
    category
      ?.trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_+|_+$/g, '')
      .substring(0, 60) || 'other'
  );
}

/**
 * Derives the R2 object key for a document.
 *
 * With a user email: {email}/{category}/{owner-name}/{title}.{ext}
 *   - top-level folder is the owner's email address
 *   - second-level folder groups by document category
 *   - third-level folder groups by the account holder's name
 *   - filename is the human-readable document title
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
  category?: string,
  ownerName?: string,
): string {
  const ext = mimeType.split('/')[1]?.split('+')[0] ?? 'bin';
  const safeName = safeSegment(title, 'document');
  if (userEmail) {
    const safeCategory = safeCategorySegment(category);
    const safeOwnerName = safeSegment(ownerName, 'unknown-person');
    return `${safeEmailSegment(userEmail)}/${safeCategory}/${safeOwnerName}/${safeName}.${ext}`;
  }
  return `documents/${documentId}/${safeName}.${ext}`;
}
