/**
 * pdfService.ts — PDF handling service
 *
 * Renders PDF pages to images for display + OCR.
 * Uses expo-print for generation and react-native-pdf-thumbnail for page rendering.
 *
 * In managed Expo workflow: PDF viewing is handled by expo-web-browser (open externally)
 * or by rendering pages via the native PDF renderer.
 *
 * For Phase 2 we focus on:
 * 1. Accepting a PDF URI from the document picker
 * 2. Getting page count
 * 3. Rendering page 1 as the thumbnail
 * 4. Extracting text (page 1 only in Phase 2; all pages in Phase 3)
 */

import * as FileSystem from 'expo-file-system';

export interface PDFInfo {
  pageCount: number;
  fileSizeBytes: number;
  uri: string;
}

/**
 * Returns basic info about a PDF file.
 * Page count detection requires a native module in production;
 * this stub returns 1 for managed workflow compatibility.
 */
export async function getPDFInfo(uri: string): Promise<PDFInfo> {
  const info = await FileSystem.getInfoAsync(uri, { size: true });
  const fileSizeBytes = info.exists && 'size' in info ? (info.size ?? 0) : 0;

  // In a bare EAS build: use react-native-pdf to get numberOfPages
  // const pdf = await PDFModule.getInfo(uri);
  // return { pageCount: pdf.numberOfPages, fileSizeBytes, uri };

  return {
    pageCount: 1, // stub — replace with native call in EAS build
    fileSizeBytes,
    uri,
  };
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
