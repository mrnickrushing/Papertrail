/**
 * pdfService.ts — PDF handling service
 *
 * In managed Expo workflow: PDF viewing is handled by a WebView (see
 * viewer/[id].tsx) and "open externally" via expo-sharing.
 *
 * Page count is read with `pdf-lib` — a pure-JS PDF parser, so it needs no
 * native module or EAS rebuild and works the same in Expo Go and dev builds.
 */

import * as FileSystem from 'expo-file-system';
import { PDFDocument } from 'pdf-lib';

export interface PDFInfo {
  pageCount: number;
  fileSizeBytes: number;
  uri: string;
}

/**
 * Returns basic info about a PDF file, including its true page count.
 * Falls back to 1 if the file can't be parsed (encrypted, corrupt, etc.) so
 * callers always get a usable, positive page count.
 */
export async function getPDFInfo(uri: string): Promise<PDFInfo> {
  const info = await FileSystem.getInfoAsync(uri, { size: true });
  const fileSizeBytes = info.exists && 'size' in info ? (info.size ?? 0) : 0;

  let pageCount = 1;
  try {
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    const pdf = await PDFDocument.load(base64, {
      ignoreEncryption: true,
      updateMetadata: false,
    });
    const count = pdf.getPageCount();
    if (count > 0) pageCount = count;
  } catch {
    // Encrypted, corrupt, or otherwise unparseable — keep the safe default.
  }

  return { pageCount, fileSizeBytes, uri };
}

/**
 * Returns whether a URI points to a PDF file.
 */
export function isPDF(uri: string): boolean {
  return uri.toLowerCase().endsWith('.pdf') || uri.toLowerCase().includes('application/pdf');
}


/**
 * Returns whether a URI or optional MIME type points to a PDF file.
 * Content URIs often do not preserve extensions, so prefer MIME when present.
 */
export function isPDFLike(uri: string, mimeType?: string | null): boolean {
  return Boolean(mimeType?.toLowerCase().includes('pdf')) || isPDF(uri);
}
