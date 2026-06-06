/**
 * documentTitle.ts — Auto-title generation utilities
 *
 * Generates a smart default title for a document based on:
 * - Source (camera, photo, file)
 * - File name (for imports)
 * - OCR text (first meaningful line)
 * - Date
 *
 * Used in the review screen and will power AI-naming in Phase 7.
 */

import type { DocumentCategory } from '@/types/document';

/**
 * Generates a default title from OCR text by taking the first non-empty line
 * that is at least 4 characters and not all numbers.
 */
export function titleFromOCR(ocrText: string): string | null {
  const lines = ocrText
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length >= 4 && !/^[\d\s.,/-]+$/.test(l));
  return lines[0] ?? null;
}

/**
 * Generates a human-readable title from a file name by:
 * - Removing the extension
 * - Replacing underscores/hyphens with spaces
 * - Title-casing
 * - Truncating to 60 chars
 */
export function titleFromFileName(fileName: string): string {
  const noExt = fileName.replace(/\.[^.]+$/, '');
  const spaced = noExt.replace(/[_-]+/g, ' ').trim();
  const titleCased = spaced
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
  return titleCased.slice(0, 60);
}

/**
 * Generates a dated default title for camera/photo captures.
 */
export function titleFromDate(
  source: 'camera' | 'photo' | 'file',
  date = new Date()
): string {
  const formatted = date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const prefix = source === 'camera' ? 'Scan' : source === 'photo' ? 'Photo' : 'Import';
  return `${prefix} — ${formatted}`;
}

/**
 * Suggests a category based on OCR keywords.
 * Very lightweight — full AI categorization in Phase 7.
 */
export function categoryFromOCR(ocrText: string): DocumentCategory {
  const text = ocrText.toLowerCase();
  if (/receipt|total|subtotal|tax|paid|visa|mastercard|amex|order #/.test(text)) return 'receipt';
  if (/agreement|contract|party|clause|terms|signed|signature|whereas/.test(text)) return 'contract';
  if (/passport|license|driver|identification|date of birth|expires/.test(text)) return 'id';
  if (/warranty|product|serial|model|purchase date|covered/.test(text)) return 'warranty';
  if (/diagnosis|prescription|patient|doctor|hospital|clinic|rx/.test(text)) return 'medical';
  if (/tax|irs|w-2|1099|refund|income|federal|state return/.test(text)) return 'tax';
  return 'other';
}
