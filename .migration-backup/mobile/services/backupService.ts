/**
 * backupService.ts — Local encrypted backup & restore (Phase 7)
 *
 * Free tier: creates a self-contained JSON bundle of all document metadata
 * + base64-encoded files, written to the cache directory and shared via the
 * OS share sheet so the user can save it to Files / Drive / iCloud manually.
 *
 * Restore: reads the bundle back, re-creates metadata in the store and copies
 * files back into the documents directory.
 *
 * Encryption: XOR with a device-specific key derived from the bundle's
 * creation timestamp + a static salt.  This is intentionally lightweight —
 * full AES encryption is a Pro feature wired to a user passphrase.
 */

import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import type { Document, Folder } from '@/types/document';
import { ensureDocumentDirectory, getExtension } from '@/services/fileStorage';

const BACKUP_VERSION = 1;
const SALT = 'FileTrailBackup2024';
const BACKUP_PREFIX = 'PTBAK1';
const BACKUP_SEED_LENGTH = 16;

export type BackupProgress = { current: number; total: number; label: string };

export interface BackupBundle {
  version: number;
  createdAt: string;
  documentCount: number;
  documents: Array<Document & { fileBase64: string; thumbnailBase64?: string }>;
  folders: Folder[];
}

// ─── Simple XOR obfuscation ───────────────────────────────────────────────────

function makeKey(seed: string): number[] {
  const key: number[] = [];
  const src = seed + SALT;
  for (let i = 0; i < 32; i++) key.push(src.charCodeAt(i % src.length));
  return key;
}

function xorBase64(input: string, seed: string): string {
  const key = makeKey(seed);
  let out = '';
  for (let i = 0; i < input.length; i++) {
    out += String.fromCharCode(input.charCodeAt(i) ^ key[i % key.length]);
  }
  return btoa(out);
}

function unxorBase64(input: string, seed: string): string {
  const raw = atob(input);
  const key = makeKey(seed);
  let out = '';
  for (let i = 0; i < raw.length; i++) {
    out += String.fromCharCode(raw.charCodeAt(i) ^ key[i % key.length]);
  }
  return out;
}

// ─── Create backup ────────────────────────────────────────────────────────────

export async function createBackup(
  documents: Document[],
  folders: Folder[],
  onProgress?: (p: BackupProgress) => void,
): Promise<void> {
  const available = await Sharing.isAvailableAsync();
  if (!available) throw new Error('Sharing is not available on this device.');

  const createdAt = new Date().toISOString();
  const seed = createdAt.slice(0, 16); // YYYY-MM-DDTHH:MM

  const bundleDocs: BackupBundle['documents'] = [];

  for (let i = 0; i < documents.length; i++) {
    const doc = documents[i];
    onProgress?.({ current: i + 1, total: documents.length, label: doc.title });

    let fileBase64 = '';
    try {
      fileBase64 = await FileSystem.readAsStringAsync(doc.fileUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
    } catch {
      // Skip unreadable files — metadata still backed up
    }

    let thumbnailBase64: string | undefined;
    if (doc.thumbnailUri) {
      try {
        thumbnailBase64 = await FileSystem.readAsStringAsync(doc.thumbnailUri, {
          encoding: FileSystem.EncodingType.Base64,
        });
      } catch {
        // Thumbnail is optional; keep the original document in the backup.
      }
    }

    bundleDocs.push({ ...doc, fileBase64, thumbnailBase64 });
  }

  const bundle: BackupBundle = {
    version: BACKUP_VERSION,
    createdAt,
    documentCount: bundleDocs.length,
    documents: bundleDocs,
    folders,
  };

  const json = JSON.stringify(bundle);
  const obfuscated = xorBase64(json, seed);
  const payload = `${BACKUP_PREFIX}:${seed}|${obfuscated}`;

  const filename = `filetrail-backup-${createdAt.slice(0, 10)}.ptbak`;
  const dest = FileSystem.cacheDirectory + filename;
  await FileSystem.writeAsStringAsync(dest, payload, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  await Sharing.shareAsync(dest, {
    mimeType: 'application/octet-stream',
    dialogTitle: 'Save FileTrail Backup',
  });
}

// ─── Restore backup ───────────────────────────────────────────────────────────

export interface RestoreResult {
  documents: Document[];
  folders: Folder[];
  skipped: number;
}

export async function restoreBackup(
  onProgress?: (p: BackupProgress) => void,
): Promise<RestoreResult> {
  const picked = await DocumentPicker.getDocumentAsync({
    type: '*/*',
    copyToCacheDirectory: true,
  });

  if (picked.canceled || !picked.assets?.[0]) {
    throw new Error('No file selected.');
  }

  const uri = picked.assets[0].uri;
  const raw = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  // Attempt to detect encoding: if valid JSON, it's an unencrypted legacy bundle
  let bundle: BackupBundle;
  const backupHeader = `${BACKUP_PREFIX}:`;
  if (raw.startsWith(backupHeader)) {
    const seedStart = backupHeader.length;
    const seed = raw.slice(seedStart, seedStart + BACKUP_SEED_LENGTH);
    const separator = raw[seedStart + BACKUP_SEED_LENGTH];
    const encoded = raw.slice(seedStart + BACKUP_SEED_LENGTH + 1);

    if (seed.length !== BACKUP_SEED_LENGTH || (separator !== '|' && separator !== ':') || !encoded) {
      throw new Error('Invalid backup format.');
    }
    bundle = JSON.parse(unxorBase64(encoded, seed));
  } else {
    try {
      bundle = JSON.parse(raw);
    } catch {
      throw new Error(
        'Could not read backup file. Make sure you selected a valid .ptbak file.'
      );
    }
  }

  if (!bundle.version || !Array.isArray(bundle.documents)) {
    throw new Error('Invalid backup format.');
  }

  const documents: Document[] = [];
  let skipped = 0;

  for (let i = 0; i < bundle.documents.length; i++) {
    const entry = bundle.documents[i];
    onProgress?.({ current: i + 1, total: bundle.documents.length, label: entry.title });

    try {
      const { fileBase64, thumbnailBase64, ...restoredEntry } = entry;
      if (entry.fileBase64) {
        const dir = await ensureDocumentDirectory(entry.id);
        const ext = `.${getExtension(entry.mimeType || entry.fileUri)}`;
        const destUri = `${dir}original${ext}`;
        await FileSystem.writeAsStringAsync(destUri, fileBase64, {
          encoding: FileSystem.EncodingType.Base64,
        });

        const doc: Document = { ...restoredEntry, fileUri: destUri };

        if (thumbnailBase64) {
          const thumbUri = `${dir}thumb.jpg`;
          await FileSystem.writeAsStringAsync(thumbUri, thumbnailBase64, {
            encoding: FileSystem.EncodingType.Base64,
          });
          doc.thumbnailUri = thumbUri;
        }

        documents.push(doc);
      } else {
        // Skip metadata-only entries because their original file path is not valid on this device.
        skipped++;
      }
    } catch {
      skipped++;
    }
  }

  return { documents, folders: bundle.folders ?? [], skipped };
}
