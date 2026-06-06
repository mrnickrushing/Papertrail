import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Pressable,
  RefreshControl,
  ScrollView,
  Alert,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppStore, useDocumentStore } from '@/store';
import { useProStore } from '@/store/proStore';
import { apiRequest, isBackendConfigured } from '@/services/api';
import { DocumentCard } from '@/components/DocumentCard';
import { BulkActionBar } from '@/components/BulkActionBar';
import { TagEditor } from '@/components/TagEditor';
import { FolderPickerModal } from '@/components/FolderPickerModal';
import { PaywallModal } from '@/components/PaywallModal';
import { SkeletonList } from '@/components/SkeletonLoader';
import { FAB } from '@/components/FAB';
import { EmptyState } from '@/components/EmptyState';
import { SwipeableCard } from '@/components/SwipeableCard';
import { Colors, Typography, Spacing } from '@/theme';
import { C, T, S, R } from '@/theme/tokens';
import type { SearchFilters, DocumentCategory } from '@/types/document';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const CATEGORIES = [
  { key: undefined,    label: 'All',        color: undefined },
  { key: 'receipt',   label: 'Receipts',   color: C.category.receipt },
  { key: 'contract',  label: 'Contracts',  color: C.category.contract },
  { key: 'id',        label: 'IDs',        color: C.category.id },
  { key: 'warranty',  label: 'Warranties', color: C.category.warranty },
  { key: 'medical',   label: 'Medical',    color: C.category.medical },
  { key: 'tax',       label: 'Tax',        color: C.category.tax },
] as const;

const SORT_LABELS: Record<ReturnType<typeof useAppStore.getState>['sortBy'], string> = {
  updatedAt: 'Modified',
  createdAt: 'Added',
  title: 'Name',
  category: 'Type',
};

