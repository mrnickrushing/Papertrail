/**
 * DocumentCard.tsx — Reusable document card component
 *
 * Phase 3 update:
 *   - `compact` prop for search results / folder views (no accent bar,
 *     no date prefix — just thumbnail + title + category inline)
 *   - Date now shows "Mon Jun 2" prefix on full cards
 *   - Thumbnail fallback reserves space so cards with/without images align
 *   - GOING pill bumped to T.xs minimum
 *   - Move-to-folder action via onLongPress callback prop
 */

import React from 'react';
import {
  View,
  Text,
  Image,
  Pressable,
  StyleSheet,
} from 'react-native';
import { C, T, R, S } from '@/theme/tokens';
import type { Document, DocumentCategory } from '@/types/document';

const CATEGORY_LABELS: Record<DocumentCategory, string> = {
  receipt: '🧾 Receipt',
  contract: '📝 Contract',
  id: '🪪 ID',
  warranty: '🛡️ Warranty',
  medical: '🏥 Medical',
  tax: '💰 Tax',
  other: '📁 Other',
};

const CATEGORY_COLORS: Record<DocumentCategory, string> = {
  receipt:  '#F59E0B',
  contract: '#3B82F6',
  id:       '#8B5CF6',
  warranty: '#10B981',
  medical:  '#EF4444',
  tax:      '#06B6D4',
  other:    '#6B7280',
};

interface DocumentCardProps {
  document: Document;
  /** Compact mode: used in search results and folder lists */
  compact?: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
}

export function DocumentCard({
  document,
  compact = false,
  onPress,
  onLongPress,
}: DocumentCardProps) {
  const accentColor = CATEGORY_COLORS[document.category];
  const isUpcoming = false; // documents don't have event dates

  const dateStr = new Date(document.createdAt).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  if (compact) {
    return (
      <Pressable style={styles.compactCard} onPress={onPress} onLongPress={onLongPress}>
        {/* Thumbnail or category color block */}
        <View style={styles.compactThumb}>
          {document.thumbnailUri ? (
            <Image
              source={{ uri: document.thumbnailUri }}
              style={styles.compactThumbImage}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.compactThumbPlaceholder, { backgroundColor: accentColor + '33' }]}>
              <Text style={styles.compactThumbEmoji}>
                {document.mimeType.includes('pdf') ? '📄' : '🖼️'}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.compactInfo}>
          <Text style={styles.compactTitle} numberOfLines={1}>{document.title}</Text>
          <Text style={styles.compactMeta}>
            {CATEGORY_LABELS[document.category]} · {dateStr}
          </Text>
        </View>

        {document.isFavorite && (
          <Text style={styles.favStar}>★</Text>
        )}
      </Pressable>
    );
  }

  return (
    <Pressable style={styles.card} onPress={onPress} onLongPress={onLongPress}>
      {/* Category accent — uses borderLeftWidth instead of absolute positioned strip
          to avoid overflow:hidden clipping the corner radius */}
      <View style={[styles.accentBar, { backgroundColor: accentColor }]} />

      <View style={styles.content}>
        {/* Left: text info */}
        <View style={styles.info}>
          <Text style={styles.dateStr}>{dateStr}</Text>
          <Text style={styles.title} numberOfLines={2}>{document.title}</Text>
          <Text style={styles.category}>{CATEGORY_LABELS[document.category]}</Text>

          <View style={styles.footerRow}>
            {document.isFavorite && (
              <View style={styles.favPill}>
                <Text style={styles.favPillText}>★ Saved</Text>
              </View>
            )}
            {document.ocrStatus === 'done' && document.ocrText && (
              <View style={styles.ocrPill}>
                <Text style={styles.ocrPillText}>📝 Text</Text>
              </View>
            )}
            <Text style={styles.fileSize}>{formatBytes(document.fileSizeBytes)}</Text>
          </View>
        </View>

        {/* Right: thumbnail — always reserves 68px so cards align */}
        <View style={styles.thumbContainer}>
          {document.thumbnailUri ? (
            <Image
              source={{ uri: document.thumbnailUri }}
              style={styles.thumb}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.thumbPlaceholder, { backgroundColor: accentColor + '22' }]}>
              <Text style={styles.thumbPlaceholderEmoji}>
                {document.mimeType.includes('pdf') ? '📄' : '🖼️'}
              </Text>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
}

function formatBytes(bytes: number): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

const styles = StyleSheet.create({
  // ── Full card ──────────────────────────────────────────────────
  card: {
    backgroundColor: C.ink2,
    borderRadius: R.lg,
    flexDirection: 'row',
    overflow: 'visible', // no longer clipped — accent bar uses borderLeftWidth
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  accentBar: {
    width: 3,
    borderTopLeftRadius: R.lg,
    borderBottomLeftRadius: R.lg,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    padding: S[3],
    gap: S[3],
  },
  info: { flex: 1 },
  dateStr: {
    fontSize: T.xs,
    color: C.ink4,
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  title: {
    fontSize: T.base,
    fontWeight: '600',
    color: C.cream,
    marginBottom: S[1],
    lineHeight: T.base * 1.3,
  },
  category: {
    fontSize: T.sm,
    color: C.ash,
    marginBottom: S[2],
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: S[2],
  },
  favPill: {
    backgroundColor: C.amberDim,
    borderRadius: R.full,
    paddingHorizontal: S[2],
    paddingVertical: 2,
    minHeight: 20,
    justifyContent: 'center',
  },
  favPillText: { fontSize: T.xs, color: C.amber, fontWeight: '600' },
  ocrPill: {
    backgroundColor: C.ink3,
    borderRadius: R.full,
    paddingHorizontal: S[2],
    paddingVertical: 2,
    minHeight: 20,
    justifyContent: 'center',
  },
  ocrPillText: { fontSize: T.xs, color: C.ash },
  fileSize: { fontSize: T.xs, color: C.ink4 },
  thumbContainer: {
    width: 68,
    height: 68,
    borderRadius: R.md,
    overflow: 'hidden',
    alignSelf: 'center',
  },
  thumb: { width: 68, height: 68 },
  thumbPlaceholder: {
    width: 68, height: 68,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbPlaceholderEmoji: { fontSize: 28 },

  // ── Compact card ──────────────────────────────────────────────
  compactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: S[3],
    gap: S[3],
  },
  compactThumb: {
    width: 44, height: 44,
    borderRadius: R.md,
    overflow: 'hidden',
  },
  compactThumbImage: { width: 44, height: 44 },
  compactThumbPlaceholder: {
    width: 44, height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactThumbEmoji: { fontSize: 22 },
  compactInfo: { flex: 1 },
  compactTitle: {
    fontSize: T.base,
    fontWeight: '600',
    color: C.cream,
    marginBottom: 2,
  },
  compactMeta: { fontSize: T.sm, color: C.ash },
  favStar: { fontSize: T.base, color: C.amber },
});
