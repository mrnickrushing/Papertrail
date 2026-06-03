import { useState, useMemo } from 'react';
import { View, Text, TextInput, FlatList, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Colors, T, S, Font, Radius } from '@/theme';
import { useDocumentStore } from '@/store/documentStore';
import { DocumentCard } from '@/components/DocumentCard';
import { EmptyState } from '@/components/EmptyState';

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const documents = useDocumentStore((s) => s.documents);
  const [query, setQuery] = useState('');

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return documents.filter(
      (d) =>
        d.title.toLowerCase().includes(q) ||
        d.ocrText?.toLowerCase().includes(q) ||
        d.type.toLowerCase().includes(q) ||
        d.tags.some((t) => t.toLowerCase().includes(q))
    );
  }, [query, documents]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Search</Text>
      </View>

      <View style={styles.searchBar}>
        <TextInput
          style={styles.input}
          placeholder="Search documents, tags, content..."
          placeholderTextColor={Colors.textFaint}
          value={query}
          onChangeText={setQuery}
          returnKeyType="search"
          autoCorrect={false}
          autoCapitalize="none"
          clearButtonMode="while-editing"
        />
      </View>

      <FlatList
        data={results}
        keyExtractor={(d) => d.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <DocumentCard
            document={item}
            onPress={() => router.push(`/document/${item.id}`)}
          />
        )}
        ListEmptyComponent={
          query.length === 0 ? (
            <EmptyState
              icon="magnifyingglass"
              title="Search everything"
              message="Search across document names, OCR content, and tags."
            />
          ) : (
            <EmptyState
              icon="doc.text.magnifyingglass"
              title="No results"
              message={`No documents matching "${query}".`}
            />
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: {
    paddingHorizontal: S[4],
    paddingVertical: S[3],
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: { fontSize: T.xl, fontWeight: Font.bold, color: Colors.text, letterSpacing: -0.5 },
  searchBar: { paddingHorizontal: S[4], paddingVertical: S[3] },
  input: {
    backgroundColor: Colors.surface2,
    borderRadius: Radius.lg,
    paddingHorizontal: S[4],
    paddingVertical: S[3],
    fontSize: T.base,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  list: { padding: S[4], paddingBottom: S[10] },
});
