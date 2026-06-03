import React, { useCallback, useMemo } from 'react';
import {
  View, Text, FlatList, StyleSheet,
  Pressable, ActivityIndicator, RefreshControl, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDocumentStore } from '@/store';
import { DocumentCard } from '@/components/DocumentCard';
import { FAB } from '@/components/FAB';
import { EmptyState } from '@/components/EmptyState';
import { Colors, Typography, Spacing } from '@/theme';

export default function VaultScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { documents, isLoading, loadDocuments, filters } = useDocumentStore();
  const visibleDocuments = useMemo(() => {
    let docs = [...documents];
    if (filters.category) docs = docs.filter((doc) => doc.category === filters.category);
    return docs.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [documents, filters.category]);

  const onRefresh = useCallback(() => loadDocuments(), [loadDocuments]);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + Spacing['4'] }]}>
        <Text style={styles.headerTitle}>PaperTrail</Text>
        <Text style={styles.headerSub}>
          {visibleDocuments.length} document{visibleDocuments.length !== 1 ? 's' : ''}
        </Text>
      </View>

      {/* Category filter chips */}
      <CategoryBar />

      {/* Document list */}
      {isLoading && visibleDocuments.length === 0 ? (
        <ActivityIndicator
          color={Colors.primary}
          style={{ flex: 1, alignSelf: 'center' }}
        />
      ) : (
        <FlatList
          data={visibleDocuments}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.list,
            visibleDocuments.length === 0 && styles.listEmpty,
          ]}
          renderItem={({ item }) => (
            <DocumentCard
              document={item}
              onPress={() => router.push(`/viewer/${item.id}`)}
            />
          )}
          ListEmptyComponent={
            <EmptyState
              icon="file-text"
              title="Your vault is empty"
              subtitle="Tap the + button to add your first document"
            />
          }
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={onRefresh}
              tintColor={Colors.primary}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      <FAB onPress={() => router.push('/capture')} />
    </View>
  );
}

const CATEGORIES = [
  { key: undefined,    label: 'All' },
  { key: 'receipt',   label: 'Receipts' },
  { key: 'contract',  label: 'Contracts' },
  { key: 'id',        label: 'IDs' },
  { key: 'warranty',  label: 'Warranties' },
  { key: 'medical',   label: 'Medical' },
  { key: 'tax',       label: 'Tax' },
] as const;

function CategoryBar() {
  const { filters, setFilters } = useDocumentStore();
  const active = filters.category;

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
      {CATEGORIES.map((c) => {
        const isActive = active === c.key;
        return (
          <Pressable
            key={c.label}
            style={[styles.chip, isActive && styles.chipActive]}
            onPress={() => setFilters({ ...filters, category: c.key })}
            hitSlop={6}
          >
            <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
              {c.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: Colors.bg },
  header:      { paddingHorizontal: Spacing['6'], paddingBottom: Spacing['3'] },
  headerTitle: {
    fontSize:   Typography.xxl,
    fontWeight: Typography.bold,
    color:      Colors.text,
    letterSpacing: -0.5,
  },
  headerSub: {
    fontSize:  Typography.sm,
    color:     Colors.textMuted,
    marginTop: Spacing['1'],
  },
  chips: {
    flexDirection:  'row',
    paddingHorizontal: Spacing['5'],
    paddingBottom:  Spacing['3'],
    gap:            Spacing['2'],
    flexWrap:       'nowrap',
  },
  chip: {
    paddingHorizontal: Spacing['3'],
    paddingVertical:   Spacing['1'] + 2,
    borderRadius:      99,
    backgroundColor:   Colors.surfaceOffset,
    borderWidth:       1,
    borderColor:       Colors.border,
    minHeight:         32,
    justifyContent:    'center',
  },
  chipActive: {
    backgroundColor: Colors.primaryHighlight,
    borderColor:     Colors.primary,
  },
  chipText: {
    fontSize:   Typography.sm,
    fontWeight: Typography.medium,
    color:      Colors.textMuted,
  },
  chipTextActive: { color: Colors.primary },
  list:        { paddingHorizontal: Spacing['4'], paddingBottom: 120 },
  listEmpty:   { flex: 1, justifyContent: 'center' },
});
