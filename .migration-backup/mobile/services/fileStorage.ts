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
 * Returns a file:// URI that is safe to display in an <Image> component.
 * On Android, expo-file-system URIs are already content:// safe.
 */
export function displayUri(uri: string): string {
  if (Platform.OS === 'android' && uri.startsWith('/')) {
    return `file://${uri}`;
  }
  return uri;
}
