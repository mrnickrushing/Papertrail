/**
 * sampleDocument.ts — Generates a "Try a sample document" starter for the
 * empty Vault state.
 *
 * The PDF is built at runtime with `pdf-lib` (the same pure-JS parser used
 * for page counts in pdfService.ts), so there's no bundled binary asset to
 * keep in sync — every install gets a guaranteed-valid, freshly-dated file.
 */

import * as FileSystem from 'expo-file-system';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { nanoid } from 'nanoid/non-secure';
import { saveDocumentFile } from './fileStorage';
import type { Document } from '@/types/document';

async function buildSamplePdfBytes(): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([400, 520]);
  const heading = await pdf.embedFont(StandardFonts.HelveticaBold);
  const body = await pdf.embedFont(StandardFonts.Helvetica);

  const amber = rgb(0.85, 0.58, 0.12);
  const ink = rgb(0.18, 0.18, 0.2);
  const muted = rgb(0.45, 0.45, 0.48);

  page.drawText('FileTrail Sample Document', {
    x: 40, y: 460, size: 20, font: heading, color: amber,
  });
  const lines = [
    'This is a sample file added so you can see how',
    'FileTrail organizes, previews, and searches your',
    'documents before you add your own.',
    '',
    'Feel free to delete it any time — it lives only on',
    'this device, just like everything else in your vault.',
  ];
  lines.forEach((line, i) => {
    page.drawText(line, { x: 40, y: 410 - i * 20, size: 12, font: body, color: ink });
  });
  page.drawText(`Created ${new Date().toDateString()}`, {
    x: 40, y: 60, size: 10, font: body, color: muted,
  });

  return pdf.save();
}

/**
 * Builds a sample PDF, saves it into the app's document storage, and returns
 * a ready-to-use payload for `documentStore.addDocument`.
 */
export async function createSampleDocument(): Promise<Omit<Document, 'createdAt' | 'updatedAt'>> {
  const id = nanoid();
  const bytes = await buildSamplePdfBytes();

  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  // btoa is available in the RN/Hermes runtime via the JS polyfill.
  const base64 = btoa(binary);

  const tempUri = `${FileSystem.cacheDirectory}filetrail-sample-${id}.pdf`;
  await FileSystem.writeAsStringAsync(tempUri, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const fileUri = await saveDocumentFile(id, tempUri, 'pdf');
  await FileSystem.deleteAsync(tempUri, { idempotent: true });

  const info = await FileSystem.getInfoAsync(fileUri, { size: true });
  const fileSizeBytes = info.exists && 'size' in info ? (info.size ?? 0) : bytes.length;

  return {
    id,
    title: 'FileTrail Sample Document',
    category: 'other',
    fileUri,
    thumbnailUri: null,
    mimeType: 'application/pdf',
    fileSizeBytes,
    pageCount: 1,
    ocrStatus: 'unavailable',
    isFavorite: false,
    folderId: null,
    tags: ['sample'],
    notes: 'A sample document — delete any time.',
  };
}
