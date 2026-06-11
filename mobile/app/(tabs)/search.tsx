import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  InteractionManager,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useIsFocused } from '@react-navigation/native';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useDocumentStore } from '@/store';
import {
  addRecentSearch,
  clearSearchHistory,
  getRecentSearches,
  removeRecentSearch,
} from '@/services/searchHistory';
import { useDebounce } from '@/utils/useDebounce';
import { C, R, S, T } from '@/theme/tokens';
import type { Document, SearchResult } from '@/types/document';

type ResultItem =
  | { type: 'section'; key: string; label: string; count: number }
  | { type: 'result'; key: string; value: SearchResult };

const CATEGORY_COLORS: Record<Document['category'], string> = {
  receipt: C.category.receipt,
  bill: C.warning,
  contract: C.category.contract,
  id: C.category.id,
  warranty: C.category.warranty,
  medical: C.category.medical,
  tax: C.category.tax,
  work: C.amber,
  retirement: C.warning,
  insurance: C.warning,
  legal: C.danger,
  vehicle: C.warning,
  property: C.amber,
  education: C.category.id,
  travel: C.category.contract,
  pet: C.category.medical,
  other: C.category.other,
};

const MATCH_LABELS: Record<SearchResult['matchedFields'][number], string> = {
  title: 'Title',
  ocrText: 'Text',
  category: 'Category',
  tags: 'Tag',
};

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const inputRef = useRef<TextInput>(null);
  const hasAutoFocused = useRef(false);
  const isFocused = useIsFocused();

  const searchDocuments = useDocumentStore((state) => state.search);
  const retryOCR = useDocumentStore((state) => state.retryOCR);
  const totalDocs = useDocumentStore((state) => state.documents.length);
  const ocrReadyCount = useDocumentStore((state) =>
    state.documents.filter((doc) => doc.ocrStatus === 'done').length,
  );

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [sortMode, setSortMode] = useState<'relevance' | 'newest'>('relevance');

  const debouncedQuery = useDebounce(query, 150);
  const trimmedQuery = query.trim();
  const hasQuery = trimmedQuery.length > 0;

  useEffect(() => {
    void getRecentSearches().then(setRecentSearches);
  }, []);

  useEffect(() => {
    if (isFocused && !hasAutoFocused.current) {
      hasAutoFocused.current = true;
      const timer = setTimeout(() => inputRef.current?.focus(), 100);
      return () => clearTimeout(timer);
    }
  }, [isFocused]);

  const runSearch = useCallback((value: string) => {
    const nextQuery = value.trim();
    if (!nextQuery) {
      setResults([]);
      setIsSearching(false);
      return () => undefined;
    }

    setIsSearching(true);
    const handle = InteractionManager.runAfterInteractions(() => {
      setResults(searchDocuments(nextQuery));
      setIsSearching(false);
    });
    return () => handle.cancel();
  }, [searchDocuments]);

  useEffect(() => runSearch(debouncedQuery), [debouncedQuery, runSearch]);

  const commitSearch = useCallback(async (value: string) => {
    const nextQuery = value.trim();
    if (!nextQuery) return;
    const updated = await addRecentSearch(nextQuery);
    setRecentSearches(updated);
  }, []);

  const handlePickRecent = useCallback((value: string) => {
    setQuery(value);
    runSearch(value);
  }, [runSearch]);

  const handleRemoveRecent = useCallback(async (value: string) => {
    const updated = await removeRecentSearch(value);
    setRecentSearches(updated);
  }, []);

  const handleClearRecent = useCallback(async () => {
    await clearSearchHistory();
    setRecentSearches([]);
  }, []);

  const suggestions = useMemo(() => {
    if (!hasQuery) return [];
    return recentSearches.filter((item) =>
      item !== trimmedQuery && item.toLowerCase().includes(trimmedQuery.toLowerCase()),
    );
  }, [hasQuery, recentSearches, trimmedQuery]);

  const sortedResults = useMemo(() => {
    if (sortMode === 'newest') {
      return [...results].sort((a, b) => b.document.updatedAt.localeCompare(a.document.updatedAt));
    }
    return results;
  }, [results, sortMode]);

  const primaryMatches = useMemo(
    () => sortedResults.filter((result) =>
      result.matchedFields.some((field) => field === 'title' || field === 'tags' || field === 'category'),
    ),
    [sortedResults],
  );

  const textMatches = useMemo(
    () => sortedResults.filter((result) =>
      !result.matchedFields.some((field) => field === 'title' || field === 'tags' || field === 'category') &&
      result.matchedFields.includes('ocrText'),
    ),
    [sortedResults],
  );

  const listData: ResultItem[] = useMemo(() => [
    ...(primaryMatches.length > 0
      ? [{ type: 'section' as const, key: 'section-primary', label: 'Best Matches', count: primaryMatches.length }]
      : []),
    ...primaryMatches.map((value) => ({ type: 'result' as const, key: `primary-${value.document.id}`, value })),
    ...(textMatches.length > 0
      ? [{ type: 'section' as const, key: 'section-text', label: 'Inside Document Text', count: textMatches.length }]
      : []),
    ...textMatches.map((value) => ({ type: 'result' as const, key: `text-${value.document.id}`, value })),
  ], [primaryMatches, textMatches]);

  const openResult = useCallback((result: SearchResult) => {
    void commitSearch(trimmedQuery);
    router.push({ pathname: '/viewer/[id]', params: { id: result.document.id } });
  }, [commitSearch, trimmedQuery]);

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.headerBand}>
        <Text style={styles.headerEyebrow}>Workspace Search</Text>
        <Text style={styles.headerTitle}>Find documents fast</Text>
        <Text style={styles.headerBody}>
          Search by title, tags, category, or extracted text across your vault.
        </Text>

        <View style={styles.searchShell}>
          <Feather name="search" size={18} color={C.ash} />
          <TextInput
            ref={inputRef}
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={() => void commitSearch(trimmedQuery)}
            style={styles.searchInput}
            placeholder="Search documents, tags, vendors, text…"
            placeholderTextColor={C.ash}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
            clearButtonMode="while-editing"
          />
          {isSearching ? (
            <ActivityIndicator size="small" color={C.amber} />
          ) : hasQuery ? (
            <Pressable
              style={styles.clearButton}
              onPress={() => {
                setQuery('');
                setResults([]);
              }}
              hitSlop={8}
            >
              <Feather name="x" size={16} color={C.ash} />
            </Pressable>
          ) : null}
        </View>

        {!hasQuery ? (
          <View style={styles.statsRow}>
            <StatPill icon="folder" label={`${totalDocs} docs`} />
            <StatPill icon="file-text" label={`${ocrReadyCount} OCR ready`} />
            <StatPill icon="clock" label={`${recentSearches.length} recent`} />
          </View>
        ) : null}
      </View>

      {hasQuery && suggestions.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.suggestionRow}
        >
          {suggestions.map((value) => (
            <Pressable
              key={value}
              style={styles.suggestionChip}
              onPress={() => handlePickRecent(value)}
            >
              <Feather name="corner-down-left" size={12} color={C.amber} />
              <Text style={styles.suggestionText}>{value}</Text>
            </Pressable>
          ))}
        </ScrollView>
      ) : null}

      {!hasQuery ? (
        <ScrollView
          style={styles.body}
          contentContainerStyle={{ paddingBottom: insets.bottom + S[8] }}
          showsVerticalScrollIndicator={false}
        >
          <RecentSearchBlock
            recent={recentSearches}
            totalDocs={totalDocs}
            onPick={handlePickRecent}
            onRemove={handleRemoveRecent}
            onClear={handleClearRecent}
          />
        </ScrollView>
      ) : results.length === 0 && !isSearching ? (
        <View style={[styles.body, styles.emptyWrap]}>
          <EmptyState
            icon="inbox"
            title="No matches"
            body={`Nothing matched "${trimmedQuery}". Try a shorter term, a vendor name, or a tag.`}
          />
        </View>
      ) : (
        <FlatList
          style={styles.body}
          data={listData}
          keyExtractor={(item) => item.key}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={{ paddingBottom: insets.bottom + S[8] }}
          ListHeaderComponent={(
            <View style={styles.resultsToolbar}>
              <View>
                <Text style={styles.toolbarLabel}>Results</Text>
                <Text style={styles.toolbarCount}>
                  {results.length} {results.length === 1 ? 'document' : 'documents'}
                </Text>
              </View>
              <View style={styles.segmentedControl}>
                <SegmentButton
                  label="Relevance"
                  active={sortMode === 'relevance'}
                  onPress={() => setSortMode('relevance')}
                />
                <SegmentButton
                  label="Newest"
                  active={sortMode === 'newest'}
                  onPress={() => setSortMode('newest')}
                />
              </View>
            </View>
          )}
          renderItem={({ item }) => {
            if (item.type === 'section') {
              return (
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>{item.label}</Text>
                  <Text style={styles.sectionCount}>{item.count}</Text>
                </View>
              );
            }

            return (
              <ResultRow
                result={item.value}
                onPress={() => openResult(item.value)}
                onRetryOCR={() => retryOCR(item.value.document.id)}
              />
            );
          }}
        />
      )}
    </View>
  );
}

