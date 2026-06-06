/**
 * SkeletonLoader.tsx — Animated placeholder cards (Phase 9)
 *
 * Uses Reanimated shared-value loop for a smooth shimmer effect.
 * No external library needed.
 */

import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  interpolate,
  Easing,
} from 'react-native-reanimated';
import { C, S, R } from '@/theme/tokens';

function ShimmerBlock({ width, height, style }: {
  width: number | string;
  height: number;
  style?: object;
}) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0.35, 0.7]),
  }));

  return (
    <Animated.View
      style={[{ width, height, borderRadius: R.md, backgroundColor: C.ink3 }, animStyle, style]}
      accessibilityElementsHidden
      importantForAccessibility="no"
    />
  );
}

export function DocumentCardSkeleton() {
  return (
    <View style={styles.card}>
      <View style={styles.accentBar} />
      <View style={styles.content}>
        <View style={styles.info}>
          <ShimmerBlock width={80} height={10} style={{ marginBottom: S[2] }} />
          <ShimmerBlock width="85%" height={14} style={{ marginBottom: S[2] }} />
          <ShimmerBlock width={60} height={10} style={{ marginBottom: S[3] }} />
          <ShimmerBlock width={100} height={10} />
        </View>
        <ShimmerBlock width={68} height={68} style={{ borderRadius: R.md }} />
      </View>
    </View>
  );
}

export function SkeletonList({ count = 6 }: { count?: number }) {
  return (
    <View style={styles.list} accessibilityLabel="Loading documents…">
      {Array.from({ length: count }).map((_, i) => (
        <React.Fragment key={i}>
          <DocumentCardSkeleton />
          {i < count - 1 && <View style={{ height: S[2] }} />}
        </React.Fragment>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: S[4], paddingTop: S[3] },
  card: {
    backgroundColor: C.ink2,
    borderRadius: R.lg,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  accentBar: { width: 3, backgroundColor: C.ink3 },
  content: {
    flex: 1,
    flexDirection: 'row',
    padding: S[3],
    gap: S[3],
  },
  info: { flex: 1 },
});