const SORT_ICONS: Record<ReturnType<typeof useAppStore.getState>['sortBy'], React.ComponentProps<typeof Feather>['name']> = {
  updatedAt: 'clock',
  createdAt: 'calendar',
  title: 'type',
  category: 'tag',
};

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
    deleteDocument,
    toggleFavorite,
    updateDocument,
    updateDocumentTags,
    moveDocumentToFolder,
    addFolder,
  } = useDocumentStore();

  const sortBy = useAppStore(s => s.sortBy);
  const sortDir = useAppStore(s => s.sortDir);
  const viewMode = useAppStore(s => s.viewMode);
  const setSortBy = useAppStore(s => s.setSortBy);
  const setSortDir = useAppStore(s => s.setSortDir);
  const setViewMode = useAppStore(s => s.setViewMode);
  const hasOnboarded = useAppStore(s => s.hasOnboarded);
  const isAccountAuthenticated = useAppStore(s => s.isAccountAuthenticated);

  const isPro = useProStore(s => s.isPro);
  const checkPro = useProStore(s => s.checkPro);

  // Backup nudge: prompt once after user has 3+ documents
  const docCount = documents.length;
  React.useEffect(() => {
    if (docCount < 3) return;
    const NUDGE_KEY = 'filetrail-backup-nudge-shown';
    AsyncStorage.getItem(NUDGE_KEY).then((shown) => {
      if (shown) return;
      AsyncStorage.setItem(NUDGE_KEY, '1');
      Alert.alert(
        'Back Up Your Vault',
        "You have documents saved. Back them up to Files or iCloud so they're safe if you change devices.",
        [
          { text: 'Later', style: 'cancel' },
          {
            text: 'Back Up Now',
            onPress: () => router.push('/(tabs)/settings'),
          },
        ]
      );
    });
  }, [docCount, router]);

  // ── Filter logic ──────────────────────────────────────────────────────────

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
    docs.sort((a, b) => {
      const cmp = sortBy === 'updatedAt' || sortBy === 'createdAt'
        ? new Date(a[sortBy]).getTime() - new Date(b[sortBy]).getTime()
        : String(a[sortBy] ?? '').localeCompare(String(b[sortBy] ?? ''), undefined, {
            sensitivity: 'base',
          });
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return docs;
  }, [documents, filters, sortBy, sortDir]);

  // Docs without a folder
  const unfiledCount = useMemo(
    () => documents.filter(d => !d.folderId).length,
    [documents]
  );

  // ── Multi-select state ─────────────────────────────────────────────────────

  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showTagEditor, setShowTagEditor] = useState(false);
  const [showFolderPicker, setShowFolderPicker] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);

  const enterSelectionMode = useCallback((id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
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
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            await bulkDelete(Array.from(selectedIds));
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            exitSelectionMode();
          },
        },
      ]
    );
  }, [selectedIds, bulkDelete, exitSelectionMode]);

  const handleBulkMove = useCallback((folderId: string | null) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    bulkMove(Array.from(selectedIds), folderId);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowFolderPicker(false);
    exitSelectionMode();
  }, [selectedIds, bulkMove, exitSelectionMode]);

  const handleBulkTag = useCallback((tags: string[]) => {
    bulkSetTags(Array.from(selectedIds), tags);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowTagEditor(false);
    exitSelectionMode();
  }, [selectedIds, bulkSetTags, exitSelectionMode]);

  const handleBulkAiOrganize = useCallback(async () => {
    if (selectedIds.size === 0) return;
    if (!isPro) {
      setShowPaywall(true);
      return;
    }
    if (!isBackendConfigured()) {
      Alert.alert('AI Unavailable', 'Configure EXPO_PUBLIC_API_URL to use AI Organize.');
      return;
    }
    const count = selectedIds.size;
    Alert.alert(
      `AI Organize ${count} Document${count !== 1 ? 's' : ''}?`,
      'AI will rename, categorize, tag, and file each document. This may take a moment.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Organize',
          onPress: async () => {
            const ids = Array.from(selectedIds);
            exitSelectionMode();
            let succeeded = 0;
            for (const docId of ids) {
              const doc = documents.find(d => d.id === docId);
              if (!doc) continue;
              try {
                const suggestion = await apiRequest<{
                  suggestedTitle: string;
                  category: DocumentCategory;
                  tags: string[];
                  notes: string;
                  suggestedFolderName: string;
                }>('/v1/ai/suggest-document', {
                  method: 'POST',
                  body: {
                    title: doc.title,
                    filename: doc.title,
                    ocrText: doc.ocrText,
                    mimeType: doc.mimeType,
                  },
                  timeoutMs: 30000,
                });
                const nextTitle = suggestion.suggestedTitle?.trim() || doc.title;
                const nextCategory = (suggestion.category || doc.category) as DocumentCategory;
                const nextTags = Array.isArray(suggestion.tags)
                  ? Array.from(new Set(suggestion.tags.map((t: string) => t.trim()).filter(Boolean)))
                  : doc.tags;
                updateDocument(docId, { title: nextTitle, category: nextCategory });
                updateDocumentTags(docId, nextTags);
                if (suggestion.suggestedFolderName) {
                  const existing = folders.find(
                    f => f.name.toLowerCase() === suggestion.suggestedFolderName.toLowerCase()
                  );
                  const folder = existing ?? addFolder(suggestion.suggestedFolderName);
                  moveDocumentToFolder(docId, folder.id);
                }
                succeeded++;
              } catch {
                // continue with next document
              }
            }
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert(
              'Done',
              `AI organized ${succeeded} of ${ids.length} document${ids.length !== 1 ? 's' : ''}.`
            );
          },
        },
      ]
    );
  }, [
    selectedIds, isPro, documents, folders,
    updateDocument, updateDocumentTags, moveDocumentToFolder, addFolder,
    exitSelectionMode,
  ]);

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

  const bulkInitialTags = useMemo(() => {
    if (selectedIds.size === 0) return [];
    const sets = Array.from(selectedIds).map(
      (id) => new Set(documents.find((d) => d.id === id)?.tags ?? [])
    );
    const [first, ...rest] = sets;
    return Array.from(first).filter((tag) => rest.every((s) => s.has(tag)));
  }, [selectedIds, documents]);

  if (!hasOnboarded) {
    return <Redirect href="/onboarding" />;
  }

  if (!isAccountAuthenticated) {
    return <Redirect href="/account" />;
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + Spacing['4'] }]}>
        {selectionMode ? (
          <>
            <Text style={styles.headerTitle}>{selectedIds.size} selected</Text>
            <Pressable onPress={selectAll} hitSlop={8}>
              <Text style={styles.selectAllBtn}>Select All</Text>
            </Pressable>
          </>
        ) : (
          <>
            <View>
              <Text style={styles.headerTitle}>FileTrail</Text>
              <Text style={styles.headerSub}>
                {visibleDocuments.length} document{visibleDocuments.length !== 1 ? 's' : ''}
              </Text>
            </View>
            <View style={styles.headerControls}>
              <Pressable
                style={styles.headerControlBtn}
                hitSlop={8}
                onPress={() => {
                  Haptics.selectionAsync();
                  const order: typeof sortBy[] = ['updatedAt', 'createdAt', 'title', 'category'];
                  const next = order[(order.indexOf(sortBy) + 1) % order.length];
                  setSortBy(next);
                }}
                accessibilityLabel={`Sort by ${sortBy}`}
                accessibilityRole="button"
              >
                <Feather name={SORT_ICONS[sortBy]} size={14} color={C.ash} />
                <Text style={styles.headerControlText}>{SORT_LABELS[sortBy]}</Text>
              </Pressable>
              <Pressable
                style={styles.headerControlBtn}
                hitSlop={8}
                onPress={() => {
                  Haptics.selectionAsync();
                  setSortDir(sortDir === 'desc' ? 'asc' : 'desc');
                }}
                accessibilityLabel={sortDir === 'desc' ? 'Sort descending' : 'Sort ascending'}
                accessibilityRole="button"
              >
                <Feather name={sortDir === 'desc' ? 'arrow-down' : 'arrow-up'} size={15} color={C.ash} />
              </Pressable>
              <Pressable
                style={styles.headerControlBtn}
                hitSlop={8}
                onPress={() => {
                  Haptics.selectionAsync();
                  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                  setViewMode(viewMode === 'card' ? 'list' : 'card');
                }}
                accessibilityLabel={viewMode === 'card' ? 'Switch to list view' : 'Switch to card view'}
                accessibilityRole="button"
              >
                <Feather name={viewMode === 'card' ? 'list' : 'grid'} size={15} color={C.ash} />
              </Pressable>
            </View>
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

      {/* Unfiled nudge — shown when docs exist without a folder */}
      {!selectionMode && !filters.category && !filters.isFavorite && unfiledCount > 0 && (
        <Pressable
          style={styles.unfiledBanner}
          onPress={() => router.push('/(tabs)/folders')}
          hitSlop={4}
          accessibilityRole="button"
          accessibilityLabel={`${unfiledCount} unfiled documents — tap to file them`}
        >
          <Feather name="inbox" size={14} color={C.amber} />
          <Text style={styles.unfiledBannerText}>
            {unfiledCount} document{unfiledCount !== 1 ? 's' : ''} unfiled
          </Text>
          <Text style={styles.unfiledBannerAction}>File now →</Text>
        </Pressable>
      )}

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
            <SwipeableCard
              isFavorite={item.isFavorite}
              disabled={selectionMode}
              onFavorite={() => {
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                toggleFavorite(item.id);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
              onDelete={() => {
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                deleteDocument(item.id);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              }}
            >
              <DocumentCard
                document={item}
                compact={viewMode === 'list'}
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
            </SwipeableCard>
          )}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
          ListEmptyComponent={
            <EmptyState
              icon="file-text"
              title="Your vault is empty"
              subtitle="Capture receipts, contracts, IDs, and more — everything stays on your device."
              showFABHint
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
          onAiOrganize={handleBulkAiOrganize}
          onDelete={handleBulkDelete}
          onCancel={exitSelectionMode}
        />
      )}

      {/* Tag editor modal */}
      {showTagEditor && (
        <TagEditor
          visible={showTagEditor}
          initialTags={bulkInitialTags}
          allTags={allTags}
          title={`Tag ${selectedIds.size} document${selectedIds.size !== 1 ? 's' : ''}`}
          onConfirm={handleBulkTag}
          onCancel={() => setShowTagEditor(false)}
        />
      )}

      {/* Folder picker modal */}
      {showFolderPicker && (
        <FolderPickerModal
          visible={showFolderPicker}
          folders={folders}
          onSelect={handleBulkMove}
          onCancel={() => setShowFolderPicker(false)}
        />
      )}

      {/* Paywall */}
      {showPaywall && (
        <PaywallModal
          visible={showPaywall}
          onClose={() => setShowPaywall(false)}
          onSuccess={() => {
            setShowPaywall(false);
            void checkPro();
          }}
        />
      )}
    </View>
  );
}

