import { View, Text, ScrollView, StyleSheet, Pressable, Alert } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, T, S, Font, Radius } from '@/theme';
import { useDocumentStore } from '@/store/documentStore';
import { format } from 'date-fns';

export default function DocumentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const documents = useDocumentStore((s) => s.documents);
  const toggleFavorite = useDocumentStore((s) => s.toggleFavorite);
  const deleteDocument = useDocumentStore((s) => s.deleteDocument);

  const doc = documents.find((d) => d.id === id);

  if (!doc) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Text style={styles.notFound}>Document not found.</Text>
      </View>
    );
  }

  const handleDelete = () => {
    Alert.alert('Delete Document', `Delete "${doc.title}"? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteDocument(doc.id);
          router.back();
        },
      },
    ]);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Nav */}
      <View style={styles.nav}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Text style={styles.back}>← Back</Text>
        </Pressable>
        <Pressable onPress={() => toggleFavorite(doc.id)} hitSlop={8}>
          <Text style={styles.fav}>{doc.isFavorited ? '★' : '☆'}</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Title */}
        <Text style={styles.title}>{doc.title}</Text>

        {/* Meta */}
        <View style={styles.metaRow}>
          <View style={styles.typePill}>
            <Text style={styles.typeText}>{doc.type.toUpperCase()}</Text>
          </View>
          <Text style={styles.meta}>
            {format(new Date(doc.createdAt), 'MMM d, yyyy')}
          </Text>
          <Text style={styles.meta}>
            {(doc.fileSize / 1024).toFixed(1)} KB
          </Text>
        </View>

        {/* OCR Text Preview */}
        {doc.ocrText ? (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Extracted Text</Text>
            <View style={styles.ocrBox}>
              <Text style={styles.ocrText}>{doc.ocrText}</Text>
            </View>
          </View>
        ) : null}

        {/* Notes */}
        {doc.notes ? (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Notes</Text>
            <Text style={styles.notes}>{doc.notes}</Text>
          </View>
        ) : null}

        {/* Expiry */}
        {doc.expiryDate ? (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Expires</Text>
            <Text style={styles.expiryDate}>
              {format(new Date(doc.expiryDate), 'MMMM d, yyyy')}
            </Text>
          </View>
        ) : null}

        {/* Actions */}
        <View style={styles.actions}>
          <Pressable style={styles.actionBtn} onPress={handleDelete}>
            <Text style={styles.actionBtnDanger}>Delete Document</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  nav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: S[4],
    paddingVertical: S[3],
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  back: { fontSize: T.base, color: Colors.accent, fontWeight: Font.medium },
  fav: { fontSize: T.xl, color: Colors.accent },
  scroll: { padding: S[4], paddingBottom: S[16] },
  title: { fontSize: T['2xl'], fontWeight: Font.bold, color: Colors.text, marginBottom: S[3] },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: S[2], marginBottom: S[5] },
  typePill: {
    backgroundColor: Colors.accentHighlight,
    borderRadius: Radius.full,
    paddingHorizontal: S[2],
    paddingVertical: 3,
  },
  typeText: { fontSize: T.xs, color: Colors.accent, fontWeight: Font.bold, letterSpacing: 0.5 },
  meta: { fontSize: T.sm, color: Colors.textMuted },
  section: { marginBottom: S[5] },
  sectionLabel: { fontSize: T.xs, color: Colors.textFaint, fontWeight: Font.semibold, letterSpacing: 0.5, marginBottom: S[2] },
  ocrBox: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: S[3],
    borderWidth: 1,
    borderColor: Colors.border,
  },
  ocrText: { fontSize: T.sm, color: Colors.textMuted, lineHeight: 20 },
  notes: { fontSize: T.base, color: Colors.text, lineHeight: 22 },
  expiryDate: { fontSize: T.base, color: Colors.warning, fontWeight: Font.medium },
  notFound: { fontSize: T.base, color: Colors.textMuted, margin: S[4] },
  actions: { marginTop: S[8] },
  actionBtn: {
    paddingVertical: S[3],
    borderRadius: Radius.md,
    backgroundColor: Colors.dangerHighlight,
    borderWidth: 1,
    borderColor: Colors.danger,
    alignItems: 'center',
  },
  actionBtnDanger: { fontSize: T.base, color: Colors.danger, fontWeight: Font.semibold },
});
