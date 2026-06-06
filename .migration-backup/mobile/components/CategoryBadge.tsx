import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Document } from '@/types';
import { Colors, Typography, Spacing, Radius } from '@/theme';

const CATEGORY_META: Record<
  Document['category'],
  { label: string; color: string }
> = {
  receipt:  { label: 'Receipt',  color: Colors.catReceipt },
  contract: { label: 'Contract', color: Colors.catContract },
  id:       { label: 'ID',       color: Colors.catID },
  warranty: { label: 'Warranty', color: Colors.catWarranty },
  medical:  { label: 'Medical',  color: Colors.catMedical },
  tax:      { label: 'Tax',      color: Colors.catTax },
  other:    { label: 'Other',    color: Colors.catOther },
};

interface Props {
  category: Document['category'];
  size?: 'sm' | 'lg';
}

export function CategoryBadge({ category, size = 'sm' }: Props) {
  const meta = CATEGORY_META[category] ?? CATEGORY_META.other;
  const isLg = size === 'lg';

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: meta.color + '22', borderColor: meta.color + '55' },
        isLg && styles.badgeLg,
      ]}
    >
      <Text
        style={[
          styles.text,
          { color: meta.color },
          isLg && styles.textLg,
        ]}
      >
        {meta.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: Spacing['2'] + 2,
    paddingVertical:   3,
    borderRadius:      Radius.full,
    borderWidth:       1,
    alignSelf:         'flex-start',
  },
  badgeLg: {
    paddingHorizontal: Spacing['3'],
    paddingVertical:   Spacing['1'],
  },
  text: {
    fontSize:      Typography.xs,
    fontWeight:    Typography.semibold,
    letterSpacing: 0.3,
  },
  textLg: {
    fontSize: Typography.sm,
  },
});
