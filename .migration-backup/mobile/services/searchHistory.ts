/**
 * searchHistory.ts — Persisted recent search history
 *
 * Stores up to MAX_ENTRIES recent queries in AsyncStorage.
 * Queries are deduped (most-recent wins) and trimmed on write.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'filetrail-search-history-v1';
const MAX_ENTRIES = 12;

async function load(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

async function save(entries: string[]): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(entries));
  } catch {
    // Search history is non-critical.
  }
}

/** Returns the stored recent queries, newest first. */
export async function getRecentSearches(): Promise<string[]> {
  return load();
}

/** Adds a query to the front of history (dedupes, trims to MAX). */
export async function addRecentSearch(query: string): Promise<string[]> {
  const q = query.trim();
  if (!q) return load();
  const existing = await load();
  const deduped = [q, ...existing.filter((e) => e.toLowerCase() !== q.toLowerCase())];
  const trimmed = deduped.slice(0, MAX_ENTRIES);
  await save(trimmed);
  return trimmed;
}

/** Removes a single query from history. */
export async function removeRecentSearch(query: string): Promise<string[]> {
  const existing = await load();
  const updated = existing.filter((e) => e !== query);
  await save(updated);
  return updated;
}

/** Clears the entire history. */
export async function clearSearchHistory(): Promise<void> {
  await save([]);
}
