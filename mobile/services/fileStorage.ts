/**
 * fileStorage.ts — Local file storage service
 *
 * Handles saving captured/imported files to the app's private document directory.
 * All paths are relative to FileSystem.documentDirectory.
 *
 * Directory structure:
 *   documents/{documentId}/original.{ext}   — original file
 *   documents/{documentId}/thumb.jpg        — 300×300 thumbnail
 *   documents/{documentId}/pages/{n}.jpg    — PDF page images (Phase 3+)
 */

import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import { Platform } from 'react-native';
import { apiRequest } from './api';

const DOCS_DIR = `${FileSystem.documentDirectory}documents/`;

export async function ensureDocumentDirectory(documentId: string): Promise<string> {
  const dir = `${DOCS_DIR}${documentId}/`;
  const info = await FileSystem.getInfoAsync(dir);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  }
  return dir;
}

/**
 * Saves a file (from camera URI, picker URI, or any temp URI) to the app's
 * private document directory. Returns the permanent local URI.
 */
export async function saveDocumentFile(
  documentId: string,
  sourceUri: string,
  extension: string
): Promise<string> {
  const dir = await ensureDocumentDirectory(documentId);
  const destUri = `${dir}original.${extension.toLowerCase()}`;
  await FileSystem.copyAsync({ from: sourceUri, to: destUri });
  return destUri;
}

/**
 * Generates a 300×300 thumbnail JPEG and saves it alongside the original.
 * Returns the thumbnail URI.
 */
