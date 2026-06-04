/**
 * search.tsx — Full-text search (Phase 6)
 *
 * Enhancements over Phase 5:
 *   - Recent search history (persisted via searchHistory service)
 *   - Suggestions shown while typing (matching recent queries)
 *   - Result count + sort by relevance / date toggle
 *   - OCR retry button on documents with failed OCR status
 *   - Metadata chips: inferred date, vendor, amounts from OCR
 */

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { useDocumentStore } from '@/store/documentStore';
import { DocumentCard } from '@/components/DocumentCard';
import {
  getRecentSearches,
  addRecentSearch,
  removeRecentSearch,
  clearSearchHistory,
} from '@/services/searchHistory';
import { useDebounce } from '@/utils/useDebounce';
import { C, T, R, S } from '@/theme/tokens';
import type { SearchResult } from '@/types/document';

type SearchListItem =
  | { type: 'header'; label: string; key: string }
  | { type: 'result'; result: SearchResult; key: string };

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const searchFn = useDocumentStore(s => s.search);
  const retryOCR = useDocumentStore(s => s.retryOCR);
  const totalDocs = useDocumentStore(s => s.documents.length);

  const isFocused = useIsFocused();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [sortByDate, setSortByDate] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const hasAutoFocusedRef = useRef(false);
  const debouncedQuery = useDebounce(query, 150);

  useEffect(() => {
    getRecentSearches().then(setRecentSearches);
  }, []);

  // Auto-focus once on first visit; later tab switches should not steal the keyboard.
  useEffect(() => {
    if (isFocused && !hasAutoFocusedRef.current) {
      hasAutoFocusedRef.current = true;
      const t = setTimeout(() => inputRef.current?.focus(), 100);
      return () => clearTimeout(t);
    }
  }, [isFocused]);

  const runSearch = useCallback((q: string) => {
    if (!q.trim()) {
      setResults([]);
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    setTimeout(() => {
      const r = searchFn(q);
      setResults(r);
      setIsSearching(false);
    }, 0);
  }, [searchFn]);

  useEffect(() => {
    runSearch(debouncedQuery);
  }, [debouncedQuery, runSearch]);

  const commitSearch = useCallback(async (q: string) => {
    if (!q.trim()) return;
    const updated = await addRecentSearch(q);
    setRecentSearches(updated);
  }, []);

  const pickRecent = useCallback((q: string) => {
    setQuery(q);
    runSearch(q);
  }, [runSearch]);

  const removeRecent = useCallback(async (q: string) => {
    const updated = await removeRecentSearch(q);
    setRecentSearches(updated);
  }, []);

  const clearRecent = useCallback(async () => {
    await clearSearchHistory();
    setRecentSearches([]);
  }, []);

  const hasQuery = query.trim().length > 0;

  // Group results: title/tag/category matches first, OCR text matches second
  const { titleMatches, textMatches } = useMemo(() => {
    const base = sortByDate
      ? [...results].sort((a, b) => b.document.createdAt.localeCompare(a.document.createdAt))
      : results;
    return {
      titleMatches: base.filter(r =>
        r.matchedFields.some(f => f === 'title' || f === 'tags' || f === 'category')
      ),
      textMatches: base.filter(r =>
        !r.matchedFields.some(f => f === 'title' || f === 'tags' || f === 'category') &&
        r.matchedFields.includes('ocrText')
      ),
    };
  }, [results, sortByDate]);
  const suggestions = hasQuery
    ? recentSearches.filter(r => r.toLowerCase().includes(query.toLowerCase()) && r !== query)
    : [];
  const listData: SearchListItem[] = [
    ...(titleMatches.length > 0 ? [{ type: 'header' as const, label: `Title · Tag · Category (${titleMatches.length})`, key: 'h1' }] : []),
    ...titleMatches.map(r => ({ type: 'result' as const, result: r, key: r.document.id })),
    ...(textMatches.length > 0 ? [{ type: 'header' as const, label: `Extracted Text (${textMatches.length})`, key: 'h2' }] : []),
    ...textMatches.map(r => ({ type: 'result' as const, result: r, key: r.document.id })),
  ];

  const renderSearchResult = useCallback((item: SearchResult) => (
    <Pressable
      onPress={() => {
        commitSearch(query);
        router.push({ pathname: '/viewer/[id]', params: { id: item.document.id } });
      }}
      style={({ pressed }) => [styles.resultItem, pressed && styles.resultItemPressed]}
    >
      <DocumentCard document={item.document} compact />
      {item.snippet && (
        <View style={styles.snippetContainer}>
          <Text style={styles.snippetLabel}>From text:</Text>
          <SnippetText raw={item.snippet} />
        </View>
      )}
      <View style={styles.resultFooter}>
        <MatchedFieldBadges fields={item.matchedFields} />
        {item.document.ocrStatus === 'failed' && (
          <Pressable
            style={styles.retryBtn}
            onPress={() => retryOCR(item.document.id)}
            hitSlop={8}
          >
            <Text style={styles.retryText}>↺ Retry OCR</Text>
          </Pressable>
        )}
      </View>
    </Pressable>
  ), [query, commitSearch, retryOCR]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Search bar */}
      <View style={styles.searchBarRow}>
        <View style={styles.searchBar}>
          <Feather name="search" size={18} color={C.ash} style={styles.searchIcon} />
          <TextInput
            ref={inputRef}
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={() => commitSearch(query)}
            placeholder="Search documents…"
            placeholderTextColor={C.ash}
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
            clearButtonMode="while-editing"
          />
          {isSearching && (
            <ActivityIndicator size="small" color={C.amber} style={{ marginRight: S[2] }} />
          )}
        </View>
        {hasQuery && (
          <Pressable style={styles.cancelBtn} onPress={() => { setQuery(''); setResults([]); }}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
        )}
      </View>

      {/* Inline suggestions while typing */}
      {hasQuery && suggestions.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.suggestions}>
          {suggestions.map(s => (
            <Pressable key={s} style={styles.suggestion} onPress={() => pickRecent(s)}>
              <Text style={styles.suggestionText}>↩ {s}</Text>
            </Pressable>
          ))}
        </ScrollView>
      )}

      {/* Results / empty states */}
      {!hasQuery ? (
        <RecentSearchesPanel
          recent={recentSearches}
          totalDocs={totalDocs}
          onPick={pickRecent}
          onRemove={removeRecent}
          onClear={clearRecent}
        />
      ) : results.length === 0 && !isSearching ? (
        <NoResults query={query} />
      ) : (
        <FlatList
          data={listData}
          keyExtractor={item => item.key}
          renderItem={({ item }) => {
            if (item.type === 'header') {
              return <Text style={styles.groupHeader}>{item.label}</Text>;
            }
            return renderSearchResult(item.result);
          }}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 100 }]}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            results.length > 0 ? (
              <View style={styles.resultsHeader}>
                <Text style={styles.resultCount}>
                  {results.length} {results.length === 1 ? 'result' : 'results'}
                </Text>
                <Pressable onPress={() => setSortByDate(v => !v)} hitSlop={8}>
                  <View style={styles.sortToggle}>
                    <Feather name={sortByDate ? 'calendar' : 'star'} size={13} color={sortByDate ? C.amber : C.ash} />
                    <Text style={[styles.sortToggleText, sortByDate && styles.sortToggleTextActive]}>
                      {sortByDate ? 'Date' : 'Relevance'}
                    </Text>
                  </View>
                </Pressable>
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function RecentSearchesPanel({
  recent,
  totalDocs,
  onPick,
  onRemove,
  onClear,
}: {
  recent: string[];
  totalDocs: number;
  onPick: (q: string) => void;
  onRemove: (q: string) => void;
  onClear: () => void;
}) {
  return (
    <View style={styles.recentPanel}>
      {recent.length > 0 ? (
        <>
          <View style={styles.recentHeader}>
            <Text style={styles.recentTitle}>Recent Searches</Text>
            <Pressable onPress={onClear} hitSlop={8}>
              <Text style={styles.clearText}>Clear all</Text>
            </Pressable>
          </View>
          {/* Horizontal pill chips for recent searches */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.recentChips}
          >
            {recent.map(q => (
              <View key={q} style={styles.recentChip}>
                <Pressable onPress={() => onPick(q)} style={styles.recentChipLabel}>
                  <Feather name="clock" size={13} color={C.ash} />
                  <Text style={styles.recentChipText}>{q}</Text>
                </Pressable>
                <Pressable onPress={() => onRemove(q)} hitSlop={6} style={styles.recentChipRemove}>
                  <Text style={styles.recentChipRemoveText}>×</Text>
                </Pressable>
              </View>
            ))}
          </ScrollView>
        </>
      ) : null}

      <View style={styles.emptyState}>
        <View style={styles.emptyIconWrap}>
          <Feather name="search" size={42} color={C.amber} />
        </View>
        <Text style={styles.emptyTitle}>Search your documents</Text>
        <Text style={styles.emptyBody}>
          {totalDocs > 0
            ? `Search across ${totalDocs} document${totalDocs === 1 ? '' : 's'} by title, tag, category, or extracted text.`
            : 'Add documents first, then search across their titles and text content.'}
        </Text>
      </View>
    </View>
  );
}

function NoResults({ query }: { query: string }) {
  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconWrap}>
        <Feather name="inbox" size={42} color={C.amber} />
      </View>
      <Text style={styles.emptyTitle}>No results</Text>
      <Text style={styles.emptyBody}>
        Nothing matched "{query}". Try a different word or check your spelling.
      </Text>
    </View>
  );
}

