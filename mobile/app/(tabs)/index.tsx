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
import * as FileSystem from 'expo-file-system';
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppStore, useDocumentStore, useProStore } from '@/store';
import { apiRequest, isBackendConfigured, getAnthropicApiKey } from '@/services/api';
import { getFileSize } from '@/services/fileStorage';
import { createSampleDocument } from '@/services/sampleDocument';
import { DocumentCard } from '@/components/DocumentCard';
import { BulkActionBar } from '@/components/BulkActionBar';
import { TagEditor } from '@/components/TagEditor';
import { FolderPickerModal } from '@/components/FolderPickerModal';
import { PaywallModal } from '@/components/PaywallModal';
import { SkeletonList } from '@/components/SkeletonLoader';
import { FAB } from '@/components/FAB';
import { EmptyState } from '@/components/EmptyState';
import { SwipeableCard } from '@/components/SwipeableCard';
import { ScreenHeader } from '@/components/ScreenHeader';
import { HealthRing } from '@/components/HealthRing';
import { Colors, Typography, Spacing } from '@/theme';
import { C, T, S, R } from '@/theme/tokens';
import type { SearchFilters, DocumentCategory, Document } from '@/types/document';
import type { SyncPhase } from '@/store/documentStore';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const CATEGORIES = [
  { key: undefined,    label: 'All',        color: undefined },
  { key: 'receipt',   label: 'Receipts',   color: C.category.receipt },
  { key: 'bill',      label: 'Bills',      color: C.category.bill },
  { key: 'contract',  label: 'Contracts',  color: C.category.contract },
  { key: 'id',        label: 'IDs',        color: C.category.id },
  { key: 'warranty',  label: 'Warranties', color: C.category.warranty },
  { key: 'medical',   label: 'Medical',    color: C.category.medical },
  { key: 'tax',       label: 'Tax',        color: C.category.tax },
  { key: 'work',       label: 'Work',       color: C.category.work },
  { key: 'retirement', label: 'Retirement', color: C.category.retirement },
  { key: 'insurance',  label: 'Insurance',  color: C.category.insurance },
  { key: 'legal',      label: 'Legal',      color: C.category.legal },
  { key: 'vehicle',    label: 'Vehicle',    color: C.category.vehicle },
  { key: 'property',   label: 'Property',   color: C.category.property },
  { key: 'education',  label: 'Education',  color: C.category.education },
  { key: 'travel',     label: 'Travel',     color: C.category.travel },
  { key: 'pet',        label: 'Pets',       color: C.category.pet },
] as const;

const COMMON_CATEGORY_KEYS = ['receipt', 'bill', 'contract', 'id', 'medical', 'tax'] as const;

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

