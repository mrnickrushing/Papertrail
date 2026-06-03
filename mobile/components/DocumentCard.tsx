import { View, Text, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Colors, T, S, Font, Radius } from '@/theme';
import { Document } from '@/types/document';
import { format } from 'date-fns';

const DOC_TYPE_COLORS: Record<string, string> = {
  receipt:   Colors.docReceipt,
  contract:  Colors.docContract,
  id:        Colors.docID,
  warranty:  Colors.docWarranty,
  medical:   Colors.docMedical,
  insurance: Colors.docInsurance,
  tax:       Colors.docTax,
  invoice:   Colors.docInvoice,
  personal:  Colors.docPersonal,
  other:     Colors.textFaint,
};

interface Props {
  document: Document;
  compact?: boolean;
  onPress?: () => void;
}

export function DocumentCard({ document: doc, compact, onPress }: Props) {
  const accentColor = DOC_TYPE_COLORS[doc.type] ?? Colors.textFaint;
  const handlePress = onPress ?? (() => router.push(`/document/${doc.id}`));

  if (compact) {
    return (
      <Pressable
        style={styles.compact}
        onPress={handlePress}
        android_ripple={{ color: Colors.surfaceDynamic }}
      >
        <View style={[styles.compactDot, { backgroundColor: accentColor }]} />
        <Text style={styles.compactTitle} numberOfLines={1}>{doc.title}</Text>
        <Text style={styles.compactType}>{doc.type}</Text>
      </Pressable>
    );
  }

  return (
    <Pressable
      style={styles.card}
      onPress={handlePress}
      android_ripple={{ color: Colors.surfaceDynamic }}
    >
      {/* Type accent strip */}
      <View style={[styles.accent, { backgroundColor: accentColor }]} />

      <View style={styles.body}>
        <View style={styles.topRow}>
          <Text style={styles.title} numberOfLines={2}>{doc.title}</Text>
          {doc.isFavorited && <Text style={styles.star}>★</Text>}
        </View>

        <View style={styles.meta}>
          <View style={[styles.typePill, { backgroundColor: `${accentColor}22` }]}>
            <Text style={[styles.typeLabel, { color: accentColor }]}>
              {doc.type.toUpperCase()}
            </Text>
          </View>
          <Text style={styles.date}>
            {format(new Date(doc.updatedAt), 'MMM d, yyyy')}
          </Text>
          {doc.fileSize > 0 && (
            <Text style={styles.size}>{(doc.fileSize / 1024).toFixed(0)} KB</Text>
          )}
        </View>

        {doc.expiryDate && (
          <Text style={styles.expiry}>
            Expires {format(new Date(doc.expiryDate), 'MMM d, yyyy')}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: S[2],
    overflow: 'hidden',
    minHeight: 76,
  },
  accent: { width: 3 },
  body: { flex: 1, padding: S[3] },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  title: { fontSize: T.base, fontWeight: Font.semibold, color: Colors.text, flex: 1, lineHeight: 22 },
  star: { fontSize: T.md, color: Colors.accent, marginLeft: S[2] },
  meta: { flexDirection: 'row', alignItems: 'center', gap: S[2], marginTop: S[1] },
  typePill: { borderRadius: Radius.full, paddingHorizontal: S[2], paddingVertical: 2 },
  typeLabel: { fontSize: T.xs, fontWeight: Font.bold, letterSpacing: 0.4 },
  date: { fontSize: T.xs, color: Colors.textMuted },
  size: { fontSize: T.xs, color: Colors.textFaint },
  expiry: { fontSize: T.xs, color: Colors.warning, marginTop: S[1], fontWeight: Font.medium },
  // Compact (horizontal scroll)
  compact: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: S[3],
    marginRight: S[2],
    width: 140,
    gap: S[1],
  },
  compactDot: { width: 8, height: 8, borderRadius: 4 },
  compactTitle: { fontSize: T.sm, fontWeight: Font.semibold, color: Colors.text },
  compactType: { fontSize: T.xs, color: Colors.textMuted },
});
