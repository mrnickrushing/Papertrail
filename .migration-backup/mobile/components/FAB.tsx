import React from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Radius, Shadows, Spacing } from '@/theme';

// Floating tab bar height + gap — must match (tabs)/_layout.tsx
const TAB_BAR_HEIGHT = 62;
const TAB_BAR_GAP = 8; // bottom offset from safe area

interface Props {
  onPress: () => void;
}

export function FAB({ onPress }: Props) {
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, 8);
  // Position FAB above the floating pill tab bar
  const fabBottom = bottomInset + TAB_BAR_GAP + TAB_BAR_HEIGHT + Spacing['3'];

  return (
    <Pressable
      style={({ pressed }) => [
        styles.fab,
        { bottom: fabBottom },
        pressed && styles.pressed,
      ]}
      onPress={onPress}
      accessibilityLabel="Add document"
      accessibilityRole="button"
    >
      <Text style={styles.icon}>+</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position:        'absolute',
    right:           Spacing['5'],
    width:           56,
    height:          56,
    borderRadius:    Radius.full,
    backgroundColor: Colors.primary,
    justifyContent:  'center',
    alignItems:      'center',
    ...Shadows.lg,
  },
  pressed: { transform: [{ scale: 0.92 }], opacity: 0.88 },
  icon: {
    fontSize:   28,
    color:      Colors.textInverse,
    lineHeight: 32,
    fontWeight: '300',
  },
});