function formatSyncAge(value: string | null): string {
  if (!value) return 'Not synced yet';
  const deltaMs = Date.now() - new Date(value).getTime();
  if (!Number.isFinite(deltaMs) || deltaMs < 0) return 'Just now';
  const minutes = Math.floor(deltaMs / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  return new Date(value).toLocaleDateString();
}

function syncBadgeMeta(phase: SyncPhase, pendingCount: number): {
  label: string;
  detail: string;
  icon: React.ComponentProps<typeof Feather>['name'];
  tone: 'success' | 'warning' | 'danger' | 'neutral';
} {
  if (phase === 'syncing') {
    return {
      label: 'Syncing',
      detail: pendingCount > 0 ? `${pendingCount} pending` : 'Updating cloud copy',
      icon: 'refresh-cw',
      tone: 'warning',
    };
  }
  if (phase === 'error') {
    return {
      label: 'Sync failed',
      detail: pendingCount > 0 ? `${pendingCount} pending` : 'Tap to retry',
      icon: 'alert-circle',
      tone: 'danger',
    };
  }
  if (pendingCount > 0) {
    return {
      label: 'Needs sync',
      detail: `${pendingCount} pending`,
      icon: 'cloud-off',
      tone: 'warning',
    };
  }
  if (phase === 'success') {
    return {
      label: 'Synced',
      detail: 'Cloud copy current',
      icon: 'cloud',
      tone: 'success',
    };
  }
  return {
    label: 'Local only',
    detail: 'Pull to sync',
    icon: 'hard-drive',
    tone: 'neutral',
  };
}

export default function VaultScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Fine-grained selectors avoid re-rendering the whole Vault on unrelated
  // store changes (e.g. another document's OCR status flip).
  const documents = useDocumentStore(s => s.documents);
  const addDocument = useDocumentStore(s => s.addDocument);
  const folders = useDocumentStore(s => s.folders);
  const isLoading = useDocumentStore(s => s.isLoading);
  const filters = useDocumentStore(s => s.filters);
  const setFilters = useDocumentStore(s => s.setFilters);
  const bulkDelete = useDocumentStore(s => s.bulkDelete);
  const bulkMove = useDocumentStore(s => s.bulkMove);
  const bulkSetTags = useDocumentStore(s => s.bulkSetTags);
  const deleteDocument = useDocumentStore(s => s.deleteDocument);
  const deletedDocumentIds = useDocumentStore(s => s.deletedDocumentIds);
  const deletedFolderIds = useDocumentStore(s => s.deletedFolderIds);
  const toggleFavorite = useDocumentStore(s => s.toggleFavorite);
  const updateDocument = useDocumentStore(s => s.updateDocument);
  const updateDocumentTags = useDocumentStore(s => s.updateDocumentTags);
  const moveDocumentToFolder = useDocumentStore(s => s.moveDocumentToFolder);
  const findOrCreateFolder = useDocumentStore(s => s.findOrCreateFolder);
  const syncWithBackend = useDocumentStore(s => s.syncWithBackend);
  const syncState = useDocumentStore(s => s.syncState);

  const sortBy = useAppStore(s => s.sortBy);
  const sortDir = useAppStore(s => s.sortDir);
  const viewMode = useAppStore(s => s.viewMode);
  const setSortBy = useAppStore(s => s.setSortBy);
  const setSortDir = useAppStore(s => s.setSortDir);
  const setViewMode = useAppStore(s => s.setViewMode);
  const hasOnboarded = useAppStore(s => s.hasOnboarded);
  const isAccountAuthenticated = useAppStore(s => s.isAccountAuthenticated);
  const recordAiUsageCost = useAppStore(s => s.recordAiUsageCost);

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

  const pendingSyncCount = useMemo(() => {
    const lastSuccessful = syncState.lastSuccessfulSyncAt;
    const pendingDocs = lastSuccessful
      ? documents.filter((doc) => doc.updatedAt > lastSuccessful).length
      : documents.length;
    const pendingFolders = lastSuccessful
      ? folders.filter((folder) => folder.updatedAt > lastSuccessful).length
      : folders.length;
    return pendingDocs + pendingFolders + deletedDocumentIds.length + deletedFolderIds.length;
  }, [documents, folders, deletedDocumentIds.length, deletedFolderIds.length, syncState.lastSuccessfulSyncAt]);

  const syncMeta = useMemo(
    () => syncBadgeMeta(syncState.phase, pendingSyncCount),
    [syncState.phase, pendingSyncCount],
  );

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
  const [isAiOrganizing, setIsAiOrganizing] = useState(false);
  const [aiOrganizeProgress, setAiOrganizeProgress] = useState<{ done: number; total: number } | null>(null);
  const [showAllCategoryFilters, setShowAllCategoryFilters] = useState(false);

  React.useEffect(() => {
    if (filters.category && !COMMON_CATEGORY_KEYS.includes(filters.category as typeof COMMON_CATEGORY_KEYS[number])) {
      setShowAllCategoryFilters(true);
    }
  }, [filters.category]);

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
            setIsAiOrganizing(true);
            setAiOrganizeProgress({ done: 0, total: ids.length });

            const processSingle = async (docId: string): Promise<boolean> => {
              const doc = documents.find(d => d.id === docId);
              if (!doc) return false;
              try {
                const FILE_SIZE_LIMIT = 4 * 1024 * 1024;
                // Some pickers report fileSizeBytes as 0/undefined — fall back
                // to the actual on-disk size so large files can't slip past
                // the AI size guard.
                const actualSize = doc.fileSizeBytes || (doc.fileUri ? await getFileSize(doc.fileUri) : 0);
                const canReadFile = !!doc.fileUri && actualSize <= FILE_SIZE_LIMIT;
                let pdfBase64: string | undefined;
                let imageBase64: string | undefined;
                if (!doc.ocrText && canReadFile) {
                  try {
                    if (doc.mimeType === 'application/pdf') {
                      pdfBase64 = await FileSystem.readAsStringAsync(doc.fileUri!, {
                        encoding: FileSystem.EncodingType.Base64,
                      });
                    } else if (doc.mimeType.startsWith('image/')) {
                      imageBase64 = await FileSystem.readAsStringAsync(doc.fileUri!, {
                        encoding: FileSystem.EncodingType.Base64,
                      });
                    }
                  } catch {
                    // proceed without it
                  }
                }

                const suggestion = await apiRequest<{
                  suggestedTitle: string;
                  category: DocumentCategory;
                  tags: string[];
                  notes: string;
                  suggestedFolderName: string;
                  suggestedSubfolderName?: string;
                  source?: string;
                  date?: string;
                  vendor?: string;
                  amounts?: number[];
                  usage?: { inputTokens: number; outputTokens: number; costUsd: number };
                }>('/v1/ai/suggest-document', {
                  method: 'POST',
                  body: {
                    title: doc.title,
                    filename: doc.title,
                    ocrText: doc.ocrText,
                    mimeType: doc.mimeType,
                    pdfBase64,
                    imageBase64,
                    imageMimeType: imageBase64 ? doc.mimeType : undefined,
                    anthropicApiKey: getAnthropicApiKey() ?? undefined,
                    existingFolders: folders.filter(f => !f.parentId).map(f => f.name),
                  },
                  timeoutMs: 30000,
                });
                const nextTitle = suggestion.suggestedTitle?.trim() || doc.title;
                const nextCategory = (suggestion.category || doc.category) as DocumentCategory;
                const nextTags = Array.isArray(suggestion.tags)
                  ? Array.from(new Set(suggestion.tags.map((t: string) => t.trim()).filter(Boolean)))
                  : doc.tags;
                const nextNotes = typeof suggestion.notes === 'string' && suggestion.notes.trim()
                  ? suggestion.notes.trim()
                  : undefined;
                const mergedTags = Array.from(new Set([...doc.tags, ...nextTags]));
                updateDocumentTags(docId, mergedTags);
                const aiPatch: Partial<Document> = {
                  title: nextTitle,
                  category: nextCategory,
                  aiSource: suggestion.source === 'claude' ? 'claude' : 'heuristic',
                  aiOrganizedAt: new Date().toISOString(),
                  ...(nextNotes ? { notes: nextNotes } : {}),
                };
                if (typeof suggestion.date === 'string' && suggestion.date) aiPatch.inferredDate = suggestion.date;
                if (typeof suggestion.vendor === 'string' && suggestion.vendor) aiPatch.vendor = suggestion.vendor;
                if (Array.isArray(suggestion.amounts) && suggestion.amounts.length > 0) aiPatch.amounts = suggestion.amounts;
                if (suggestion.usage) recordAiUsageCost(suggestion.usage.costUsd);
                updateDocument(docId, aiPatch);
                if (suggestion.suggestedFolderName) {
                  const parentFolder = findOrCreateFolder(suggestion.suggestedFolderName, undefined, null);
                  if (suggestion.suggestedSubfolderName) {
                    const subFolder = findOrCreateFolder(
                      suggestion.suggestedSubfolderName,
                      parentFolder.color,
                      parentFolder.id,
                    );
                    moveDocumentToFolder(docId, subFolder.id);
                  } else {
                    moveDocumentToFolder(docId, parentFolder.id);
                  }
                }
                return true;
              } catch {
                return false;
              }
            };

            // Process in batches of 3
            let succeeded = 0;
            let processed = 0;
            for (let i = 0; i < ids.length; i += 3) {
              const batch = ids.slice(i, i + 3);
              const results = await Promise.allSettled(batch.map(processSingle));
              succeeded += results.filter(r => r.status === 'fulfilled' && r.value).length;
              processed += batch.length;
              setAiOrganizeProgress({ done: processed, total: ids.length });
            }

            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setIsAiOrganizing(false);
            setAiOrganizeProgress(null);
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
    updateDocument, updateDocumentTags, moveDocumentToFolder, findOrCreateFolder,
    exitSelectionMode, recordAiUsageCost,
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

  const [isAddingSample, setIsAddingSample] = useState(false);
  const handleTrySampleDocument = useCallback(async () => {
    if (isAddingSample) return;
    setIsAddingSample(true);
    try {
      const sample = await createSampleDocument();
      await addDocument(sample);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Alert.alert('Couldn’t Add Sample', 'Something went wrong creating the sample document. Try again in a moment.');
    } finally {
      setIsAddingSample(false);
    }
  }, [isAddingSample, addDocument]);

  const [isRefreshing, setIsRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await syncWithBackend();
    } catch {
      // syncWithBackend already swallows network errors; nothing else to do.
    } finally {
      setIsRefreshing(false);
    }
  }, [syncWithBackend]);

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
      <ScreenHeader
        style={{ paddingTop: insets.top + Spacing['4'] }}
        title={selectionMode ? `${selectedIds.size} selected` : 'FileTrail'}
        subtitle={selectionMode ? undefined : `${visibleDocuments.length} document${visibleDocuments.length !== 1 ? 's' : ''}`}
        subtitleAccessory={
          selectionMode || documents.length === 0 ? undefined : <HealthRing documents={documents} size={18} strokeWidth={2.25} compact />
        }
        right={
          selectionMode ? (
            <Pressable onPress={selectAll} hitSlop={8}>
              <Text style={styles.selectAllBtn}>Select All</Text>
            </Pressable>
          ) : (
            <View style={styles.headerControls}>
              <Pressable
                style={[styles.headerControlBtn, styles.headerControlFoldersBtn]}
                hitSlop={8}
                onPress={() => router.push('/(tabs)/folders')}
                accessibilityLabel="Open folders"
                accessibilityRole="button"
              >
                <Feather name="folder" size={15} color={C.amber} />
                <Text style={[styles.headerControlText, styles.headerFolderText]}>Folders</Text>
              </Pressable>
              <Pressable
                style={[styles.headerControlBtn, styles.headerControlDivider]}
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
                style={[styles.headerControlBtn, styles.headerControlDivider]}
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
                style={[styles.headerControlBtn, styles.headerControlDivider]}
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
          )
        }
      />

      {/* Filter bar */}
      {!selectionMode && (
        <Pressable
          style={[
            styles.syncBadge,
            syncMeta.tone === 'success' && styles.syncBadgeSuccess,
            syncMeta.tone === 'warning' && styles.syncBadgeWarning,
            syncMeta.tone === 'danger' && styles.syncBadgeDanger,
          ]}
          onPress={() => {
            if (syncState.phase === 'syncing') return;
            void onRefresh();
          }}
          disabled={syncState.phase === 'syncing'}
          accessibilityRole="button"
          accessibilityLabel={`${syncMeta.label}. ${syncMeta.detail}. Last sync ${formatSyncAge(syncState.lastSuccessfulSyncAt)}.`}
        >
          <View style={styles.syncBadgeMain}>
            <Feather name={syncMeta.icon} size={14} color={syncMeta.tone === 'success' ? C.success : syncMeta.tone === 'danger' ? C.danger : syncMeta.tone === 'warning' ? C.amber : C.ash} />
            <Text
              style={[
                styles.syncBadgeLabel,
                syncMeta.tone === 'success' && styles.syncBadgeLabelSuccess,
                syncMeta.tone === 'warning' && styles.syncBadgeLabelWarning,
                syncMeta.tone === 'danger' && styles.syncBadgeLabelDanger,
              ]}
            >
              {syncMeta.label}
            </Text>
          </View>
          <Text style={styles.syncBadgeDetail}>
            {syncMeta.detail} • {formatSyncAge(syncState.lastSuccessfulSyncAt)}
          </Text>
        </Pressable>
      )}

      <FilterBar
        filters={filters}
        allTags={allTags}
        showAllCategories={showAllCategoryFilters}
        onCategoryChange={(cat) => setFilters({ ...filters, category: cat })}
        onToggleCategoryVisibility={() => setShowAllCategoryFilters((value) => !value)}
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
          initialNumToRender={10}
          maxToRenderPerBatch={6}
          windowSize={9}
          removeClippedSubviews={Platform.OS === 'android'}
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
              actionLabel={isAddingSample ? 'Adding sample…' : 'Try a sample document'}
              onAction={handleTrySampleDocument}
              showFABHint
            />
          }
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
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
          isAiOrganizing={isAiOrganizing}
          aiOrganizeProgress={aiOrganizeProgress}
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
  showAllCategories: boolean;
  onCategoryChange: (cat: (typeof CATEGORIES)[number]['key']) => void;
  onToggleCategoryVisibility: () => void;
  onToggleFavorite: () => void;
  onToggleTag: (tag: string) => void;
}

