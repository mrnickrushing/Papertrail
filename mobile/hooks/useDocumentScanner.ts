import { useCallback, useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

export type DocumentScannerResult =
  | { status: 'captured'; uri: string }
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

      // Loaded lazily so web export and non-native surfaces do not try to
      // evaluate the scanner module.
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const scannerModule = require('react-native-document-scanner-plugin');
      const DocumentScanner = scannerModule.default;
      const { ResponseType, ScanDocumentResponseStatus } = scannerModule;

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
        return { status: 'captured', uri: scannedUri };
      }

      return { status: 'cancelled' };
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
