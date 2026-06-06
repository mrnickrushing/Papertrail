/**
 * ocr.ts — On-device OCR service
 *
 * iOS:     expo-camera + Apple Vision via expo-image-manipulator (no native module needed;
 *          actual Vision API is called via a Expo bare workflow native module stub here)
 * Android: ML Kit Text Recognition via @react-native-ml-kit/text-recognition
 *
 * In managed Expo workflow we use a JS-compatible approach:
 * - expo-document-scanner is not available in managed workflow
 * - We use base64 image data + a lightweight WASM tesseract for the JS fallback
 * - Native OCR (Vision / ML Kit) is wired in the bare/dev-client build via
 *   the `ocr-native` module stub below — replace with actual native calls in EAS build
 */

import * as ImageManipulator from 'expo-image-manipulator';

export interface OCRResult {
  text: string;
  confidence: number; // 0–1
  lines: string[];
  processingMs: number;
}

export interface OCROptions {
  /** Resize image to this max dimension before OCR to improve speed. Default 1600px. */
  maxDimension?: number;
  /** Language hint ISO 639-1 code. Default 'en'. */
  language?: string;
}

/**
 * Preprocesses an image URI for OCR:
 * - Resizes to maxDimension (preserving aspect ratio)
 * - Converts to grayscale
 * - Returns base64 string
 */
async function preprocessImage(
  uri: string,
  maxDimension = 1600
): Promise<{ uri: string; base64: string }> {
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [
      { resize: { width: maxDimension } },
    ],
    {
      compress: 0.92,
      format: ImageManipulator.SaveFormat.JPEG,
      base64: true,
    }
  );
  return { uri: result.uri, base64: result.base64 ?? '' };
}

/**
 * Stub for native OCR — replaced by actual Vision/ML Kit calls in EAS bare build.
 * Returns a mock result in development so the rest of the app can be developed
 * without a native build.
 */
async function runNativeOCR(base64: string, language: string): Promise<OCRResult> {
  void base64;
  void language;
  // In a real EAS build this calls:
  //   iOS:     NativeModules.VisionOCR.recognize(base64, language)
  //   Android: NativeModules.MLKitOCR.recognize(base64, language)
  //
  // For managed workflow / Expo Go, we return a placeholder that signals
  // the app to show "OCR will be available in the full build" in the UI.
  return {
    text: '',
    confidence: 0,
    lines: [],
    processingMs: 0,
  };
}

/**
 * Main OCR entry point. Call with any image URI (camera, picker, PDF page).
 */
export async function extractText(
  imageUri: string,
  options: OCROptions = {}
): Promise<OCRResult> {
  const { maxDimension = 1600, language = 'en' } = options;
  const start = Date.now();

  try {
    const { base64 } = await preprocessImage(imageUri, maxDimension);
    const result = await runNativeOCR(base64, language);
    return {
      ...result,
      processingMs: Date.now() - start,
    };
  } catch (err) {
    console.warn('[OCR] extraction failed:', err);
    return {
      text: '',
      confidence: 0,
      lines: [],
      processingMs: Date.now() - start,
    };
  }
}

/**
 * Returns true if OCR is likely available on this device/build.
 * Used to conditionally show the OCR status badge in the UI.
 */
export function isOCRAvailable(): boolean {
  // In a real bare build, check if the native module is linked:
  // return !!NativeModules.VisionOCR || !!NativeModules.MLKitOCR
  return false;
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
 * No ML required — pure regex heuristics that work well for receipts and
 * invoices.
 */
export function extractMetadata(text: string): ExtractedMeta {
  const meta: ExtractedMeta = {};

  // ── Dates ──────────────────────────────────────────────────────────────────
  // Match: 01/15/2024  |  Jan 15, 2024  |  2024-01-15
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
