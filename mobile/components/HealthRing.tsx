/**
 * HealthRing.tsx — "Document Health" indicator for the Vault header.
 *
 * Tracks whether the vault has at least one document in each of four
 * critical categories (ID, medical, tax, warranty) and renders the result as
 * a small percentage ring (drawn with react-native-svg) next to the doc
 * count. Tapping it opens a sheet explaining which categories are missing —
 * this folds the old standalone HealthScoreBanner into the header instead of
 * leaving it as a banner nothing ever rendered.
 */

import React, { useMemo, useState } from 'react';
import { Modal, Pressable, View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import { C, T, S, R } from '@/theme/tokens';
import type { Document, DocumentCategory } from '@/types/document';

const CRITICAL_CATEGORIES: DocumentCategory[] = ['id', 'medical', 'tax', 'warranty'];

const CATEGORY_LABELS: Partial<Record<DocumentCategory, string>> = {
  id: 'ID / Passport',
  medical: 'Medical Records',
  tax: 'Tax Documents',
  warranty: 'Warranties',
};

interface HealthRingProps {
  documents: Document[];
  size?: number;
  strokeWidth?: number;
  compact?: boolean;
}

export function HealthRing({ documents, size = 34, strokeWidth = 3, compact = false }: HealthRingProps) {
  const insets = useSafeAreaInsets();
  const [showExplain, setShowExplain] = useState(false);

  const presentCategories = useMemo(
    () => new Set(documents.map((d) => d.category)),
    [documents],
  );
  const missingCategories = CRITICAL_CATEGORIES.filter((cat) => !presentCategories.has(cat));
  const score = Math.round(
    ((CRITICAL_CATEGORIES.length - missingCategories.length) / CRITICAL_CATEGORIES.length) * 100,
  );

  const center = size / 2;
  const radius = center - strokeWidth / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - score / 100);
  const color = score >= 75 ? C.success : score >= 50 ? C.warning : C.danger;

  return (
    <>
      <Pressable
        onPress={() => setShowExplain(true)}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={`Document health score: ${score} percent. Tap for details.`}
      >
        <View style={[compact ? styles.compactWrap : null]}>
          <View style={[styles.ring, { width: size, height: size }]}>
            <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
              <Circle
                cx={center}
                cy={center}
                r={radius}
                stroke={C.ink4}
                strokeWidth={strokeWidth}
                fill="none"
              />
              <Circle
                cx={center}
                cy={center}
                r={radius}
                stroke={color}
                strokeWidth={strokeWidth}
                fill="none"
                strokeDasharray={`${circumference}, ${circumference}`}
                strokeDashoffset={offset}
                strokeLinecap="round"
                rotation={-90}
                originX={center}
                originY={center}
              />
            </Svg>
            <Text style={[styles.scoreText, { color, fontSize: Math.round(size * 0.32) }]}>
              {score}
            </Text>
          </View>
          {compact && (
            <Text style={[styles.compactLabel, { color }]}>Health</Text>
          )}
        </View>
      </Pressable>

      <Modal
        visible={showExplain}
        transparent
        animationType="fade"
        onRequestClose={() => setShowExplain(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setShowExplain(false)}>
          <Pressable
            style={[styles.sheet, { paddingBottom: insets.bottom + S[5] }]}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={styles.title}>Document Health — {score}%</Text>
            <Text style={styles.body}>
              Tracks whether your vault has at least one document saved in each
              critical category. A higher score means you're better covered if
              you ever need to find these in a hurry.
            </Text>
            <View style={styles.list}>
              {CRITICAL_CATEGORIES.map((cat) => {
                const present = presentCategories.has(cat);
                return (
                  <View key={cat} style={styles.row}>
                    <Text style={[styles.check, { color: present ? C.success : C.faint }]}>
                      {present ? '✓' : '○'}
                    </Text>
                    <Text style={[styles.rowLabel, { color: present ? C.cream : C.ash }]}>
                      {CATEGORY_LABELS[cat] ?? cat}
                    </Text>
                  </View>
                );
              })}
            </View>
            <Pressable style={styles.closeBtn} onPress={() => setShowExplain(false)}>
              <Text style={styles.closeBtnText}>Got it</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  ring: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactWrap: {
    minHeight: 28,
    paddingLeft: S[1],
    paddingRight: S[2],
    borderRadius: R.full,
    backgroundColor: C.ink2,
    borderWidth: 1,
    borderColor: C.ink3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: S[2],
  },
  compactLabel: {
    fontSize: T.xs,
    fontWeight: '700',
    marginRight: S[1],
  },
  scoreText: {
    fontWeight: '700',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: C.ink2,
    borderTopLeftRadius: R.xl,
    borderTopRightRadius: R.xl,
    padding: S[6],
  },
  title: {
    fontSize: T.lg,
    fontWeight: '700',
    color: C.cream,
    marginBottom: S[2],
  },
  body: {
    fontSize: T.sm,
    color: C.ash,
    lineHeight: 20,
    marginBottom: S[4],
  },
  list: {
    gap: S[2],
    marginBottom: S[5],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S[3],
  },
  check: {
    fontSize: T.base,
    fontWeight: '700',
    width: 20,
  },
  rowLabel: {
    fontSize: T.sm,
  },
  closeBtn: {
    backgroundColor: C.amber,
    borderRadius: R.md,
    paddingVertical: S[3],
    alignItems: 'center',
  },
  closeBtnText: {
    fontSize: T.sm,
    fontWeight: '600',
    color: C.cream,
  },
});
