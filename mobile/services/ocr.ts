/**
 * ocr.ts — On-device OCR service (iOS only)
 *
 * Uses react-native-text-recognition which wraps Apple's Vision framework
 * (VNRecognizeTextRequest) on iOS for high-quality on-device text recognition.
 *
 * Android: OCR is not enabled — isOCRAvailable() returns false on Android.
 *
 * Graceful degradation: if the native module is not linked (Expo Go, simulator
 * without the module, or any non-iOS build) the service returns empty results
 * and isOCRAvailable() returns false so the UI shows the correct fallback.
 *
 * API: TextRecognition.recognize(uri: string): Promise<string[]>
 * Returns an array of recognized text lines.
 */

import * as ImageManipulator from 'expo-image-manipulator';
import { Platform } from 'react-native';

// Dynamic require so the app does not crash when the native module is not linked
// (Expo Go, Android, web). The try/catch is intentional.
let TextRecognition: null | {
  recognize: (uri: string) => Promise<string[]>;
} = null;

if (Platform.OS === 'ios') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('react-native-text-recognition');
    TextRecognition = mod.default ?? mod;
  } catch {
    // Native module not linked — isOCRAvailable() will return false
  }
}

export interface OCRResult {
  text: string;
  confidence: number;
  lines: string[];
  processingMs: number;
}

export interface OCROptions {
  /** Resize image to this max dimension before OCR to improve speed. Default 1600px. */
  maxDimension?: number;
  /** Language hint (reserved for future use). */
  language?: string;
}

/**
 * Returns true if OCR is available on this device/build.
 * Only true on iOS builds where the native module is linked.
 */
export function isOCRAvailable(): boolean {
  return Platform.OS === 'ios' && TextRecognition !== null;
}

/**
 * Preprocesses an image URI for OCR:
 * - Resizes to maxDimension (preserving aspect ratio)
 * - Converts to JPEG for consistent format
 */
async function preprocessImage(uri: string, maxDimension = 1600): Promise<string> {
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: maxDimension } }],
    { compress: 0.92, format: ImageManipulator.SaveFormat.JPEG }
  );
  return result.uri;
}

/**
 * Main OCR entry point. Call with any image URI (camera, picker, photo).
 * Returns empty result on Android or when native module is not linked.
 */
export async function extractText(
  imageUri: string,
  options: OCROptions = {}
): Promise<OCRResult> {
  const { maxDimension = 1600 } = options;
  const start = Date.now();

  if (!TextRecognition) {
    return { text: '', confidence: 0, lines: [], processingMs: 0 };
  }

  try {
    const processedUri = await preprocessImage(imageUri, maxDimension);
    // recognize() returns string[] — one entry per recognised text line
    const lines: string[] = await TextRecognition.recognize(processedUri);
    const text = lines.join('\n');

    return {
      text,
      confidence: 0.9,
      lines,
      processingMs: Date.now() - start,
    };
  } catch (err) {
    console.warn('[OCR] extraction failed:', err);
    return { text: '', confidence: 0, lines: [], processingMs: Date.now() - start };
  }
}

// ─── Metadata extraction ──────────────────────────────────────────────────────

export interface ExtractedMeta {
  /** ISO date string inferred from text, e.g. a receipt date */
  inferredDate?: string;
  /** Dollar/currency amounts found in text */
  amounts?: number[];
  /** Likely vendor / issuer name (first capitalised line heuristic) */
  vendor?: string;
}

/**
 * Parses lightweight structured metadata out of raw OCR text.
 * Pure regex heuristics — works well for receipts and invoices.
 */
export function extractMetadata(text: string): ExtractedMeta {
  const meta: ExtractedMeta = {};

  // ── Dates ──────────────────────────────────────────────────────────────────
  const datePatterns = [
    /\b(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})\b/,
    /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+(\d{1,2}),?\s+(\d{4})\b/i,
    /\b(\d{4})[/-](\d{2})[/-](\d{2})\b/,
  ];
  for (const pat of datePatterns) {
    const m = text.match(pat);
    if (m) {
      const d = new Date(m[0]);
      if (!isNaN(d.getTime())) {
        meta.inferredDate = d.toISOString().slice(0, 10);
        break;
      }
    }
  }

  // ── Currency amounts ───────────────────────────────────────────────────────
  const amountMatches = text.matchAll(/\$\s?(\d{1,6}(?:,\d{3})*(?:\.\d{2})?)/g);
  const amounts: number[] = [];
  for (const m of amountMatches) {
    const n = parseFloat(m[1].replace(/,/g, ''));
    if (!isNaN(n)) amounts.push(n);
  }
  if (amounts.length) meta.amounts = amounts;

  // ── Vendor (first non-empty capitalised-word line, ≤ 40 chars) ────────────
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  for (const line of lines.slice(0, 5)) {
    if (line.length <= 40 && /^[A-Z]/.test(line) && !/^\d/.test(line)) {
      meta.vendor = line;
      break;
    }
  }

  return meta;
}
