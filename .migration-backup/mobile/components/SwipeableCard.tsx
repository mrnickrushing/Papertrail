/**
 * SwipeableCard.tsx — Swipe-to-action wrapper for document cards
 *
 * Swipe right → favorite (amber)
 * Swipe left  → delete (danger red)
 *
 * Uses react-native-gesture-handler + reanimated so swipe gestures
 * properly cooperate with GestureHandlerRootView and navigation pan
 * gestures (no PanResponder vs RNGH conflicts).
 */

import React, { useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Feather } from '@expo/vector-icons';
import { C, R, S, T } from '@/theme/tokens';

const ACTION_THRESHOLD = 72;

interface Props {
  children: React.ReactNode;
  onDelete: () => void;
  onFavorite: () => void;
  isFavorite: boolean;
  /** Disable swipe when in selection mode */
  disabled?: boolean;
}

export function SwipeableCard({ children, onDelete, onFavorite, isFavorite, disabled }: Props) {
  const translateX = useSharedValue(0);
  const hasFired = useSharedValue(false);

  const hapticLight = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const pan = Gesture.Pan()
    .enabled(!disabled)
    .activeOffsetX([-8, 8])
    .failOffsetY([-10, 10])
    .onUpdate((e) => {
      translateX.value = e.translationX;
      if (!hasFired.value && Math.abs(e.translationX) >= ACTION_THRESHOLD) {
        hasFired.value = true;
        runOnJS(hapticLight)();
      }
      if (hasFired.value && Math.abs(e.translationX) < ACTION_THRESHOLD) {
        hasFired.value = false;
      }
    })
    .onEnd((e) => {
      hasFired.value = false;
      if (e.translationX >= ACTION_THRESHOLD) {
        translateX.value = 0;
        runOnJS(onFavorite)();
      } else if (e.translationX <= -ACTION_THRESHOLD) {
        translateX.value = 0;
        runOnJS(onDelete)();
      } else {
        translateX.value = withSpring(0);
      }
    })
    .onFinalize(() => {
      hasFired.value = false;
      translateX.value = withSpring(0);
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const rightBgStyle = useAnimatedStyle(() => {
    const progress = Math.min(Math.max(translateX.value / ACTION_THRESHOLD, 0), 1);
    return { opacity: progress };
  });

  const leftBgStyle = useAnimatedStyle(() => {
    const progress = Math.min(Math.max(-translateX.value / ACTION_THRESHOLD, 0), 1);
    return { opacity: progress };
  });

  return (
    <View style={styles.container}>
      {/* Left underlay (delete) */}
      <Animated.View style={[styles.underlay, styles.underlayLeft, leftBgStyle]}>
        <Feather name="trash-2" size={20} color={C.ink1} />
        <Text style={styles.underlayLabel}>Delete</Text>
      </Animated.View>

      {/* Right underlay (favorite) */}
      <Animated.View style={[styles.underlay, styles.underlayRight, rightBgStyle]}>
        <Text style={styles.underlayLabel}>{isFavorite ? 'Unfave' : 'Fave'}</Text>
        <Feather name="star" size={20} color={C.ink1} />
      </Animated.View>

      <GestureDetector gesture={pan}>
        <Animated.View style={animatedStyle}>
          {children}
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: R.lg,
  },
  underlay: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: S[4],
    borderRadius: R.lg,
  },
  underlayLeft: {
    justifyContent: 'flex-end',
    backgroundColor: C.danger + 'CC',
  },
  underlayRight: {
    justifyContent: 'flex-start',
    backgroundColor: C.amber + 'CC',
  },
  underlayLabel: {
    fontSize: T.sm,
    fontWeight: '700',
    color: C.ink1,
    marginHorizontal: S[1],
  },
});