function FilterBar({
  filters,
  allTags,
  showAllCategories,
  onCategoryChange,
  onToggleCategoryVisibility,
  onToggleFavorite,
  onToggleTag,
}: FilterBarProps) {
  const activeCategory = filters.category;
  const activeTags = filters.tags ?? [];
  const favoriteActive = !!filters.isFavorite;
  const visibleCategories = showAllCategories
    ? CATEGORIES
    : CATEGORIES.filter((category) => category.key === undefined || COMMON_CATEGORY_KEYS.includes(category.key as typeof COMMON_CATEGORY_KEYS[number]));

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.chips}
    >
      {visibleCategories.map((c) => {
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

      <Pressable
        style={styles.chip}
        onPress={onToggleCategoryVisibility}
        hitSlop={6}
        accessibilityRole="button"
        accessibilityLabel={showAllCategories ? 'Show fewer category filters' : 'Show all category filters'}
      >
        <Feather name={showAllCategories ? 'chevron-left' : 'more-horizontal'} size={12} color={C.ash} />
        <Text style={styles.chipText}>{showAllCategories ? 'Less' : 'More'}</Text>
      </Pressable>

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
        <Feather name={favoriteActive ? 'check' : 'star'} size={12} color={favoriteActive ? C.amber : Colors.textMuted} />
        <Text style={[styles.chipText, favoriteActive && { color: C.amber, fontWeight: '700' }]}>
          Saved
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
  selectAllBtn: {
    fontSize: T.base,
    color: C.amber,
    fontWeight: '600',
  },
  headerControls: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.ink2,
    borderRadius: R.md,
    borderWidth: 1,
    borderColor: C.ink3,
    overflow: 'hidden',
  },
  headerControlBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: S[2] + 2,
    paddingVertical: S[1],
    minHeight: 32,
    justifyContent: 'center',
  },
  headerControlFoldersBtn: {
    paddingHorizontal: S[3],
  },
  headerControlDivider: {
    borderLeftWidth: 1,
    borderLeftColor: C.ink3,
  },
  headerControlText: {
    fontSize: T.xs,
    color: C.ash,
    fontWeight: '600',
  },
  headerFolderText: {
    color: C.amber,
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
  syncBadge: {
    marginHorizontal: Spacing['4'],
    marginBottom: Spacing['3'],
    paddingHorizontal: S[3],
    paddingVertical: S[2],
    borderRadius: R.lg,
    borderWidth: 1,
    borderColor: C.ink3,
    backgroundColor: C.ink2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: S[3],
  },
  syncBadgeSuccess: {
    backgroundColor: C.success + '14',
    borderColor: C.success + '33',
  },
  syncBadgeWarning: {
    backgroundColor: C.amberDim,
    borderColor: C.amber + '33',
  },
  syncBadgeDanger: {
    backgroundColor: C.danger + '14',
    borderColor: C.danger + '33',
  },
  syncBadgeMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S[2],
    minWidth: 0,
  },
  syncBadgeLabel: {
    fontSize: T.sm,
    fontWeight: '700',
    color: C.cream,
  },
  syncBadgeLabelSuccess: {
    color: C.success,
  },
  syncBadgeLabelWarning: {
    color: C.amber,
  },
  syncBadgeLabelDanger: {
    color: C.danger,
  },
  syncBadgeDetail: {
    flexShrink: 1,
    fontSize: T.xs,
    color: C.ash,
    textAlign: 'right',
  },
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