// ── Filter bar ────────────────────────────────────────────────────────────────

interface FilterBarProps {
  filters: SearchFilters;
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
      {CATEGORIES.map((c) => {
        const isActive = activeCategory === c.key;
        const chipColor = c.color ?? C.amber;
        return (
          <Pressable
            key={c.label}
            style={[
              styles.chip,
              isActive && {
                backgroundColor: chipColor + '22',
                borderColor: chipColor + '88',
                shadowColor: chipColor,
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.28,
                shadowRadius: 6,
                elevation: 4,
              },
            ]}
            onPress={() => onCategoryChange(c.key)}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={`${c.label} filter${isActive ? ', active' : ''}`}
          >
            {c.color && isActive && (
              <View style={[styles.chipDot, { backgroundColor: c.color }]} />
            )}
            <Text style={[styles.chipText, isActive && { color: chipColor, fontWeight: '700' }]}>
              {c.label}
            </Text>
          </Pressable>
        );
      })}

      <View style={styles.chipDivider} />

      <Pressable
        style={[
          styles.chip,
          favoriteActive && {
            backgroundColor: C.amberDim,
            borderColor: C.amber + '88',
            shadowColor: C.amber,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 6,
            elevation: 4,
          },
        ]}
        onPress={onToggleFavorite}
        hitSlop={6}
        accessibilityRole="button"
        accessibilityState={{ selected: favoriteActive }}
        accessibilityLabel={`Favorites filter${favoriteActive ? ', active' : ''}`}
      >
        <Feather name="star" size={12} color={favoriteActive ? C.amber : Colors.textMuted} />
        <Text style={[styles.chipText, favoriteActive && { color: C.amber, fontWeight: '700' }]}>
          {favoriteActive ? 'Saved ×' : 'Saved'}
        </Text>
      </Pressable>

