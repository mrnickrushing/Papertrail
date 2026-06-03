import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Colors, T, S, Font } from '@/theme';
import { useDocumentStore } from '@/store/documentStore';
import { DocumentCard } from '@/components/DocumentCard';
import { EmptyState } from '@/components/EmptyState';
import { HealthScoreBanner } from '@/components/HealthScoreBanner';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const recent = useDocumentStore((s) => s.getRecentDocuments(6));
  const favorited = useDocumentStore((s) => s.getFavoritedDocuments());
  const documents = useDocumentStore((s) => s.documents);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.appName}>PaperTrail</Text>
          <Text style={styles.subtitle}>{documents.length} documents</Text>
        </View>
        <Pressable
          style={styles.addBtn}
          onPress={() => router.push('/capture')}
        >
          <Text style={styles.addBtnText}>+</Text>
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Health Score */}
        <HealthScoreBanner />

        {/* Pinned / Favorites */}
        {favorited.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Pinned</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {favorited.slice(0, 6).map((doc) => (
                <DocumentCard key={doc.id} document={doc} compact />
              ))}
            </ScrollView>
          </View>
        )}

        {/* Recent */}
        <View style={styles.section}>
          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>Recent</Text>
            {documents.length > 0 && (
              <Pressable onPress={() => router.push('/folders')}>
                <Text style={styles.seeAll}>See all</Text>
              </Pressable>
            )}
          </View>
          {recent.length === 0 ? (
            <EmptyState
              icon="doc.text"
              title="No documents yet"
              message="Tap + to scan or import your first document."
            />
          ) : (
            recent.map((doc) => (
              <DocumentCard key={doc.id} document={doc} />
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: S[4],
    paddingVertical: S[3],
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  appName: {
    fontSize: T.xl,
    fontWeight: Font.bold,
    color: Colors.text,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: T.xs,
    color: Colors.textMuted,
    marginTop: 1,
  },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnText: {
    fontSize: T.xl,
    color: Colors.textInverse,
    fontWeight: Font.bold,
    lineHeight: 28,
  },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: S[10] },
  section: { paddingTop: S[5], paddingHorizontal: S[4] },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: S[3] },
  sectionTitle: { fontSize: T.md, fontWeight: Font.semibold, color: Colors.text },
  seeAll: { fontSize: T.sm, color: Colors.accent, fontWeight: Font.medium },
});
