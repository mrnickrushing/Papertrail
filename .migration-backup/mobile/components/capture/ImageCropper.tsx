/**
 * ImageCropper.tsx — Gesture-driven document crop + transform UI
 *
 * Features:
 *   - Draggable crop rectangle with corner handles (react-native-gesture-handler v2)
 *   - Smooth handle animations via react-native-reanimated
 *   - 90° rotate left / right
 *   - Auto-enhance toggle (compress + grayscale hint for OCR)
 *   - Confirm maps screen crop rect → actual pixel coordinates for
 *     expo-image-manipulator crop action
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Image,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  clamp,
} from 'react-native-reanimated';
import * as ImageManipulator from 'expo-image-manipulator';
import { C, T, R, S } from '@/theme/tokens';

const SCREEN_WIDTH = Dimensions.get('window').width;
const PREVIEW_SIZE = SCREEN_WIDTH - S[8] * 2;
const HANDLE = 22;       // corner handle touch target size
const MIN_CROP = 60;     // minimum crop dimension in preview pixels
const INITIAL_INSET = PREVIEW_SIZE * 0.08;

interface ImageCropperProps {
  uri: string;
  onConfirm: (processedUri: string) => void;
  onCancel: () => void;
}

interface NaturalSize {
  width: number;
  height: number;
}

export function ImageCropper({ uri, onConfirm, onCancel }: ImageCropperProps) {
  const [currentUri, setCurrentUri] = useState(uri);
  const [rotation, setRotation] = useState(0);
  const [enhanced, setEnhanced] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [naturalSize, setNaturalSize] = useState<NaturalSize | null>(null);

  // Crop rect in preview-area pixels.
  const cropL = useSharedValue(INITIAL_INSET);
  const cropT = useSharedValue(INITIAL_INSET);
  const cropR = useSharedValue(PREVIEW_SIZE - INITIAL_INSET);
  const cropB = useSharedValue(PREVIEW_SIZE - INITIAL_INSET);

  // Track start values so each gesture delta is relative to gesture start.
  const startL = useSharedValue(0);
  const startT = useSharedValue(0);
  const startR = useSharedValue(0);
  const startB = useSharedValue(0);

  useEffect(() => {
    Image.getSize(
      uri,
      (w, h) => setNaturalSize({ width: w, height: h }),
      () => {},
    );
  }, [uri]);

  // ── Apply rotate / enhance transforms ──────────────────────────────────────

  const applyTransforms = useCallback(
    async (newRotation: number, newEnhanced: boolean) => {
      setIsProcessing(true);
      try {
        const actions: ImageManipulator.Action[] = [];
        if (newRotation !== 0) actions.push({ rotate: newRotation });

        if (actions.length === 0 && !newEnhanced) {
          setCurrentUri(uri);
          return;
        }

        const result = await ImageManipulator.manipulateAsync(
          uri,
          actions,
          {
            compress: newEnhanced ? 0.95 : 0.92,
            format: ImageManipulator.SaveFormat.JPEG,
          },
        );
        setCurrentUri(result.uri);
      } finally {
        setIsProcessing(false);
      }
    },
    [uri],
  );

  const rotateLeft = useCallback(async () => {
    const next = (rotation - 90 + 360) % 360;
    setRotation(next);
    await applyTransforms(next, enhanced);
  }, [rotation, enhanced, applyTransforms]);

  const rotateRight = useCallback(async () => {
    const next = (rotation + 90) % 360;
    setRotation(next);
    await applyTransforms(next, enhanced);
  }, [rotation, enhanced, applyTransforms]);

  const toggleEnhance = useCallback(async () => {
    const next = !enhanced;
    setEnhanced(next);
    await applyTransforms(rotation, next);
  }, [rotation, enhanced, applyTransforms]);

  // ── Confirm: map crop rect to image pixel coords ───────────────────────────

  const handleConfirm = useCallback(async () => {
    setIsProcessing(true);
    try {
      const actions: ImageManipulator.Action[] = [];

      // Rotation first so crop is relative to rotated image.
      if (rotation !== 0) actions.push({ rotate: rotation });

      if (naturalSize) {
        // After 90° or 270° rotation the image's axes are swapped, so swap
        // natural dimensions to match what's actually displayed in the preview.
        const swapAxes = rotation === 90 || rotation === 270;
        const nw = swapAxes ? naturalSize.height : naturalSize.width;
        const nh = swapAxes ? naturalSize.width : naturalSize.height;
        const aspectRatio = nw / nh;

        let renderedW: number, renderedH: number, offsetX: number, offsetY: number;
        if (aspectRatio >= 1) {
          renderedW = PREVIEW_SIZE;
          renderedH = PREVIEW_SIZE / aspectRatio;
          offsetX = 0;
          offsetY = (PREVIEW_SIZE - renderedH) / 2;
        } else {
          renderedH = PREVIEW_SIZE;
          renderedW = PREVIEW_SIZE * aspectRatio;
          offsetX = (PREVIEW_SIZE - renderedW) / 2;
          offsetY = 0;
        }

        const scaleX = nw / renderedW;
        const scaleY = nh / renderedH;

        const l = cropL.value;
        const t = cropT.value;
        const r = cropR.value;
        const b = cropB.value;

        // Map preview coords → image pixel coords, clamped to image bounds.
        const originX = Math.max(0, Math.round((l - offsetX) * scaleX));
        const originY = Math.max(0, Math.round((t - offsetY) * scaleY));
        const cropW = Math.min(nw - originX, Math.round((r - l) * scaleX));
        const cropH = Math.min(nh - originY, Math.round((b - t) * scaleY));

        if (cropW > 0 && cropH > 0) {
          actions.push({ crop: { originX, originY, width: cropW, height: cropH } });
        }
      }

      if (actions.length === 0) {
        onConfirm(currentUri);
        return;
      }

      const result = await ImageManipulator.manipulateAsync(
        uri,
        actions,
        { compress: 0.92, format: ImageManipulator.SaveFormat.JPEG },
      );
      onConfirm(result.uri);
    } catch {
      onConfirm(currentUri);
    } finally {
      setIsProcessing(false);
    }
  }, [naturalSize, rotation, currentUri, uri, cropL, cropT, cropR, cropB, onConfirm]);

  // ── Crop box animated styles ───────────────────────────────────────────────

  const boxStyle = useAnimatedStyle(() => ({
    position: 'absolute',
    left: cropL.value,
    top: cropT.value,
    width: cropR.value - cropL.value,
    height: cropB.value - cropT.value,
  }));

  // Shadow strips (top, bottom, left, right) outside the crop rect.
  const overlayTop = useAnimatedStyle(() => ({
    position: 'absolute',
    left: 0, top: 0, right: 0,
    height: cropT.value,
    backgroundColor: 'rgba(0,0,0,0.55)',
  }));
  const overlayBottom = useAnimatedStyle(() => ({
    position: 'absolute',
    left: 0, right: 0, bottom: 0,
    top: cropB.value,
    backgroundColor: 'rgba(0,0,0,0.55)',
  }));
  const overlayLeft = useAnimatedStyle(() => ({
    position: 'absolute',
    left: 0,
    top: cropT.value,
    width: cropL.value,
    bottom: PREVIEW_SIZE - cropB.value,
    backgroundColor: 'rgba(0,0,0,0.55)',
  }));
  const overlayRight = useAnimatedStyle(() => ({
    position: 'absolute',
    right: 0,
    top: cropT.value,
    left: cropR.value,
    bottom: PREVIEW_SIZE - cropB.value,
    backgroundColor: 'rgba(0,0,0,0.55)',
  }));

  // ── Corner handle gestures ─────────────────────────────────────────────────

  function makeCornerGesture(corner: 'tl' | 'tr' | 'bl' | 'br') {
    return Gesture.Pan()
      .onStart(() => {
        startL.value = cropL.value;
        startT.value = cropT.value;
        startR.value = cropR.value;
        startB.value = cropB.value;
      })
      .onUpdate((e) => {
        const dx = e.translationX;
        const dy = e.translationY;
        if (corner === 'tl' || corner === 'bl') {
          cropL.value = clamp(startL.value + dx, 0, startR.value - MIN_CROP);
        }
        if (corner === 'tr' || corner === 'br') {
          cropR.value = clamp(startR.value + dx, startL.value + MIN_CROP, PREVIEW_SIZE);
        }
        if (corner === 'tl' || corner === 'tr') {
          cropT.value = clamp(startT.value + dy, 0, startB.value - MIN_CROP);
        }
        if (corner === 'bl' || corner === 'br') {
          cropB.value = clamp(startB.value + dy, startT.value + MIN_CROP, PREVIEW_SIZE);
        }
      });
  }

  const gestureTL = makeCornerGesture('tl');
  const gestureTR = makeCornerGesture('tr');
  const gestureBL = makeCornerGesture('bl');
  const gestureBR = makeCornerGesture('br');

  const cornerTL = useAnimatedStyle(() => ({
    position: 'absolute',
    left: cropL.value - HANDLE / 2,
    top: cropT.value - HANDLE / 2,
  }));
  const cornerTR = useAnimatedStyle(() => ({
    position: 'absolute',
    right: PREVIEW_SIZE - cropR.value - HANDLE / 2,
    top: cropT.value - HANDLE / 2,
  }));
  const cornerBL = useAnimatedStyle(() => ({
    position: 'absolute',
    left: cropL.value - HANDLE / 2,
    bottom: PREVIEW_SIZE - cropB.value - HANDLE / 2,
  }));
  const cornerBR = useAnimatedStyle(() => ({
    position: 'absolute',
    right: PREVIEW_SIZE - cropR.value - HANDLE / 2,
    bottom: PREVIEW_SIZE - cropB.value - HANDLE / 2,
  }));

  return (
    <View style={styles.container}>
      {/* Preview + crop overlay */}
      <View style={styles.previewContainer}>
        {isProcessing ? (
          <View style={[styles.preview, styles.previewLoading]}>
            <ActivityIndicator size="large" color={C.amber} />
          </View>
        ) : (
          <View style={{ width: PREVIEW_SIZE, height: PREVIEW_SIZE }}>
            <Image
              source={{ uri: currentUri }}
              style={styles.preview}
              resizeMode="contain"
            />

            {/* Overlay mask strips */}
            <Animated.View style={overlayTop} pointerEvents="none" />
            <Animated.View style={overlayBottom} pointerEvents="none" />
            <Animated.View style={overlayLeft} pointerEvents="none" />
            <Animated.View style={overlayRight} pointerEvents="none" />

            {/* Crop border */}
            <Animated.View style={[boxStyle, styles.cropBorder]} pointerEvents="none" />

            {/* Corner handles */}
            <GestureDetector gesture={gestureTL}>
              <Animated.View style={[styles.handle, cornerTL]} />
            </GestureDetector>
            <GestureDetector gesture={gestureTR}>
              <Animated.View style={[styles.handle, cornerTR]} />
            </GestureDetector>
            <GestureDetector gesture={gestureBL}>
              <Animated.View style={[styles.handle, cornerBL]} />
            </GestureDetector>
            <GestureDetector gesture={gestureBR}>
              <Animated.View style={[styles.handle, cornerBR]} />
            </GestureDetector>
          </View>
        )}
      </View>

      {/* Tool bar */}
      <View style={styles.toolbar}>
        <ToolButton emoji="↺" label="Rotate L" onPress={rotateLeft} disabled={isProcessing} />
        <ToolButton emoji="↻" label="Rotate R" onPress={rotateRight} disabled={isProcessing} />
        <ToolButton
          emoji="✨"
          label="Enhance"
          onPress={toggleEnhance}
          disabled={isProcessing}
          active={enhanced}
        />
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <Pressable style={styles.cancelBtn} onPress={onCancel}>
          <Text style={styles.cancelText}>Retake</Text>
        </Pressable>
        <Pressable
          style={[styles.confirmBtn, isProcessing && styles.confirmDisabled]}
          onPress={handleConfirm}
          disabled={isProcessing}
        >
          <Text style={styles.confirmText}>Use Photo</Text>
        </Pressable>
      </View>
    </View>
  );
}

