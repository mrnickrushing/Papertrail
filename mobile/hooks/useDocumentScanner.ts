import { useCallback, useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

export type DocumentScannerResult =
  | { status: 'captured'; uri: string; mimeType: string; name: string }
  | { status: 'cancelled' }
  | { status: 'denied' }
  | { status: 'error'; message: string };

export function useDocumentScanner() {
  const [isLoading, setIsLoading] = useState(false);

  const scan = useCallback(async (): Promise<DocumentScannerResult> => {
    setIsLoading(true);
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        return { status: 'denied' };
      }

      if (Platform.OS === 'web') {
        return {
          status: 'error',
          message: 'Document scanning requires an installed iOS or Android build.',
        };
      }

      // Try the native document scanner (requires a custom dev/prod build with the
      // react-native-document-scanner-plugin binary linked). If the TurboModule is
      // not present in this build the require will throw; we fall through to the
      // standard camera instead of crashing.
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const scannerModule = require('react-native-document-scanner-plugin');
        const DocumentScanner = scannerModule?.default;
        const { ResponseType, ScanDocumentResponseStatus } = scannerModule ?? {};

        if (DocumentScanner && ResponseType && ScanDocumentResponseStatus) {
          const result = await DocumentScanner.scanDocument({
            croppedImageQuality: 92,
            maxNumDocuments: 1,
            responseType: ResponseType.ImageFilePath,
          });

          if (result?.status === ScanDocumentResponseStatus.Cancel) {
            return { status: 'cancelled' };
          }

          const scannedUri = result?.scannedImages?.[0];
          if (result?.status === ScanDocumentResponseStatus.Success && typeof scannedUri === 'string' && scannedUri.length > 0) {
            return {
              status: 'captured',
              uri: scannedUri,
              mimeType: 'image/jpeg',
              name: `Scan-${Date.now()}.jpg`,
            };
          }

          return { status: 'cancelled' };
        }
      } catch {
        // Native DocumentScanner TurboModule not available in this build; fall through to camera.
      }

      // Fallback: standard camera via expo-image-picker (works in Expo Go and any build).
      const photo = await ImagePicker.launchCameraAsync({
        mediaTypes: 'images',
        quality: 0.92,
        allowsEditing: false,
      });

      if (photo.canceled) {
        return { status: 'cancelled' };
      }

      const asset = photo.assets?.[0];
      if (!asset?.uri) {
        return { status: 'cancelled' };
      }

      return {
        status: 'captured',
        uri: asset.uri,
        mimeType: asset.mimeType ?? 'image/jpeg',
        name: `Scan-${Date.now()}.jpg`,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (/permission|camera/i.test(message)) {
        return { status: 'denied' };
      }
      return { status: 'error', message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { scan, isLoading };
}
