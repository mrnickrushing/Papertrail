import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useDocumentStore } from '@/store';
import { DocumentCard } from '@/components/DocumentCard';
import { BulkActionBar } from '@/components/BulkActionBar';
import { TagEditor } from '@/components/TagEditor';
import { FolderPickerModal } from '@/components/FolderPickerModal';
import { SkeletonList } from '@/components/SkeletonLoader';
import { FAB } from '@/components/FAB';
import { EmptyState } from '@/components/EmptyState';
import { Colors, Typography, Spacing } from '@/theme';
import { C, T, S, R } from '@/theme/tokens';

const CATEGORIES = [
  { key: undefined,    label: 'All' },
  { key: 'receipt',   label: 'Receipts' },
  { key: 'contract',  label: 'Contracts' },
  { key: 'id',        label: 'IDs' },
  { key: 'warranty',  label: 'Warranties' },
  { key: 'medical',   label: 'Medical' },
  { key: 'tax',       label: 'Tax' },
] as const;

export default function VaultScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const {
    documents,
    folders,
    isLoading,
    loadDocuments,
    filters,
    setFilters,
    bulkDelete,
    bulkMove,
    bulkSetTags,
  } = useDocumentStore();

  // ── Filter logic ──────────────────────────────────────────────────────────

  // Derive tags directly from documents so useMemo dep is stable
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    for (const doc of documents) for (const tag of doc.tags) tagSet.add(tag);
    return Array.from(tagSet).sort();
  }, [documents]);

  const visibleDocuments = useMemo(() => {
    let docs = [...documents];
    if (filters.category) docs = docs.filter((d) => d.category === filters.category);
    if (filters.isFavorite) docs = docs.filter((d) => d.isFavorite);
    if (filters.tags?.length) {
      docs = docs.filter((d) => filters.tags!.every((tag) => d.tags.includes(tag)));
    }
    // Sort by ISO date string descending — localeCompare is correct for ISO 8601
    return docs.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [documents, filters]);

  // ── Multi-select state ─────────────────────────────────────────────────────

  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showTagEditor, setShowTagEditor] = useState(false);
  const [showFolderPicker, setShowFolderPicker] = useState(false);

  const enterSelectionMode = useCallback((id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectionMode(true);
    setSelectedIds(new Set([id]));
  }, []);

  const toggleSelection = useCallback((id: string) => {
    Haptics.selectionAsync();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const exitSelectionMode = useCallback(() => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  }, []);

  const selectAll = useCallback(() => {
    Haptics.selectionAsync();
    setSelectedIds(new Set(visibleDocuments.map((d) => d.id)));
  }, [visibleDocuments]);

  // ── Bulk actions ──────────────────────────────────────────────────────────

  const handleBulkDelete = useCallback(() => {
    const count = selectedIds.size;
    Alert.alert(
      `Delete ${count} document${count !== 1 ? 's' : ''}?`,
      'This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await bulkDelete(Array.from(selectedIds));
            exitSelectionMode();
          },
        },
      ]
    );
  }, [selectedIds, bulkDelete, exitSelectionMode]);

  const handleBulkMove = useCallback((folderId: string | null) => {
    bulkMove(Array.from(selectedIds), folderId);
    setShowFolderPicker(false);
    exitSelectionMode();
  }, [selectedIds, bulkMove, exitSelectionMode]);

  const handleBulkTag = useCallback((tags: string[]) => {
    bulkSetTags(Array.from(selectedIds), tags);
    setShowTagEditor(false);
    exitSelectionMode();
  }, [selectedIds, bulkSetTags, exitSelectionMode]);

  // ── Filter actions ────────────────────────────────────────────────────────

  const toggleFavoriteFilter = useCallback(() => {
    setFilters({ ...filters, isFavorite: filters.isFavorite ? undefined : true });
  }, [filters, setFilters]);

  const toggleTagFilter = useCallback((tag: string) => {
    const current = filters.tags ?? [];
    const next = current.includes(tag) ? current.filter((t) => t !== tag) : [...current, tag];
    setFilters({ ...filters, tags: next.length ? next : undefined });
  }, [filters, setFilters]);

  const onRefresh = useCallback(() => loadDocuments(), [loadDocuments]);

  // ── Render ────────────────────────────────────────────────────────────────

  // Shared initial tags for bulk tag editing (intersection of selected docs' tags)
  const bulkInitialTags = useMemo(() => {
    if (selectedIds.size === 0) return [];
    const sets = Array.from(selectedIds).map(
      (id) => new Set(documents.find((d) => d.id === id)?.tags ?? [])
    );
    const [first, ...rest] = sets;
    return Array.from(first).filter((tag) => rest.every((s) => s.has(tag)));
  }, [selectedIds, documents]);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + Spacing['4'] }]}>
        {selectionMode ? (
          <>
            <Text style={styles.headerTitle}>
              {selectedIds.size} selected
            </Text>
            <Pressable onPress={selectAll} hitSlop={8}>
              <Text style={styles.selectAllBtn}>Select All</Text>
            </Pressable>
          </>
        ) : (
          <>
            <Text style={styles.headerTitle}>PaperTrail</Text>
            <Text style={styles.headerSub}>
              {visibleDocuments.length} document{visibleDocuments.length !== 1 ? 's' : ''}
            </Text>
          </>
        )}
      </View>

      {/* Filter bar */}
      <FilterBar
        filters={filters}
        allTags={allTags}
        onCategoryChange={(cat) => setFilters({ ...filters, category: cat })}
        onToggleFavorite={toggleFavoriteFilter}
        onToggleTag={toggleTagFilter}
      />

      {/* Document list */}
      {isLoading && visibleDocuments.length === 0 ? (
        <SkeletonList count={5} />
      ) : (
        <FlatList
          data={visibleDocuments}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.list,
            visibleDocuments.length === 0 && styles.listEmpty,
            selectionMode && styles.listBulk,
          ]}
          renderItem={({ item }) => (
            <DocumentCard
              document={item}
              selectionMode={selectionMode}
              isSelected={selectedIds.has(item.id)}
              onPress={() => {
                if (selectionMode) {
                  toggleSelection(item.id);
                } else {
                  router.push(`/viewer/${item.id}`);
                }
              }}
              onLongPress={() => {
                if (selectionMode) {
                  toggleSelection(item.id);
                } else {
                  enterSelectionMode(item.id);
                }
              }}
            />
          )}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
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

      {/* FAB — hidden in selection mode */}
      {!selectionMode && <FAB onPress={() => router.push('/capture')} />}

      {/* Bulk action bar */}
      {selectionMode && (
        <BulkActionBar
          count={selectedIds.size}
          onMove={() => setShowFolderPicker(true)}
          onTag={() => setShowTagEditor(true)}
          onDelete={handleBulkDelete}
          onCancel={exitSelectionMode}
        />
      )}

      {/* Tag editor modal */}
      <TagEditor
        visible={showTagEditor}
        initialTags={bulkInitialTags}
        allTags={allTags}
        title={`Tag ${selectedIds.size} document${selectedIds.size !== 1 ? 's' : ''}`}
        onConfirm={handleBulkTag}
        onCancel={() => setShowTagEditor(false)}
      />

      {/* Folder picker modal */}
      <FolderPickerModal
        visible={showFolderPicker}
        folders={folders}
        onSelect={handleBulkMove}
        onCancel={() => setShowFolderPicker(false)}
      />
    </View>
  );
}

