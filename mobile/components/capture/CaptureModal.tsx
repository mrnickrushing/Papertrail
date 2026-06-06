/**
 * CaptureModal.tsx — Bottom sheet for initiating document capture
 *
 * Three entry points:
 *   1. 📷 Scan  — Camera capture → review → save
 *   2. 🖼️ Photo  — Photo library → review → save
 *   3. 📄 File   — Document picker (PDF / image) → save
 *
 * The capture route itself is already presented as a transparent modal in
 * Expo Router, so this component intentionally avoids wrapping itself in a
 * second native Modal. That keeps the responder stack simpler and prevents
 * stale invisible backdrops after file import navigation.
 */

import React, { useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useCamera } from '@/hooks/useCamera';
import { useDocumentPicker } from '@/hooks/useDocumentPicker';
import { C, T, R, S } from '@/theme/tokens';

interface CaptureModalProps {
  visible: boolean;
  onClose: () => void;
}

export function CaptureModal({ visible, onClose }: CaptureModalProps) {
  const insets = useSafeAreaInsets();
  const { capture, isLoading: cameraLoading } = useCamera();
  const { pickFile, pickPhoto, isLoading: pickerLoading } = useDocumentPicker();
  const isLoading = cameraLoading || pickerLoading;

  if (!visible) return null;

  const handleCamera = useCallback(async () => {
    const result = await capture();
    if (result.status === 'captured') {
      router.replace({
        pathname: '/capture/review',
        params: { uri: result.uri, source: 'camera' },
      });
    } else if (result.status === 'denied') {
      // Permission prompt handled by the camera hook.
    } else if (result.status === 'error') {
      Alert.alert('Camera Failed', result.message);
    }
  }, [capture]);

  const handlePhoto = useCallback(async () => {
    const result = await pickPhoto();
    if (result.status === 'picked') {
      router.replace({
        pathname: '/capture/review',
        params: { uri: result.uri, name: result.name, source: 'photo' },
      });
    } else if (result.status === 'error') {
      Alert.alert('Photo Import Failed', result.message);
    }
  }, [pickPhoto]);

  const handleFile = useCallback(async () => {
    const result = await pickFile();
    if (result.status === 'picked') {
      router.replace({
        pathname: '/capture/review',
        params: {
          uri: result.uri,
          name: result.name,
          mimeType: result.mimeType,
          size: String(result.size),
          source: 'file',
        },
      });
    } else if (result.status === 'error') {
      Alert.alert('File Import Failed', result.message);
    }
  }, [pickFile]);

  return (
    <Pressable style={styles.backdrop} onPress={() => {
      onClose();
    }}>
      <Pressable
        style={[styles.sheet, { paddingBottom: insets.bottom + S[4] }]}
        onPress={() => {}}
      >
        <View style={styles.handle} />

        <Text style={styles.title}>Add Document</Text>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={C.amber} />
            <Text style={styles.loadingText}>Opening…</Text>
          </View>
        ) : (
          <View style={styles.options}>
            <CaptureOption
              emoji="📷"
              label="Scan Document"
              description="Use your camera"
              onPress={handleCamera}
            />
            <CaptureOption
              emoji="🖼️"
              label="Choose Photo"
              description="From your photo library"
              onPress={handlePhoto}
            />
            <CaptureOption
              emoji="📄"
              label="Import File"
              description="PDF or image from Files"
              onPress={handleFile}
            />
          </View>
        )}

        <Pressable style={styles.cancelBtn} onPress={() => {
          onClose();
        }}>
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
      </Pressable>
    </Pressable>
  );
}

interface OptionProps {
  emoji: string;
  label: string;
  description: string;
  onPress: () => void;
}

function CaptureOption({ emoji, label, description, onPress }: OptionProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.option,
        pressed && styles.optionPressed,
      ]}
      onPress={onPress}
      android_ripple={{ color: C.ink3 }}
    >
      <View style={styles.optionIcon}>
        <Text style={styles.optionEmoji}>{emoji}</Text>
      </View>
      <View style={styles.optionText}>
        <Text style={styles.optionLabel}>{label}</Text>
        <Text style={styles.optionDescription}>{description}</Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: C.ink2,
    borderTopLeftRadius: R.xl,
    borderTopRightRadius: R.xl,
    paddingTop: S[3],
    paddingHorizontal: S[4],
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: R.full,
    backgroundColor: C.ink4,
    alignSelf: 'center',
    marginBottom: S[4],
  },
  title: {
    fontSize: T.lg,
    fontWeight: '600',
    color: C.cream,
    marginBottom: S[4],
    textAlign: 'center',
  },
  options: {
    gap: S[2],
    marginBottom: S[4],
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.ink3,
    borderRadius: R.lg,
    padding: S[4],
    minHeight: 64,
  },
  optionPressed: {
    opacity: 0.75,
  },
  optionIcon: {
    width: 44,
    height: 44,
    borderRadius: R.md,
    backgroundColor: C.ink4,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: S[3],
  },
  optionEmoji: {
    fontSize: 22,
  },
  optionText: {
    flex: 1,
  },
  optionLabel: {
    fontSize: T.base,
    fontWeight: '600',
    color: C.cream,
    marginBottom: 2,
  },
  optionDescription: {
    fontSize: T.sm,
    color: C.ash,
  },
  chevron: {
    fontSize: 24,
    color: C.ink4,
    marginLeft: S[2],
  },
  cancelBtn: {
    backgroundColor: C.ink3,
    borderRadius: R.lg,
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    marginBottom: S[2],
  },
  cancelText: {
    fontSize: T.base,
    color: C.ash,
    fontWeight: '500',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: S[8],
    gap: S[3],
  },
  loadingText: {
    fontSize: T.sm,
    color: C.ash,
  },
});
