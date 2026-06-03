/**
 * DocumentCard.tsx — Reusable document card component (UI overhaul)
 *
 * Changes:
 *   - Category dot replaces side accent bar
 *   - OCR status badge: pulsing dot (processing), ⚠ (failed), hidden (done/none)
 *   - Compact mode preserved for search results
 *   - Animated checkbox spring on selection mode enter
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
  receipt: 'Receipt',
  contract: 'Contract',
  id: 'ID',
  warranty: 'Warranty',
  medical: 'Medical',
  tax: 'Tax',
  other: 'Other',
};

const CATEGORY_COLORS: Record<DocumentCategory, string> = {
  receipt:  C.category.receipt,
  contract: C.category.contract,
  id:       C.category.id,
  warranty: C.category.warranty,
  medical:  C.category.medical,
  tax:      C.category.tax,
  other:    C.category.other,
};

interface DocumentCardProps {
  document: Document;
  compact?: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
  selectionMode?: boolean;
  isSelected?: boolean;
}

export function DocumentCard({
  document,
  compact = false,
  onPress,
  onLongPress,
  selectionMode = false,
  isSelected = false,
}: DocumentCardProps) {
  const accentColor = CATEGORY_COLORS[document.category];

  const dateStr = new Date(document.createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const a11yLabel = `${document.title}, ${CATEGORY_LABELS[document.category]}${document.isFavorite ? ', favorited' : ''}${isSelected ? ', selected' : ''}`;

  if (compact) {
    return (
      <Pressable
        style={styles.compactCard}
        onPress={onPress}
        onLongPress={onLongPress}
        accessible
        accessibilityLabel={a11yLabel}
        accessibilityRole="button"
        accessibilityState={{ selected: isSelected }}
      >
        {selectionMode && (
          <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
            {isSelected && <Text style={styles.checkmark}>✓</Text>}
          </View>
        )}
        <View style={styles.compactThumb}>
          {document.thumbnailUri ? (
            <Image source={{ uri: document.thumbnailUri }} style={styles.compactThumbImage} resizeMode="cover" />
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
          <View style={styles.compactMeta}>
            <View style={[styles.categoryDot, { backgroundColor: accentColor }]} />
            <Text style={styles.compactMetaText}>{CATEGORY_LABELS[document.category]} · {dateStr}</Text>
          </View>
        </View>
        {document.isFavorite && <Text style={styles.favStar}>★</Text>}
      </Pressable>
    );
  }

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        isSelected && styles.cardSelected,
        pressed && styles.cardPressed,
      ]}
      onPress={onPress}
      onLongPress={onLongPress}
      accessible
      accessibilityLabel={a11yLabel}
      accessibilityRole="button"
      accessibilityState={{ selected: isSelected }}
      accessibilityHint={selectionMode ? 'Double tap to toggle selection' : 'Double tap to open document'}
    >
      <View style={styles.content}>
        {/* Left: checkbox (selection) or category dot */}
        <View style={styles.leftCol}>
          {selectionMode ? (
            <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
              {isSelected && <Text style={styles.checkmark}>✓</Text>}
            </View>
          ) : (
            <View style={[styles.categoryDotLarge, { backgroundColor: accentColor }]} />
          )}
        </View>

        {/* Center: text */}
        <View style={styles.info}>
          <View style={styles.titleRow}>
            <Text style={styles.title} numberOfLines={2}>{document.title}</Text>
            {document.ocrStatus === 'processing' && (
              <View style={styles.ocrBadge}>
                <View style={styles.ocrDot} />
              </View>
            )}
            {document.ocrStatus === 'failed' && (
              <Text style={styles.ocrFailed}>⚠</Text>
            )}
          </View>

          <View style={styles.metaRow}>
            <Text style={[styles.categoryLabel, { color: accentColor }]}>
              {CATEGORY_LABELS[document.category]}
            </Text>
            <Text style={styles.metaSep}>·</Text>
            <Text style={styles.dateStr}>{dateStr}</Text>
          </View>

          <View style={styles.footerRow}>
            {document.isFavorite && (
              <View style={styles.favPill}>
                <Text style={styles.favPillText}>★ Saved</Text>
              </View>
            )}
            {document.tags.slice(0, 2).map((tag) => (
              <View key={tag} style={styles.tagPill}>
                <Text style={styles.tagPillText}>#{tag}</Text>
              </View>
            ))}
            {document.tags.length > 2 && (
              <View style={styles.tagPill}>
                <Text style={styles.tagPillText}>+{document.tags.length - 2}</Text>
              </View>
            )}
            <Text style={styles.fileSize}>{formatBytes(document.fileSizeBytes)}</Text>
          </View>
        </View>

        {/* Right: thumbnail */}
        <View style={styles.thumbContainer}>
          {document.thumbnailUri ? (
            <Image source={{ uri: document.thumbnailUri }} style={styles.thumb} resizeMode="cover" />
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
  card: {
    backgroundColor: C.ink2,
    borderRadius: R.lg,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.14,
    shadowRadius: 8,
    elevation: 4,
  },
  cardSelected: {
    borderWidth: 1.5,
    borderColor: C.amber,
  },
  cardPressed: {
    opacity: 0.85,
  },
  content: {
    flexDirection: 'row',
    padding: S[3],
    gap: S[3],
    alignItems: 'center',
  },
  leftCol: {
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 2,
    width: 24,
  },
  categoryDotLarge: {
    width: 10,
    height: 10,
    borderRadius: R.full,
    marginTop: 6,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: R.full,
    borderWidth: 2,
    borderColor: C.ink4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: C.amber,
    borderColor: C.amber,
  },
  checkmark: {
    fontSize: 12,
    fontWeight: '700',
    color: C.ink1,
  },
  info: { flex: 1 },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: S[2],
    marginBottom: 3,
  },
  title: {
    flex: 1,
    fontSize: T.base,
    fontWeight: '600',
    color: C.cream,
    lineHeight: T.base * 1.3,
  },
  ocrBadge: {
    marginTop: 4,
    width: 8,
    height: 8,
    borderRadius: R.full,
    backgroundColor: C.amber + '44',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ocrDot: {
    width: 4,
    height: 4,
    borderRadius: R.full,
    backgroundColor: C.amber,
  },
  ocrFailed: {
    fontSize: T.sm,
    color: C.danger,
    marginTop: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S[1],
    marginBottom: S[2],
  },
  categoryLabel: {
    fontSize: T.sm,
    fontWeight: '600',
  },
  metaSep: {
    fontSize: T.sm,
    color: C.ink4,
  },
  dateStr: {
    fontSize: T.sm,
    color: C.ash,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: S[1],
  },
  favPill: {
    backgroundColor: C.amberDim,
    borderRadius: R.full,
    paddingHorizontal: S[2],
    paddingVertical: 2,
  },
  favPillText: { fontSize: T.xs, color: C.amber, fontWeight: '600' },
  tagPill: {
    backgroundColor: C.ink3,
    borderRadius: R.full,
    paddingHorizontal: S[2],
    paddingVertical: 2,
  },
  tagPillText: { fontSize: T.xs, color: C.ash },
  fileSize: { fontSize: T.xs, color: C.ink4, marginLeft: 'auto' },
  thumbContainer: {
    width: 68,
    height: 68,
    borderRadius: R.md,
    overflow: 'hidden',
    alignSelf: 'center',
    flexShrink: 0,
  },
  thumb: { width: 68, height: 68 },
  thumbPlaceholder: {
    width: 68, height: 68,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbPlaceholderEmoji: { fontSize: 28 },

  // ── Compact ──────────────────────────────────────────────────
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
    marginBottom: 3,
  },
  compactMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S[1],
  },
  categoryDot: {
    width: 7,
    height: 7,
    borderRadius: R.full,
  },
  compactMetaText: { fontSize: T.sm, color: C.ash },
  favStar: { fontSize: T.base, color: C.amber },
});
