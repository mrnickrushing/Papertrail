/**
 * useDocumentPicker.ts — File import hook
 *
 * Handles:
 * - Picking PDFs, images (JPG/PNG/HEIC) from the device file system
 * - Picking from the photo library
 * - Returning a normalized PickerResult
 */

import { useState, useCallback } from 'react';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';

export type PickerResult =
  | { status: 'picked'; uri: string; name: string; mimeType: string; size: number }
  | { status: 'cancelled' }
  | { status: 'denied' }
  | { status: 'error'; message: string };

export function useDocumentPicker() {
  const [isLoading, setIsLoading] = useState(false);

  /** Pick any file (PDF, image, etc.) from the Files app */
  const pickFile = useCallback(async (): Promise<PickerResult> => {
    setIsLoading(true);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (result.canceled || !result.assets?.[0]) {
        return { status: 'cancelled' };
      }

      const asset = result.assets[0];
      return {
        status: 'picked',
        uri: asset.uri,
        name: asset.name,
        mimeType: asset.mimeType ?? 'application/octet-stream',
        size: asset.size ?? 0,
      };
    } catch (err) {
      return { status: 'error', message: String(err) };
    } finally {
      setIsLoading(false);
    }
  }, []);

  /** Pick an image from the photo library */
  const pickPhoto = useCallback(async (): Promise<PickerResult> => {
    setIsLoading(true);
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        return { status: 'denied' };
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.92,
        exif: false,
        selectionLimit: 1,
      });

      if (result.canceled || !result.assets?.[0]) {
        return { status: 'cancelled' };
      }

      const asset = result.assets[0];
      const ext = asset.uri.split('.').pop()?.toLowerCase() ?? 'jpg';
      return {
        status: 'picked',
        uri: asset.uri,
        name: `photo_${Date.now()}.${ext}`,
        mimeType: asset.mimeType ?? 'image/jpeg',
        size: 0, // not available from ImagePicker; resolved later via FileSystem
      };
    } catch (err) {
      return { status: 'error', message: String(err) };
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { pickFile, pickPhoto, isLoading };
}