      {allTags.map((tag) => {
        const isActive = activeTags.includes(tag);
        return (
          <Pressable
            key={tag}
            style={[styles.chip, isActive && styles.chipTagActive]}
            onPress={() => onToggleTag(tag)}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={`Tag ${tag}${isActive ? ', active' : ''}`}
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
  headerControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S[1],
  },
  headerControlBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: S[2],
    paddingVertical: S[1],
    borderRadius: R.md,
    backgroundColor: C.ink2,
    borderWidth: 1,
    borderColor: C.ink3,
    minHeight: 32,
    justifyContent: 'center',
  },
  headerControlText: {
    fontSize: T.xs,
    color: C.ash,
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
    flexDirection:     'row',
    alignItems:        'center',
    gap:               5,
    justifyContent:    'center',
  },
  chipDot: {
    width:        6,
    height:       6,
    borderRadius: 3,
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
  chipTagTextActive: { color: C.amber },
  unfiledBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S[2],
    marginHorizontal: Spacing['4'],
    marginBottom: Spacing['2'],
    backgroundColor: C.amberDim,
    borderRadius: R.lg,
    paddingHorizontal: S[3],
    paddingVertical: S[2],
    borderWidth: 1,
    borderColor: C.amber + '33',
  },
  unfiledBannerText: {
    flex: 1,
    fontSize: T.sm,
    color: C.amber,
  },
  unfiledBannerAction: {
    fontSize: T.sm,
    color: C.amber,
    fontWeight: '700',
  },
  list:      { paddingHorizontal: Spacing['4'], paddingBottom: 160 },
  listEmpty: { flex: 1, justifyContent: 'center' },
  listBulk:  { paddingBottom: 200 },
  sep: {
    height: Spacing['2'],
  },
});
