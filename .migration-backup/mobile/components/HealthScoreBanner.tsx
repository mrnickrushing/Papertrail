import { View, Text, StyleSheet } from 'react-native';
import { Colors, T, S, Font, Radius } from '@/theme';
import { useDocumentStore } from '@/store/documentStore';

const CRITICAL_TYPES = ['id', 'medical', 'tax', 'warranty'] as const;

export function HealthScoreBanner() {
  const documents = useDocumentStore((s) => s.documents);

  const presentTypes = new Set(documents.map((d) => d.category));
  const missingTypes = CRITICAL_TYPES.filter((type) => !presentTypes.has(type));
  const score = Math.round(
    ((CRITICAL_TYPES.length - missingTypes.length) / CRITICAL_TYPES.length) * 100
  );

  const color =
    score >= 75 ? Colors.success : score >= 50 ? Colors.warning : Colors.error;

  return (
    <View style={styles.banner}>
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
    </View>
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
});
