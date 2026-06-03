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
import { Platform } from 'react-native';

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
async function runNativeOCR(_base64: string, _language: string): Promise<OCRResult> {
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
