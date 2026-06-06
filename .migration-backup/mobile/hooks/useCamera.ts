/**
 * useCamera.ts — Camera permissions + capture hook
 *
 * Handles:
 * - Requesting camera permission
 * - Launching the camera via expo-image-picker (managed workflow compatible)
 * - Returning the captured image URI
 */

import { useState, useCallback } from 'react';
import * as ImagePicker from 'expo-image-picker';

export type CameraResult =
  | { status: 'captured'; uri: string; width: number; height: number }
  | { status: 'cancelled' }
  | { status: 'denied' }
  | { status: 'error'; message: string };

export function useCamera() {
  const [isLoading, setIsLoading] = useState(false);

  const capture = useCallback(async (): Promise<CameraResult> => {
    setIsLoading(true);
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        return { status: 'denied' };
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false, // we handle crop in the review step
        quality: 0.92,
        exif: false,
      });

      if (result.canceled || !result.assets?.[0]) {
        return { status: 'cancelled' };
      }

      const asset = result.assets[0];
      return {
        status: 'captured',
        uri: asset.uri,
        width: asset.width,
        height: asset.height,
      };
    } catch (err) {
      return { status: 'error', message: String(err) };
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { capture, isLoading };
}
