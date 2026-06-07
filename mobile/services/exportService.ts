/**
 * exportService.ts — Document export utilities
 *
 * Single-file share: wraps expo-sharing with a file-URI copy to cache so the
 * share sheet always gets a named file rather than a deep private path.
 *
 * ZIP export: copies each document file into a staging directory (a plain
 * file-to-file copy via expo-file-system — no base64 decoding), then hands
 * the whole directory to `react-native-zip-archive`, which streams it into
 * an archive natively. Nothing is loaded into JS memory, so large vaults
 * export without risking an OOM crash.
 */

import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { zip } from 'react-native-zip-archive';
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

  const stagingDir = `${FileSystem.cacheDirectory}filetrail-export-staging/`;
  await FileSystem.deleteAsync(stagingDir, { idempotent: true });
  await FileSystem.makeDirectoryAsync(stagingDir, { intermediates: true });

  try {
    const usedNames = new Set<string>();
    let copiedFiles = 0;

    for (let i = 0; i < docs.length; i++) {
      const doc = docs[i];
      onProgress?.({ current: i + 1, total: docs.length, filename: doc.title });

      const ext = extensionFromUri(doc.fileUri);
      let name = sanitizeFilename(doc.title) + ext;

      // Deduplicate filenames within the archive.
      if (usedNames.has(name)) {
        name = sanitizeFilename(doc.title) + `_${doc.id.slice(0, 6)}` + ext;
      }
      usedNames.add(name);

      try {
        await FileSystem.copyAsync({ from: doc.fileUri, to: stagingDir + name });
        copiedFiles++;
      } catch {
        // Skip files that can't be read (deleted from disk etc.)
      }
    }

    if (copiedFiles === 0) {
      throw new Error('No readable document files were found to export.');
    }

    const timestamp = new Date().toISOString().slice(0, 10);
    const zipPath = `${FileSystem.cacheDirectory}filetrail-export-${timestamp}.zip`;
    await FileSystem.deleteAsync(zipPath, { idempotent: true });

    await zip(stagingDir, zipPath);

    await Sharing.shareAsync(zipPath, {
      mimeType: 'application/zip',
      dialogTitle: 'Export FileTrail Documents',
      UTI: 'public.zip-archive',
    });
  } finally {
    await FileSystem.deleteAsync(stagingDir, { idempotent: true });
  }
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