interface ToolButtonProps {
  emoji: string;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  active?: boolean;
}

function ToolButton({ emoji, label, onPress, disabled, active }: ToolButtonProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.toolBtn,
        active && styles.toolBtnActive,
        (pressed || disabled) && styles.toolBtnPressed,
      ]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={styles.toolEmoji}>{emoji}</Text>
      <Text style={[styles.toolLabel, active && styles.toolLabelActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.ink1,
    alignItems: 'center',
    paddingHorizontal: S[8],
  },
  previewContainer: {
    marginTop: S[4],
    marginBottom: S[6],
    borderRadius: R.lg,
    overflow: 'hidden',
    backgroundColor: C.ink2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  preview: {
    width: PREVIEW_SIZE,
    height: PREVIEW_SIZE,
  },
  previewLoading: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  cropBorder: {
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.85)',
  },
  handle: {
    width: HANDLE,
    height: HANDLE,
    backgroundColor: '#fff',
    borderRadius: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.4,
    shadowRadius: 3,
    elevation: 4,
  },
  toolbar: {
    flexDirection: 'row',
    gap: S[4],
    marginBottom: S[6],
  },
  toolBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.ink3,
    borderRadius: R.lg,
    paddingVertical: S[3],
    paddingHorizontal: S[4],
    minWidth: 80,
    minHeight: 64,
  },
  toolBtnActive: {
    backgroundColor: C.amberDim,
  },
  toolBtnPressed: {
    opacity: 0.65,
  },
  toolEmoji: {
    fontSize: 22,
    marginBottom: S[1],
  },
  toolLabel: {
    fontSize: T.xs,
    color: C.ash,
    fontWeight: '500',
  },
  toolLabelActive: {
    color: C.amber,
  },
  actions: {
    flexDirection: 'row',
    gap: S[3],
    width: '100%',
  },
  cancelBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.ink3,
    borderRadius: R.lg,
    paddingVertical: S[4],
    minHeight: 52,
  },
  cancelText: {
    fontSize: T.base,
    color: C.ash,
    fontWeight: '500',
  },
  confirmBtn: {
    flex: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.amber,
    borderRadius: R.lg,
    paddingVertical: S[4],
    minHeight: 52,
  },
  confirmDisabled: {
    opacity: 0.5,
  },
  confirmText: {
    fontSize: T.base,
    color: C.ink1,
    fontWeight: '700',
  },
});
