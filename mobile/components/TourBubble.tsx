import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { C, R, S, T } from '@/theme/tokens';

type Arrow =
  | 'top-left' | 'top-center' | 'top-right'
  | 'bottom-left' | 'bottom-center' | 'bottom-right'
  | 'none';

interface Props {
  title: string;
  body: string;
  visible: boolean;
  onDismiss: () => void;
  /** Absolute position within the screen's root View. */
  anchor: { top?: number; bottom?: number; left?: number; right?: number };
  /** Which corner / edge of the bubble the pointer arrow attaches to. */
  arrow?: Arrow;
}

export function TourBubble({ title, body, visible, onDismiss, anchor, arrow = 'none' }: Props) {
  const opacity = useRef(new Animated.Value(0)).current;
  const shift = useRef(new Animated.Value(6)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.timing(shift,   { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.timing(opacity, { toValue: 0, duration: 140, useNativeDriver: true }).start();
    }
  }, [visible, opacity, shift]);

  if (!visible) return null;

  const isTop    = arrow.startsWith('top');
  const isBottom = arrow.startsWith('bottom');
  const arrowH   = arrow.endsWith('right') ? 'flex-end' : arrow.endsWith('center') ? 'center' : 'flex-start';

  return (
    <Animated.View
      style={[
        styles.wrapper,
        anchor,
        { opacity, transform: [{ translateY: isBottom ? shift : Animated.multiply(shift, -1) }] },
      ]}
      pointerEvents="box-none"
    >
      {/* Top arrow */}
      {isTop && (
        <View style={[styles.arrowRow, { justifyContent: arrowH }]}>
          <View style={styles.arrowUp} />
        </View>
      )}

      {/* Card */}
      <View style={styles.card}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.body}>{body}</Text>
        <Pressable
          onPress={onDismiss}
          style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}
          accessibilityRole="button"
          accessibilityLabel="Dismiss tip"
        >
          <Text style={styles.btnText}>Got it  →</Text>
        </Pressable>
      </View>

      {/* Bottom arrow */}
      {isBottom && (
        <View style={[styles.arrowRow, { justifyContent: arrowH }]}>
          <View style={styles.arrowDown} />
        </View>
      )}
    </Animated.View>
  );
}

const BUBBLE_BG = C.ink2;
const BORDER    = `${C.amber}55` as string;

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    zIndex:   999,
    maxWidth: 280,
  },
  arrowRow: {
    flexDirection: 'row',
    paddingHorizontal: S[4],
  },
  arrowUp: {
    width: 0, height: 0,
    borderLeftWidth: 9, borderRightWidth: 9, borderBottomWidth: 11,
    borderLeftColor: 'transparent', borderRightColor: 'transparent',
    borderBottomColor: BUBBLE_BG,
  },
  arrowDown: {
    width: 0, height: 0,
    borderLeftWidth: 9, borderRightWidth: 9, borderTopWidth: 11,
    borderLeftColor: 'transparent', borderRightColor: 'transparent',
    borderTopColor: BUBBLE_BG,
  },
  card: {
    backgroundColor: BUBBLE_BG,
    borderRadius: R.xl,
    borderWidth: 1,
    borderColor: BORDER,
    padding: S[4],
    gap: S[2],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.55,
    shadowRadius: 20,
    elevation: 16,
  },
  title: {
    color: C.cream,
    fontSize: T.sm,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  body: {
    color: C.ash,
    fontSize: T.sm,
    lineHeight: 20,
  },
  btn: {
    alignSelf: 'flex-end',
    paddingVertical: S[2],
    paddingHorizontal: S[3],
    borderRadius: R.full,
    backgroundColor: C.amberDim,
    borderWidth: 1,
    borderColor: `${C.amber}44`,
    marginTop: S[1],
  },
  btnPressed: { opacity: 0.72 },
  btnText: {
    color: C.amber,
    fontSize: T.sm,
    fontWeight: '700',
  },
});
