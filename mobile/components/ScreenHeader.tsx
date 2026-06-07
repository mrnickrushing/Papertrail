/**
 * ScreenHeader.tsx — Standardised tab-root header
 *
 * Title + optional subtitle on the left, optional action slot on the right.
 * Replaces the bespoke header markup (and three slightly different title
 * typographies) that had drifted across Vault / Folders / Settings.
 */

import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { C, T, S } from '@/theme/tokens';

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  /** Rendered inline next to the subtitle — e.g. a small status indicator. */
  subtitleAccessory?: React.ReactNode;
  right?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function ScreenHeader({ title, subtitle, subtitleAccessory, right, style }: ScreenHeaderProps) {
  return (
    <View style={[styles.header, style]}>
      <View style={styles.titleBlock}>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        {subtitle ? (
          <View style={styles.subtitleRow}>
            <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>
            {subtitleAccessory}
          </View>
        ) : null}
      </View>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: S[6],
    paddingBottom: S[3],
    gap: S[3],
  },
  titleBlock: { flex: 1 },
  title: {
    fontSize: T.xxl,
    fontWeight: '700',
    color: C.cream,
    letterSpacing: -0.5,
  },
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S[2],
    marginTop: 2,
  },
  subtitle: {
    fontSize: T.sm,
    color: C.ash,
  },
});