function StatPill({ icon, label }: { icon: React.ComponentProps<typeof Feather>['name']; label: string }) {
  return (
    <View style={styles.statPill}>
      <Feather name={icon} size={13} color={C.amber} />
      <Text style={styles.statPillText}>{label}</Text>
    </View>
  );
}

function SegmentButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.segmentButton,
        active && styles.segmentButtonActive,
        pressed && { opacity: 0.85 },
      ]}
      onPress={onPress}
    >
      <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{label}</Text>
    </Pressable>
  );
}

function RecentSearchBlock({
  recent,
  totalDocs,
  onPick,
  onRemove,
  onClear,
}: {
  recent: string[];
  totalDocs: number;
  onPick: (value: string) => void;
  onRemove: (value: string) => void;
  onClear: () => void;
}) {
  return (
    <View style={styles.recentSection}>
      <View style={styles.sectionBand}>
        <Text style={styles.sectionBandTitle}>Recent Searches</Text>
        {recent.length > 0 ? (
          <Pressable onPress={onClear} hitSlop={8}>
            <Text style={styles.sectionBandAction}>Clear all</Text>
          </Pressable>
        ) : null}
      </View>

      {recent.length > 0 ? (
        <View style={styles.recentList}>
          {recent.map((value) => (
            <View key={value} style={styles.recentRow}>
              <Pressable style={styles.recentMain} onPress={() => onPick(value)}>
                <View style={styles.recentIcon}>
                  <Feather name="clock" size={14} color={C.amber} />
                </View>
                <Text style={styles.recentValue}>{value}</Text>
              </Pressable>
              <Pressable style={styles.recentRemove} onPress={() => onRemove(value)} hitSlop={8}>
                <Feather name="x" size={14} color={C.ash} />
              </Pressable>
            </View>
          ))}
        </View>
      ) : (
        <EmptyState
          icon="search"
          title="Start with a search"
          body={
            totalDocs > 0
              ? `Search across ${totalDocs} document${totalDocs === 1 ? '' : 's'} by name, text, category, and tags.`
              : 'Add documents first, then search across their names and extracted text.'
          }
        />
      )}
    </View>
  );
}

