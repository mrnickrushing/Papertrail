/**
 * exportService.ts — Document export utilities
 *
 * Single-file share: wraps expo-sharing with a file-URI copy to cache so the
 * share sheet always gets a named file rather than a deep private path.
 *
 * ZIP export: reads each document file as base64 via expo-file-system, packs
 * them with jszip (pure-JS, no native module needed), writes the archive to
 * the cache directory, then opens the share sheet.
 *
 * Both paths are safe to call in Expo Go and in development builds.
 */

import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import JSZip from 'jszip';
import type { Document } from '@/types/document';

// ─── Single document ──────────────────────────────────────────────────────────

export async function shareDocument(doc: Document): Promise<void> {
  const available = await Sharing.isAvailableAsync();
  if (!available) {
    throw new Error('Sharing is not available on this device.');
  }

  // Copy to a named cache file so the share sheet shows a sensible filename.
  const ext = extensionFromUri(doc.fileUri);
  const safeName = sanitizeFilename(doc.title) + ext;
  const dest = FileSystem.cacheDirectory + safeName;

  await FileSystem.deleteAsync(dest, { idempotent: true });
  await FileSystem.copyAsync({ from: doc.fileUri, to: dest });

  await Sharing.shareAsync(dest, {
    mimeType: doc.mimeType,
    dialogTitle: doc.title,
    UTI: utiFromMime(doc.mimeType),
  });
}

// ─── ZIP of all documents ────────────────────────────────────────────────────

export type ZipProgress = {
  current: number;
  total: number;
  filename: string;
};

// Warn (but don't hard-block) above this threshold to avoid OOM on large vaults.
const ZIP_SIZE_WARN_BYTES = 100 * 1024 * 1024; // 100 MB

export async function exportAllAsZip(
  docs: Document[],
  onProgress?: (p: ZipProgress) => void,
): Promise<void> {
  const available = await Sharing.isAvailableAsync();
  if (!available) {
    throw new Error('Sharing is not available on this device.');
  }

  if (docs.length === 0) {
    throw new Error('No documents to export.');
  }

  const totalBytes = docs.reduce((sum, d) => sum + (d.fileSizeBytes ?? 0), 0);
  if (totalBytes > ZIP_SIZE_WARN_BYTES) {
    throw new Error(
      `Export is too large (${(totalBytes / (1024 * 1024)).toFixed(0)} MB). ` +
      'Select fewer documents or export them individually via the share button.',
    );
  }

  const zip = new JSZip();
  const usedNames = new Set<string>();
  let addedFiles = 0;

  for (let i = 0; i < docs.length; i++) {
    const doc = docs[i];
    onProgress?.({ current: i + 1, total: docs.length, filename: doc.title });

    let base64: string;
    try {
      base64 = await FileSystem.readAsStringAsync(doc.fileUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
    } catch {
      // Skip files that can't be read (deleted from disk etc.)
      continue;
    }

    const ext = extensionFromUri(doc.fileUri);
    let name = sanitizeFilename(doc.title) + ext;

    // Deduplicate filenames within the archive.
    if (usedNames.has(name)) {
      name = sanitizeFilename(doc.title) + `_${doc.id.slice(0, 6)}` + ext;
    }
    usedNames.add(name);

    zip.file(name, base64, { base64: true });
    addedFiles++;
  }

  if (addedFiles === 0) {
    throw new Error('No readable document files were found to export.');
  }

  const zipBase64 = await zip.generateAsync({
    type: 'base64',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  const timestamp = new Date().toISOString().slice(0, 10);
  const zipPath = FileSystem.cacheDirectory + `filetrail-export-${timestamp}.zip`;

  await FileSystem.writeAsStringAsync(zipPath, zipBase64, {
    encoding: FileSystem.EncodingType.Base64,
  });

  await Sharing.shareAsync(zipPath, {
    mimeType: 'application/zip',
    dialogTitle: 'Export FileTrail Documents',
    UTI: 'public.zip-archive',
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function extensionFromUri(uri: string): string {
  const match = uri.match(/\.[a-zA-Z0-9]+$/);
  return match ? match[0].toLowerCase() : '';
}

function sanitizeFilename(name: string): string {
  return name
    .replace(/[/\\:*?"<>|]/g, '_')
    .replace(/\s+/g, '_')
    .slice(0, 80);
}

function utiFromMime(mime: string): string {
  if (mime.includes('pdf')) return 'com.adobe.pdf';
  if (mime.includes('png')) return 'public.png';
  if (mime.includes('jpeg') || mime.includes('jpg')) return 'public.jpeg';
  return 'public.data';
}
