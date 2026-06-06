import React, { useState } from 'react';
import { Modal, Pressable, View, Text, StyleSheet } from 'react-native';
import { Colors, T, S, Font, Radius } from '@/theme';
import { useDocumentStore } from '@/store/documentStore';

const CRITICAL_TYPES = ['id', 'medical', 'tax', 'warranty'] as const;

export function HealthScoreBanner() {
  const documents = useDocumentStore((s) => s.documents);
  const [showExplain, setShowExplain] = useState(false);

  const presentTypes = new Set(documents.map((d) => d.category));
  const missingTypes = CRITICAL_TYPES.filter((type) => !presentTypes.has(type));
  const score = Math.round(
    ((CRITICAL_TYPES.length - missingTypes.length) / CRITICAL_TYPES.length) * 100
  );

  const color =
    score >= 75 ? Colors.success : score >= 50 ? Colors.warning : Colors.error;

  const categoryLabels: Record<string, string> = {
    id: 'ID / Passport',
    medical: 'Medical Records',
    tax: 'Tax Documents',
    warranty: 'Warranties',
  };

  return (
    <>
      <Pressable onPress={() => setShowExplain(true)} style={styles.banner}>
      <View style={styles.left}>
        <Text style={styles.label}>Document Health</Text>
        <Text style={styles.sub}>
          {missingTypes.length === 0
            ? 'All critical documents present'
            : `Missing: ${missingTypes.join(', ')}`}
        </Text>
      </View>
      <View style={[styles.scoreBadge, { borderColor: color }]}>
        <Text style={[styles.score, { color }]}>{score}%</Text>
      </View>
      </Pressable>

      <Modal
        visible={showExplain}
        transparent
        animationType="fade"
        onRequestClose={() => setShowExplain(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setShowExplain(false)}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <Text style={styles.sheetTitle}>Document Health Score</Text>
            <Text style={styles.sheetBody}>
              Your health score tracks whether you have at least one document
              in each of the four critical categories. A higher score means
              your vault is more complete.
            </Text>
            <View style={styles.categoryList}>
              {CRITICAL_TYPES.map((type) => (
                <View key={type} style={styles.categoryRow}>
                  <Text style={styles.categoryCheck}>
                    {presentTypes.has(type) ? '✓' : '○'}
                  </Text>
                  <Text style={[
                    styles.categoryLabel,
                    { color: presentTypes.has(type) ? Colors.success : Colors.textMuted }
                  ]}>
                    {categoryLabels[type] ?? type}
                  </Text>
                </View>
              ))}
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
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: S[4],
    marginBottom: S[2],
  },
  left: { flex: 1 },
  label: { fontSize: T.sm, fontWeight: Font.semibold, color: Colors.text },
  sub: { fontSize: T.xs, color: Colors.textMuted, marginTop: 2 },
  scoreBadge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  score: { fontSize: T.sm, fontWeight: Font.bold },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: S[6],
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: S[6],
    width: '100%',
  },
  sheetTitle: { fontSize: T.lg, fontWeight: Font.bold, color: Colors.text, marginBottom: S[2] },
  sheetBody: { fontSize: T.sm, color: Colors.textMuted, lineHeight: 20, marginBottom: S[4] },
  categoryList: { gap: S[2], marginBottom: S[5] },
  categoryRow: { flexDirection: 'row', alignItems: 'center', gap: S[3] },
  categoryCheck: { fontSize: T.base, fontWeight: Font.bold, color: Colors.text, width: 20 },
  categoryLabel: { fontSize: T.sm },
  closeBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: S[3],
    alignItems: 'center',
  },
  closeBtnText: { fontSize: T.sm, fontWeight: Font.semibold, color: Colors.text },
});