function ResultRow({
  result,
  onPress,
  onRetryOCR,
}: {
  result: SearchResult;
  onPress: () => void;
  onRetryOCR: () => void;
}) {
  const { document } = result;
  const categoryColor = CATEGORY_COLORS[document.category];
  const dateLabel = new Date(document.updatedAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <Pressable style={({ pressed }) => [styles.resultRow, pressed && styles.resultRowPressed]} onPress={onPress}>
      <View style={[styles.resultAccent, { backgroundColor: categoryColor }]} />
      <View style={styles.resultIcon}>
        <Feather
          name={document.mimeType.includes('pdf') ? 'file-text' : 'image'}
          size={20}
          color={categoryColor}
        />
      </View>

      <View style={styles.resultBody}>
        <View style={styles.resultHeader}>
          <Text style={styles.resultTitle} numberOfLines={1}>{document.title}</Text>
          <Text style={styles.resultDate}>{dateLabel}</Text>
        </View>

        <View style={styles.resultMeta}>
          <Text style={[styles.resultCategory, { color: categoryColor }]}>
            {document.category.toUpperCase()}
          </Text>
          <Text style={styles.metaDot}>•</Text>
          <Text style={styles.resultMetaText}>{formatBytes(document.fileSizeBytes)}</Text>
          {document.folderId ? (
            <>
              <Text style={styles.metaDot}>•</Text>
              <Text style={styles.resultMetaText}>Filed</Text>
            </>
          ) : null}
        </View>

        {result.snippet ? (
          <Text style={styles.resultSnippet} numberOfLines={2}>
            {stripMarks(result.snippet)}
          </Text>
        ) : (
          <Text style={styles.resultSnippetMuted} numberOfLines={1}>
            Search matched document metadata.
          </Text>
        )}

        <View style={styles.resultFooter}>
          <View style={styles.matchRow}>
            {result.matchedFields.map((field) => (
              <View key={field} style={styles.matchBadge}>
                <Text style={styles.matchBadgeText}>{MATCH_LABELS[field]}</Text>
              </View>
            ))}
          </View>
          {document.ocrStatus === 'failed' ? (
            <Pressable style={styles.retryButton} onPress={onRetryOCR}>
              <Feather name="refresh-cw" size={12} color={C.danger} />
              <Text style={styles.retryButtonText}>Retry OCR</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

function EmptyState({ icon, title, body }: { icon: React.ComponentProps<typeof Feather>['name']; title: string; body: string }) {
  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIcon}>
        <Feather name={icon} size={22} color={C.amber} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyBody}>{body}</Text>
    </View>
  );
}

function stripMarks(value: string): string {
  return value.replace(/<\/?mark>/g, '');
}

function formatBytes(bytes: number): string {
  if (!bytes) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: C.ink1,
  },
  headerBand: {
    paddingHorizontal: S[4],
    paddingTop: S[4],
    paddingBottom: S[4],
    borderBottomWidth: 1,
    borderBottomColor: C.ink3,
    gap: S[3],
  },
  headerEyebrow: {
    fontSize: T.xs,
    color: C.ash,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: T.xl,
    color: C.cream,
    fontWeight: '700',
  },
  headerBody: {
    fontSize: T.base,
    color: C.ash,
    lineHeight: 21,
  },
  searchShell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S[2],
    minHeight: 52,
    borderRadius: R.lg,
    backgroundColor: C.ink2,
    borderWidth: 1,
    borderColor: C.ink4,
    paddingHorizontal: S[3],
  },
  searchInput: {
    flex: 1,
    minHeight: 52,
    color: C.cream,
    fontSize: T.base,
  },
  clearButton: {
    width: 28,
    height: 28,
    borderRadius: R.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.ink3,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: S[2],
  },
  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S[2],
    paddingHorizontal: S[3],
    paddingVertical: S[2],
    borderRadius: R.full,
    backgroundColor: C.ink2,
    borderWidth: 1,
    borderColor: C.ink4,
  },
  statPillText: {
    color: C.cream,
    fontSize: T.sm,
  },
  suggestionRow: {
    paddingHorizontal: S[4],
    paddingVertical: S[2],
    gap: S[2],
    borderBottomWidth: 1,
    borderBottomColor: C.ink3,
  },
  suggestionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S[2],
    paddingHorizontal: S[3],
    paddingVertical: S[2],
    backgroundColor: C.ink2,
    borderRadius: R.full,
    borderWidth: 1,
    borderColor: C.ink4,
  },
  suggestionText: {
    fontSize: T.sm,
    color: C.cream,
  },
  body: {
    flex: 1,
  },
  emptyWrap: {
    justifyContent: 'center',
  },
  resultsToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: S[4],
    paddingTop: S[4],
    paddingBottom: S[3],
    gap: S[3],
  },
  toolbarLabel: {
    fontSize: T.xs,
    color: C.ash,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    fontWeight: '600',
  },
  toolbarCount: {
    fontSize: T.base,
    color: C.cream,
    fontWeight: '600',
    marginTop: 2,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: C.ink2,
    borderRadius: R.full,
    borderWidth: 1,
    borderColor: C.ink4,
    padding: 4,
  },
  segmentButton: {
    minWidth: 88,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: S[3],
    paddingVertical: 8,
    borderRadius: R.full,
  },
  segmentButtonActive: {
    backgroundColor: C.amberDim,
  },
  segmentText: {
    color: C.ash,
    fontSize: T.sm,
    fontWeight: '600',
  },
  segmentTextActive: {
    color: C.amber,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: S[4],
    paddingTop: S[3],
    paddingBottom: S[2],
  },
  sectionTitle: {
    fontSize: T.xs,
    color: C.ash,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    fontWeight: '600',
  },
  sectionCount: {
    fontSize: T.sm,
    color: C.faint,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: S[3],
    marginHorizontal: S[4],
    marginBottom: S[3],
    padding: S[3],
    borderRadius: R.lg,
    backgroundColor: C.ink2,
    borderWidth: 1,
    borderColor: C.ink4,
  },
  resultRowPressed: {
    opacity: 0.86,
  },
  resultAccent: {
    width: 4,
    alignSelf: 'stretch',
    borderRadius: R.full,
  },
  resultIcon: {
    width: 40,
    height: 40,
    borderRadius: R.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.ink3,
  },
  resultBody: {
    flex: 1,
    gap: S[2],
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: S[3],
  },
  resultTitle: {
    flex: 1,
    color: C.cream,
    fontSize: T.base,
    fontWeight: '600',
  },
  resultDate: {
    color: C.ash,
    fontSize: T.sm,
  },
  resultMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: S[2],
  },
  resultCategory: {
    fontSize: T.xs,
    fontWeight: '700',
  },
  metaDot: {
    color: C.faint,
    fontSize: T.xs,
  },
  resultMetaText: {
    color: C.ash,
    fontSize: T.sm,
  },
  resultSnippet: {
    color: C.cream,
    fontSize: T.sm,
    lineHeight: 19,
  },
  resultSnippetMuted: {
    color: C.ash,
    fontSize: T.sm,
  },
  resultFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: S[2],
  },
  matchRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: S[2],
    flex: 1,
  },
  matchBadge: {
    paddingHorizontal: S[2],
    paddingVertical: 5,
    borderRadius: R.full,
    backgroundColor: C.ink3,
  },
  matchBadgeText: {
    color: C.ash,
    fontSize: T.xs,
    fontWeight: '600',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: S[2],
    paddingVertical: 6,
    borderRadius: R.full,
    backgroundColor: '#311617',
  },
  retryButtonText: {
    color: C.danger,
    fontSize: T.xs,
    fontWeight: '700',
  },
  recentSection: {
    paddingHorizontal: S[4],
    paddingTop: S[4],
    gap: S[3],
  },
  sectionBand: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionBandTitle: {
    fontSize: T.base,
    color: C.cream,
    fontWeight: '600',
  },
  sectionBandAction: {
    color: C.amber,
    fontSize: T.sm,
    fontWeight: '600',
  },
  recentList: {
    gap: S[2],
  },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
    borderRadius: R.lg,
    borderWidth: 1,
    borderColor: C.ink4,
    backgroundColor: C.ink2,
    paddingHorizontal: S[3],
  },
  recentMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: S[3],
  },
  recentIcon: {
    width: 34,
    height: 34,
    borderRadius: R.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.ink3,
  },
  recentValue: {
    flex: 1,
    color: C.cream,
    fontSize: T.base,
  },
  recentRemove: {
    width: 32,
    height: 32,
    borderRadius: R.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: S[6],
    paddingVertical: S[12],
    gap: S[3],
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: R.xl,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.ink2,
    borderWidth: 1,
    borderColor: C.ink4,
  },
  emptyTitle: {
    color: C.cream,
    fontSize: T.lg,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptyBody: {
    color: C.ash,
    fontSize: T.base,
    textAlign: 'center',
    lineHeight: 21,
  },
});