function SnippetText({ raw }: { raw: string }) {
  const parts = raw.split(/(<mark>.*?<\/mark>)/g);
  return (
    <Text style={styles.snippet}>
      {parts.map((part, i) => {
        if (part.startsWith('<mark>')) {
          const inner = part.replace(/<\/?mark>/g, '');
          return <Text key={i} style={styles.snippetHighlight}>{inner}</Text>;
        }
        return <Text key={i}>{part}</Text>;
      })}
    </Text>
  );
}

function MatchedFieldBadges({ fields }: { fields: SearchResult['matchedFields'] }) {
  if (fields.length === 0) return null;
  const labels: Record<string, string> = {
    title: 'Title', ocrText: 'Text', category: 'Category', tags: 'Tag',
  };
  return (
    <View style={styles.badgeRow}>
      {fields.map(f => (
        <View key={f} style={styles.badge}>
          <Text style={styles.badgeText}>{labels[f]}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.ink1 },
  searchBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: S[4],
    paddingVertical: S[3],
    borderBottomWidth: 1,
    borderBottomColor: C.ink3,
    gap: S[3],
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.ink2,
    borderRadius: R.lg,
    paddingHorizontal: S[3],
    height: 48,
  },
  searchIcon: { marginRight: S[2] },
  searchInput: { flex: 1, fontSize: T.base, color: C.cream, height: '100%' },
  cancelBtn: { paddingVertical: S[2] },
  cancelText: { fontSize: T.base, color: C.amber },
  suggestions: {
    paddingHorizontal: S[4],
    paddingVertical: S[2],
    gap: S[2],
    borderBottomWidth: 1,
    borderBottomColor: C.ink3,
  },
  suggestion: {
    backgroundColor: C.ink2,
    borderRadius: R.full,
    paddingHorizontal: S[3],
    paddingVertical: S[1] + 2,
  },
  suggestionText: { fontSize: T.sm, color: C.ash },
  recentPanel: { paddingTop: S[4] },
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: S[3],
    paddingHorizontal: S[4],
  },
  recentTitle: {
    fontSize: T.xs,
    color: C.ash,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    fontWeight: '600',
  },
  clearText: { fontSize: T.sm, color: C.amber },
  recentChips: {
    paddingHorizontal: S[4],
    paddingBottom: S[3],
    gap: S[2],
    flexDirection: 'row',
  },
  recentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.ink2,
    borderRadius: R.full,
    borderWidth: 1,
    borderColor: C.ink3,
    paddingLeft: S[3],
    paddingRight: S[2],
    height: 36,
  },
  recentChipLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S[1],
    paddingRight: S[1],
  },
  recentChipText: { fontSize: T.sm, color: C.ash },
  recentChipRemove: { paddingHorizontal: S[1] },
  recentChipRemoveText: { fontSize: 16, color: C.ink4, fontWeight: '600' },
  list: { paddingHorizontal: S[4], paddingTop: S[3] },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: S[3],
  },
  resultCount: {
    fontSize: T.xs,
    color: C.ash,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  sortToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S[1],
  },
  sortToggleText: { fontSize: T.sm, color: C.ash },
  sortToggleTextActive: { color: C.amber, fontWeight: '600' },
  groupHeader: {
    fontSize: T.xs,
    color: C.ash,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: S[3],
    marginBottom: S[2],
    paddingHorizontal: S[1],
  },
  resultItem: {
    marginBottom: S[3],
    borderRadius: R.lg,
    overflow: 'hidden',
    backgroundColor: C.ink2,
  },
  resultItemPressed: { opacity: 0.75 },
  snippetContainer: { paddingHorizontal: S[4], paddingBottom: S[2] },
  snippetLabel: {
    fontSize: T.xs, color: C.ink4,
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: S[1],
  },
  snippet: { fontSize: T.sm, color: C.ash, lineHeight: 18 },
  snippetHighlight: { color: C.amber, fontWeight: '600', backgroundColor: C.amberDim },
  resultFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: S[4],
    paddingBottom: S[3],
  },
  badgeRow: { flexDirection: 'row', gap: S[2], flexWrap: 'wrap' },
  badge: { backgroundColor: C.ink3, borderRadius: R.full, paddingHorizontal: S[3], paddingVertical: 2 },
  badgeText: { fontSize: T.xs, color: C.ash },
  retryBtn: {
    backgroundColor: '#3A1515',
    borderRadius: R.full,
    paddingHorizontal: S[3],
    paddingVertical: 3,
  },
  retryText: { fontSize: T.xs, color: '#EF4444', fontWeight: '600' },
  emptyState: {
    flex: 1, alignItems: 'center', justifyContent: 'flex-start',
    paddingTop: S[10],
    paddingHorizontal: S[8], gap: S[3],
  },
  emptyIconWrap: {
    width: 88,
    height: 88,
    borderRadius: R.xl,
    backgroundColor: C.ink2,
    borderWidth: 1,
    borderColor: C.ink3,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: S[2],
  },
  emptyTitle: { fontSize: T.lg, fontWeight: '700', color: C.cream, textAlign: 'center' },
  emptyBody: { fontSize: T.base, color: C.ash, textAlign: 'center', lineHeight: 22 },
});