// ── Filter bar ────────────────────────────────────────────────────────────────

interface FilterBarProps {
  filters: ReturnType<typeof useDocumentStore>['filters'];
  allTags: string[];
  onCategoryChange: (cat: (typeof CATEGORIES)[number]['key']) => void;
  onToggleFavorite: () => void;
  onToggleTag: (tag: string) => void;
}

function FilterBar({ filters, allTags, onCategoryChange, onToggleFavorite, onToggleTag }: FilterBarProps) {
  const activeCategory = filters.category;
  const activeTags = filters.tags ?? [];
  const favoriteActive = !!filters.isFavorite;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.chips}
    >
      {/* Category chips */}
      {CATEGORIES.map((c) => {
        const isActive = activeCategory === c.key;
        return (
          <Pressable
            key={c.label}
            style={[styles.chip, isActive && styles.chipActive]}
            onPress={() => onCategoryChange(c.key)}
            hitSlop={6}
          >
            <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
              {isActive && c.key !== undefined ? '✓ ' : ''}{c.label}
            </Text>
          </Pressable>
        );
      })}

      {/* Separator */}
      <View style={styles.chipDivider} />

      {/* Favorites chip */}
      <Pressable
        style={[styles.chip, favoriteActive && styles.chipActive]}
        onPress={onToggleFavorite}
        hitSlop={6}
      >
        <Text style={[styles.chipText, favoriteActive && styles.chipTextActive]}>
          {favoriteActive ? '★ Favorites ×' : '☆ Favorites'}
        </Text>
      </Pressable>

      {/* Tag chips */}
      {allTags.map((tag) => {
        const isActive = activeTags.includes(tag);
        return (
          <Pressable
            key={tag}
            style={[styles.chip, isActive && styles.chipTagActive]}
            onPress={() => onToggleTag(tag)}
            hitSlop={6}
          >
            <Text style={[styles.chipText, isActive && styles.chipTagTextActive]}>
              {isActive ? `#${tag} ×` : `#${tag}`}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: Colors.bg },
  header: {
    paddingHorizontal: Spacing['6'],
    paddingBottom: Spacing['3'],
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize:   Typography.xxl,
    fontWeight: Typography.bold,
    color:      Colors.text,
    letterSpacing: -0.5,
  },
  headerSub: {
    fontSize:  Typography.sm,
    color:     Colors.textMuted,
  },
  selectAllBtn: {
    fontSize: T.base,
    color: C.amber,
    fontWeight: '600',
  },
  chips: {
    flexDirection:  'row',
    paddingHorizontal: Spacing['5'],
    paddingBottom:  Spacing['3'],
    gap:            Spacing['2'],
    flexWrap:       'nowrap',
    alignItems:     'center',
  },
  chipDivider: {
    width: 1,
    height: 20,
    backgroundColor: Colors.border,
    marginHorizontal: Spacing['1'],
  },
  chip: {
    paddingHorizontal: Spacing['3'],
    paddingVertical:   Spacing['2'],
    borderRadius:      99,
    backgroundColor:   Colors.surfaceOffset,
    borderWidth:       1,
    borderColor:       Colors.border,
    minHeight:         36,
    justifyContent:    'center',
  },
  chipActive: {
    backgroundColor: Colors.primaryHighlight,
    borderColor:     Colors.primary,
    shadowColor:     Colors.primary,
    shadowOffset:    { width: 0, height: 2 },
    shadowOpacity:   0.25,
    shadowRadius:    6,
    elevation:       4,
  },
  chipTagActive: {
    backgroundColor: C.amberDim,
    borderColor:     C.amber,
    shadowColor:     C.amber,
    shadowOffset:    { width: 0, height: 2 },
    shadowOpacity:   0.2,
    shadowRadius:    6,
    elevation:       4,
  },
  chipText: {
    fontSize:   Typography.sm,
    fontWeight: Typography.medium,
    color:      Colors.textMuted,
  },
  chipTextActive: { color: Colors.primary },
  chipTagTextActive: { color: C.amber },
  list:      { paddingHorizontal: Spacing['4'], paddingBottom: 160 },
  listEmpty: { flex: 1, justifyContent: 'center' },
  listBulk:  { paddingBottom: 200 },
  sep: {
    height: Spacing['2'],
  },
});