export async function generateThumbnail(
  documentId: string,
  imageUri: string
): Promise<string> {
  const dir = await ensureDocumentDirectory(documentId);
  const thumbUri = `${dir}thumb.jpg`;

  const result = await ImageManipulator.manipulateAsync(
    imageUri,
    [{ resize: { width: 300, height: 300 } }],
    { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
  );

  await FileSystem.copyAsync({ from: result.uri, to: thumbUri });
  return thumbUri;
}

/**
 * Returns the file size in bytes for a given URI. Returns 0 if not found.
 */
export async function getFileSize(uri: string): Promise<number> {
  try {
    const info = await FileSystem.getInfoAsync(uri, { size: true });
    return info.exists && 'size' in info ? (info.size ?? 0) : 0;
  } catch {
    return 0;
  }
}

/**
 * Deletes all files for a document (original + thumb + pages).
 */
export async function deleteDocumentFiles(documentId: string): Promise<void> {
  const dir = `${DOCS_DIR}${documentId}/`;
  const info = await FileSystem.getInfoAsync(dir);
  if (info.exists) {
    await FileSystem.deleteAsync(dir, { idempotent: true });
  }
}

/**
 * Returns the extension from a URI or MIME type.
 */
export function getExtension(uriOrMime: string): string {
  if (/^[\w.+-]+\/[\w.+-]+$/.test(uriOrMime)) {
    // MIME type
    const mime = uriOrMime.toLowerCase();
    if (mime.includes('pdf')) return 'pdf';
    if (mime.includes('png')) return 'png';
    if (mime.includes('jpeg') || mime.includes('jpg')) return 'jpg';
    if (mime.includes('heic')) return 'heic';
    return 'bin';
  }
  // URI
  const cleanUri = uriOrMime.split(/[?#]/)[0];
  const match = cleanUri.match(/\.([a-zA-Z0-9]+)$/);
  return match ? match[1].toLowerCase() : 'bin';
}

/**
 * Re-roots a stale absolute document URI under the CURRENT sandbox directory.
 *
 * iOS assigns each app install a fresh container UUID, so
 * `FileSystem.documentDirectory` (e.g.
 * `/var/.../Containers/Data/Application/<UUID>/Documents/`) changes on every
 * reinstall — including EAS rebuilds. Any absolute URI persisted from a prior
 * install bakes in the old UUID and becomes unreadable
 * (`FileNotReadableException`) even though the underlying file still exists
 * under the new container.
 *
 * This recovers the file by extracting the known-stable relative suffix
 * (`documents/<id>/<filename>`) from the stale path and re-rooting it under
 * today's `documentDirectory`. Returns the repaired URI if the file exists
 * there, or `null` if the URI isn't a stale-but-recoverable local path.
 */
export async function repairStoredUri(uri: string): Promise<string | null> {
  if (!uri || (!uri.startsWith('file://') && !uri.startsWith('/'))) return null;

  const match = uri.match(/\/documents\/[^/]+\/[^/]+$/);
  if (!match) return null;

  const candidate = `${FileSystem.documentDirectory}${match[0].slice(1)}`;
  if (candidate === uri) return null;

  try {
    const info = await FileSystem.getInfoAsync(candidate);
    return info.exists ? candidate : null;
  } catch {
    return null;
  }
}

/**
 * Uploads a local file to Cloudflare R2 (Pro only).
 *
 * Flow:
 *   1. Ask the backend for a presigned PUT URL and the stable storageUrl.
 *   2. PUT the file bytes directly to R2 (bypasses our backend).
 *
 * Returns the permanent storageUrl on success, or null if upload fails or
 * R2 is not configured on the backend.
 */
export async function uploadDocumentToR2(params: {
  documentId: string;
  localUri: string;
  mimeType: string;
  fileName?: string; // document title — used as the folder + file name in R2
  userEmail?: string; // owner's email — used as the top-level folder in R2
}): Promise<string | null> {
  try {
    const { uploadUrl, storageUrl } = await apiRequest<{
      uploadUrl: string;
      storageUrl: string;
      key: string;
    }>('/v1/storage/upload-url', {
      method: 'POST',
      body: {
        documentId: params.documentId,
        mimeType: params.mimeType,
        fileName: params.fileName,
        userEmail: params.userEmail,
      },
      timeoutMs: 15000,
    });

    // Upload the file bytes directly to R2 via the presigned PUT URL.
    const result = await FileSystem.uploadAsync(uploadUrl, params.localUri, {
      httpMethod: 'PUT',
      headers: { 'Content-Type': params.mimeType },
      uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
    });

    if (result.status < 200 || result.status >= 300) {
      console.warn('[r2] Upload failed with status', result.status);
      return null;
    }

    return storageUrl;
  } catch (err) {
    console.warn('[r2] uploadDocumentToR2 failed:', err);
    return null;
  }
}

/**
 * Downloads a file from R2 to the local documents directory.
 * Returns the local URI, or null if download fails.
 */
export async function downloadDocumentFromR2(params: {
  documentId: string;
  mimeType: string;
  extension: string;
  storageKey?: string; // exact R2 key from document.storageUrl (r2://bucket/<key>)
}): Promise<string | null> {
  try {
    // Build query: prefer storageKey (exact path), fall back to mimeType-only
    const qs = params.storageKey
      ? `storageKey=${encodeURIComponent(params.storageKey)}`
      : `mimeType=${encodeURIComponent(params.mimeType)}`;
    const { downloadUrl } = await apiRequest<{ downloadUrl: string }>(
      `/v1/storage/download-url/${params.documentId}?${qs}`,
      { timeoutMs: 10000 },
    );

    const dir = await ensureDocumentDirectory(params.documentId);
    const destUri = `${dir}original.${params.extension.toLowerCase()}`;
    const download = await FileSystem.downloadAsync(downloadUrl, destUri);
    if (download.status < 200 || download.status >= 300) {
      console.warn('[r2] Download failed with status', download.status);
      return null;
    }
    return destUri;
  } catch (err) {
    console.warn('[r2] downloadDocumentFromR2 failed:', err);
    return null;
  }
}

/**
 * Returns a file:// URI that is safe to display in an <Image> component.
 * On Android, expo-file-system URIs are already content:// safe.
 */
export function displayUri(uri: string): string {
  if (Platform.OS === 'android' && uri.startsWith('/')) {
    return `file://${uri}`;
  }
  return uri;
}
