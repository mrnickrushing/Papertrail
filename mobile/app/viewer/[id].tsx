/**
 * viewer/[id].tsx — Full document viewer (Phase 4)
 *
 * Images: pinch-to-zoom via ScrollView.
 * PDFs:   react-native-pdf with page navigation + zoom, wrapped in a
 *         try/require so the file compiles in Expo Go.  When the native
 *         module isn't linked (Expo Go) a clear "requires development build"
 *         notice is shown instead of crashing.
 *
 * Header: title edit, favorite toggle, share (expo-sharing), delete.
 * Footer: expandable OCR text panel.
 */

import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  Pressable,
  StyleSheet,
  Alert,
  TextInput,
  ActivityIndicator,
  Dimensions,
  Modal,
  Platform,
  Animated,
  PanResponder,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import { useDocumentStore } from '@/store/documentStore';
import { shareDocument } from '@/services/exportService';
import { TagEditor } from '@/components/TagEditor';
import { C, T, R, S } from '@/theme/tokens';
import type { DocumentCategory } from '@/types/document';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// Attempt to load react-native-pdf.  The require() will throw in Expo Go
// because the native module is missing.  We catch and set to null.
let RNPdf: React.ComponentType<any> | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  RNPdf = require('react-native-pdf').default;
} catch {
  RNPdf = null;
}

const IS_EXPO_GO =
  Constants.executionEnvironment === 'storeClient' ||
  (Constants as any).appOwnership === 'expo';

const CATEGORY_LABELS: Record<DocumentCategory, string> = {
  receipt: '🧾 Receipt',
  contract: '📝 Contract',
  id: '🪪 ID',
  warranty: '🛡️ Warranty',
  medical: '🏥 Medical',
  tax: '💰 Tax',
  other: '📁 Other',
};

const CATEGORIES: DocumentCategory[] = [
  'receipt', 'contract', 'id', 'warranty', 'medical', 'tax', 'other',
];

export default function DocumentViewerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();

  const document = useDocumentStore(s => s.getDocument(id));
  const updateDocument = useDocumentStore(s => s.updateDocument);
  const updateDocumentTags = useDocumentStore(s => s.updateDocumentTags);
  const allDocumentTags = useDocumentStore(s => {
    const tagSet = new Set<string>();
    for (const doc of s.documents) for (const tag of doc.tags) tagSet.add(tag);
    return Array.from(tagSet).sort();
  });
  const deleteDocument = useDocumentStore(s => s.deleteDocument);
  const toggleFavorite = useDocumentStore(s => s.toggleFavorite);

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState(document?.title ?? '');
  const [showOCR, setShowOCR] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showTagEditor, setShowTagEditor] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  // PDF-specific state
  const [pdfPage, setPdfPage] = useState(1);
  const [pdfTotal, setPdfTotal] = useState(document?.pageCount ?? 1);
  const [pdfError, setPdfError] = useState<string | null>(null);

  const titleInputRef = useRef<TextInput>(null);

  // Swipe-to-dismiss: downward pan dismisses viewer
  const swipeY = useRef(new Animated.Value(0)).current;
  const dismissPan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) =>
        !isEditingTitle && g.dy > 12 && Math.abs(g.dy) > Math.abs(g.dx) * 1.5,
      onPanResponderMove: (_, g) => {
        if (g.dy > 0) swipeY.setValue(g.dy);
      },
      onPanResponderRelease: (_, g) => {
        if (g.dy > 100 || g.vy > 0.8) {
          Animated.timing(swipeY, { toValue: SCREEN_H, duration: 200, useNativeDriver: true }).start(
            () => router.canGoBack() ? router.back() : router.replace('/(tabs)/')
          );
        } else {
          Animated.spring(swipeY, { toValue: 0, useNativeDriver: true }).start();
        }
      },
      onPanResponderTerminate: () => {
        Animated.spring(swipeY, { toValue: 0, useNativeDriver: true }).start();
      },
    })
  ).current;

  const handleSaveTitle = useCallback(() => {
    if (!document) return;
    const trimmed = editTitle.trim();
    if (trimmed && trimmed !== document.title) {
      updateDocument(document.id, { title: trimmed });
    } else {
      setEditTitle(document.title);
    }
    setIsEditingTitle(false);
  }, [document, editTitle, updateDocument]);

  const handleShare = useCallback(async () => {
    if (!document || isSharing) return;
    setIsSharing(true);
    try {
      await shareDocument(document);
    } catch (err: any) {
      Alert.alert('Share Failed', err?.message ?? 'Could not share this document.');
    } finally {
      setIsSharing(false);
    }
  }, [document, isSharing]);

  const handleDelete = useCallback(() => {
    if (!document) return;
    Alert.alert(
      'Delete Document',
      `"${document.title}" will be permanently deleted. This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            await deleteDocument(document.id);
            router.replace('/(tabs)/');
          },
        },
      ],
    );
  }, [document, deleteDocument]);

  const handleCategorySelect = useCallback((cat: DocumentCategory) => {
    if (!document) return;
    updateDocument(document.id, { category: cat });
    setShowCategoryPicker(false);
  }, [document, updateDocument]);

  if (!document) {
    return (
      <View style={[styles.notFound, { paddingTop: insets.top }]}>
        <Text style={styles.notFoundText}>Document not found.</Text>
        <Pressable onPress={() => router.back()} style={styles.backLink}>
          <Text style={styles.backLinkText}>← Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const isPDF = document.mimeType.includes('pdf');

  return (
    <Animated.View
      style={[styles.container, { paddingTop: insets.top, transform: [{ translateY: swipeY }] }]}
      {...dismissPan.panHandlers}
    >
      {/* ── Header ── */}
      <View style={styles.header}>
        <Pressable style={styles.headerBtn} onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)/')} hitSlop={8}>
          <Text style={styles.headerBtnText}>‹</Text>
        </Pressable>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>{document.title}</Text>
          <View style={styles.headerCategoryBadge}>
            <Text style={styles.headerCategoryText}>
              {CATEGORY_LABELS[document.category]}
            </Text>
          </View>
        </View>

        <View style={styles.headerActions}>
          <Pressable
            style={styles.headerIconBtn}
            onPress={() => toggleFavorite(document.id)}
            hitSlop={8}
          >
            <Text style={[styles.headerIcon, document.isFavorite && { color: C.amber }]}>
              {document.isFavorite ? '★' : '☆'}
            </Text>
          </Pressable>
          <Pressable style={styles.headerIconBtn} onPress={handleShare} hitSlop={8}>
            {isSharing
              ? <ActivityIndicator size="small" color={C.amber} />
              : <Text style={styles.headerIcon}>↑</Text>
            }
          </Pressable>
          <Pressable style={styles.headerIconBtn} onPress={handleDelete} hitSlop={8}>
            <Text style={[styles.headerIcon, { color: C.danger }]}>🗑</Text>
          </Pressable>
        </View>
      </View>

      {/* ── Scrollable content ── */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: insets.bottom + S[8] }}
        showsVerticalScrollIndicator={false}
      >
        {/* Document preview */}
        <View style={styles.previewCard}>
          {!isPDF ? (
            <ScrollView
              maximumZoomScale={4}
              minimumZoomScale={1}
              showsHorizontalScrollIndicator={false}
              showsVerticalScrollIndicator={false}
              centerContent
              style={styles.zoomScroll}
            >
              <Image
                source={{ uri: document.fileUri }}
                style={styles.previewImage}
                resizeMode="contain"
              />
            </ScrollView>
          ) : (
            <PDFViewer
              uri={document.fileUri}
              page={pdfPage}
              totalPages={pdfTotal}
              error={pdfError}
              onPageChange={setPdfPage}
              onLoadComplete={(total) => {
                setPdfTotal(total);
                updateDocument(document.id, { pageCount: total });
              }}
              onError={(msg) => setPdfError(msg)}
            />
          )}
        </View>

        {/* ── Title ── */}
        <View style={styles.metaSection}>
          <Pressable
            onPress={() => {
              setIsEditingTitle(true);
              setTimeout(() => titleInputRef.current?.focus(), 50);
            }}
            style={styles.titleRow}
          >
            {isEditingTitle ? (
              <TextInput
                ref={titleInputRef}
                style={styles.titleInput}
                value={editTitle}
                onChangeText={setEditTitle}
                onBlur={handleSaveTitle}
                onSubmitEditing={handleSaveTitle}
                returnKeyType="done"
                maxLength={120}
                autoCorrect={false}
              />
            ) : (
              <>
                <Text style={styles.docTitle} numberOfLines={2}>{document.title}</Text>
                <Text style={styles.editHint}>✎</Text>
              </>
            )}
          </Pressable>

          {/* Category */}
          <Pressable
            style={styles.categoryRow}
            onPress={() => setShowCategoryPicker(true)}
          >
            <Text style={styles.categoryLabel}>
              {CATEGORY_LABELS[document.category]}
            </Text>
            <Text style={styles.categoryChevron}>›</Text>
          </Pressable>

          {/* Meta chips */}
          <View style={styles.metaRow}>
            <MetaChip label={formatBytes(document.fileSizeBytes)} />
            <MetaChip label={new Date(document.createdAt).toLocaleDateString('en-US', {
              month: 'short', day: 'numeric', year: 'numeric',
            })} />
            {isPDF && <MetaChip label={`${pdfTotal} ${pdfTotal === 1 ? 'page' : 'pages'}`} />}
            {document.isFavorite && <MetaChip label="★ Favorited" amber />}
          </View>

          {/* Tags */}
          <Pressable style={styles.tagsRow} onPress={() => setShowTagEditor(true)}>
            {document.tags.length > 0 ? (
              <>
                {document.tags.map(tag => (
                  <View key={tag} style={styles.tagChip}>
                    <Text style={styles.tagChipText}>#{tag}</Text>
                  </View>
                ))}
                <View style={styles.tagAddChip}>
                  <Text style={styles.tagAddText}>✎</Text>
                </View>
              </>
            ) : (
              <View style={styles.tagAddChip}>
                <Text style={styles.tagAddText}>+ Add tags</Text>
              </View>
            )}
          </Pressable>
        </View>

        {/* ── OCR Panel ── */}
        {(document.ocrText || document.ocrStatus === 'pending') && (
          <View style={styles.ocrSection}>
            <Pressable
              style={styles.ocrHeader}
              onPress={() => setShowOCR(v => !v)}
            >
              <Text style={styles.ocrTitle}>
                {document.ocrStatus === 'pending' ? '⏳ Extracting text…' : '📝 Extracted Text'}
              </Text>
              <Text style={styles.ocrChevron}>{showOCR ? '▲' : '▼'}</Text>
            </Pressable>
            {showOCR && document.ocrText && (
              <ScrollView
                style={styles.ocrBody}
                nestedScrollEnabled
                showsVerticalScrollIndicator
              >
                <Text style={styles.ocrText} selectable>
                  {document.ocrText}
                </Text>
              </ScrollView>
            )}
          </View>
        )}
      </ScrollView>

      {/* ── Tag Editor ── */}
      <TagEditor
        visible={showTagEditor}
        initialTags={document.tags}
        allTags={allDocumentTags}
        onConfirm={(tags) => {
          updateDocumentTags(document.id, tags);
          setShowTagEditor(false);
        }}
        onCancel={() => setShowTagEditor(false)}
      />

      {/* ── Category Picker Modal ── */}
      <Modal
        visible={showCategoryPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCategoryPicker(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setShowCategoryPicker(false)}
        >
          <Pressable
            style={[styles.categorySheet, { paddingBottom: insets.bottom + S[4] }]}
            onPress={() => {}}
          >
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Change Category</Text>
            {CATEGORIES.map(cat => (
              <Pressable
                key={cat}
                style={[
                  styles.categoryOption,
                  document.category === cat && styles.categoryOptionSelected,
                ]}
                onPress={() => handleCategorySelect(cat)}
              >
                <Text style={[
                  styles.categoryOptionText,
                  document.category === cat && styles.categoryOptionTextSelected,
                ]}>
                  {CATEGORY_LABELS[cat]}
                </Text>
                {document.category === cat && (
                  <Text style={styles.categoryCheck}>✓</Text>
                )}
              </Pressable>
            ))}
          </Pressable>
        </Pressable>
      </Modal>

      {isDeleting && (
        <View style={styles.deletingOverlay}>
          <ActivityIndicator color={C.amber} size="large" />
        </View>
      )}
    </Animated.View>
  );
}

// ─── PDF Viewer sub-component ──────────────────────────────────────────────────

interface PDFViewerProps {
  uri: string;
  page: number;
  totalPages: number;
  error: string | null;
  onPageChange: (page: number) => void;
  onLoadComplete: (total: number) => void;
  onError: (msg: string) => void;
}

function PDFViewer({
  uri, page, totalPages, error, onPageChange, onLoadComplete, onError,
}: PDFViewerProps) {
  const [loading, setLoading] = useState(true);

  // Show friendly notice in Expo Go or if the module didn't load.
  if (IS_EXPO_GO || !RNPdf) {
    return (
      <View style={pdfStyles.placeholder}>
        <Text style={pdfStyles.icon}>📄</Text>
        <Text style={pdfStyles.title}>PDF Viewer</Text>
        <Text style={pdfStyles.subtitle}>
          Native PDF viewing requires a development build.{'\n'}
          Run{' '}
          <Text style={pdfStyles.code}>eas build --profile development</Text>
          {'\n'}then install the build on your device.
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={pdfStyles.placeholder}>
        <Text style={pdfStyles.icon}>⚠️</Text>
        <Text style={pdfStyles.title}>Could not open PDF</Text>
        <Text style={pdfStyles.subtitle}>{error}</Text>
      </View>
    );
  }

  const Pdf = RNPdf!;

  return (
    <View style={pdfStyles.container}>
      {loading && (
        <View style={pdfStyles.loadingOverlay}>
          <ActivityIndicator size="large" color={C.amber} />
        </View>
      )}

      <Pdf
        source={{ uri, cache: true }}
        page={page}
        style={pdfStyles.pdf}
        enablePaging
        horizontal={false}
        onLoadComplete={(numberOfPages: number) => {
          setLoading(false);
          onLoadComplete(numberOfPages);
        }}
        onPageChanged={(p: number) => onPageChange(p)}
        onError={(err: any) => {
          setLoading(false);
          onError(err?.message ?? 'Unknown error');
        }}
        trustAllCerts={false}
      />

      {/* Floating page counter overlay */}
      {totalPages > 1 && (
        <View style={pdfStyles.pageOverlay}>
          <Pressable
            style={[pdfStyles.pageBtn, page <= 1 && pdfStyles.pageBtnDisabled]}
            onPress={() => onPageChange(Math.max(1, page - 1))}
            disabled={page <= 1}
            hitSlop={8}
          >
            <Text style={pdfStyles.pageBtnText}>‹</Text>
          </Pressable>
          <Text style={pdfStyles.pageLabel}>
            {page} / {totalPages}
          </Text>
          <Pressable
            style={[pdfStyles.pageBtn, page >= totalPages && pdfStyles.pageBtnDisabled]}
            onPress={() => onPageChange(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages}
            hitSlop={8}
          >
            <Text style={pdfStyles.pageBtnText}>›</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

// ── Shared helper components ───────────────────────────────────────────────────

function MetaChip({ label, amber }: { label: string; amber?: boolean }) {
  return (
    <View style={[styles.metaChip, amber && styles.metaChipAmber]}>
      <Text style={[styles.metaChipText, amber && styles.metaChipTextAmber]}>
        {label}
      </Text>
    </View>
  );
}

function formatBytes(bytes: number): string {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ── Styles ────────────────────────────────────────────────────────────────────

const PDF_HEIGHT = SCREEN_H * 0.55;

const pdfStyles = StyleSheet.create({
  container: {
    width: '100%',
    height: PDF_HEIGHT,
  },
  pdf: {
    flex: 1,
    width: '100%',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.ink2,
    zIndex: 1,
  },
  placeholder: {
    height: 240,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: S[6],
    gap: S[3],
  },
  icon: { fontSize: 48 },
  title: { fontSize: T.base, color: C.ash, fontWeight: '600', textAlign: 'center' },
  subtitle: {
    fontSize: T.sm,
    color: C.ink4,
    textAlign: 'center',
    lineHeight: 20,
  },
  code: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    color: C.amber,
  },
  pageOverlay: {
    position: 'absolute',
    bottom: S[3],
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: S[3],
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderRadius: R.full,
    paddingHorizontal: S[3],
    paddingVertical: S[1],
  },
  pageBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.ink3,
    borderRadius: R.md,
  },
  pageBtnDisabled: { opacity: 0.35 },
  pageBtnText: { fontSize: T.xl, color: C.cream, lineHeight: T.xl + 4 },
  pageLabel: { fontSize: T.sm, color: C.ash, minWidth: 60, textAlign: 'center' },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.ink1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: S[4],
    paddingVertical: S[3],
    borderBottomWidth: 1,
    borderBottomColor: C.ink3,
  },
  headerBtn: { minHeight: 44, justifyContent: 'center', paddingRight: S[3], width: 36 },
  headerBtnText: { fontSize: T.xl, color: C.amber, fontWeight: '400' },
  headerCenter: { flex: 1, alignItems: 'center', gap: 2 },
  headerTitle: { fontSize: T.base, fontWeight: '600', color: C.cream, maxWidth: 180 },
  headerCategoryBadge: {
    backgroundColor: C.ink3,
    borderRadius: R.full,
    paddingHorizontal: S[2],
    paddingVertical: 1,
  },
  headerCategoryText: { fontSize: T.xs, color: C.ash },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: S[1] },
  headerIconBtn: {
    width: 44, height: 44,
    alignItems: 'center', justifyContent: 'center',
  },
  headerIcon: { fontSize: 20, color: C.ash },
  scroll: { flex: 1 },
  previewCard: {
    margin: S[4],
    borderRadius: R.xl,
    overflow: 'hidden',
    backgroundColor: C.ink2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  zoomScroll: {
    width: '100%',
    height: SCREEN_H * 0.5,
  },
  previewImage: {
    width: SCREEN_W - S[8],
    height: SCREEN_H * 0.5,
  },
  metaSection: { paddingHorizontal: S[4], gap: S[3] },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: S[2],
    minHeight: 44,
  },
  docTitle: {
    flex: 1,
    fontSize: T.xl,
    fontWeight: '700',
    color: C.cream,
    lineHeight: T.xl * 1.25,
  },
  editHint: { fontSize: T.base, color: C.ink4, marginTop: 4 },
  titleInput: {
    flex: 1,
    fontSize: T.xl,
    fontWeight: '700',
    color: C.cream,
    borderBottomWidth: 1,
    borderBottomColor: C.amber,
    paddingVertical: S[1],
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.ink2,
    borderRadius: R.md,
    paddingHorizontal: S[4],
    paddingVertical: S[3],
    minHeight: 48,
  },
  categoryLabel: { flex: 1, fontSize: T.base, color: C.cream },
  categoryChevron: { fontSize: T.lg, color: C.ash },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: S[2] },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: S[2],
    paddingTop: S[1],
  },
  tagChip: {
    backgroundColor: C.amberDim,
    borderRadius: R.full,
    paddingHorizontal: S[3],
    paddingVertical: S[1],
  },
  tagChipText: { fontSize: T.xs, color: C.amber, fontWeight: '600' },
  tagAddChip: {
    backgroundColor: C.ink3,
    borderRadius: R.full,
    paddingHorizontal: S[3],
    paddingVertical: S[1],
    borderWidth: 1,
    borderColor: C.ink4,
    borderStyle: 'dashed',
  },
  tagAddText: { fontSize: T.xs, color: C.ash },
  metaChip: {
    backgroundColor: C.ink3,
    borderRadius: R.full,
    paddingHorizontal: S[3],
    paddingVertical: S[1],
  },
  metaChipAmber: { backgroundColor: C.amberDim },
  metaChipText: { fontSize: T.xs, color: C.ash },
  metaChipTextAmber: { color: C.amber },
  ocrSection: {
    marginHorizontal: S[4],
    marginTop: S[4],
    backgroundColor: C.ink2,
    borderRadius: R.lg,
    overflow: 'hidden',
  },
  ocrHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: S[4],
    paddingVertical: S[3],
    minHeight: 48,
  },
  ocrTitle: { flex: 1, fontSize: T.sm, fontWeight: '600', color: C.ash },
  ocrChevron: { fontSize: T.sm, color: C.ink4 },
  ocrBody: { maxHeight: 200, paddingHorizontal: S[4], paddingBottom: S[4] },
  ocrText: { fontSize: T.sm, color: C.ash, lineHeight: 20 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  categorySheet: {
    backgroundColor: C.ink2,
    borderTopLeftRadius: R.xl,
    borderTopRightRadius: R.xl,
    paddingTop: S[3],
    paddingHorizontal: S[4],
  },
  sheetHandle: {
    width: 40, height: 4,
    borderRadius: R.full,
    backgroundColor: C.ink4,
    alignSelf: 'center',
    marginBottom: S[4],
  },
  sheetTitle: {
    fontSize: T.lg, fontWeight: '600',
    color: C.cream,
    textAlign: 'center',
    marginBottom: S[3],
  },
  categoryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: S[4],
    paddingHorizontal: S[2],
    borderBottomWidth: 1,
    borderBottomColor: C.ink3,
    minHeight: 56,
  },
  categoryOptionSelected: { backgroundColor: C.amberDim },
  categoryOptionText: { flex: 1, fontSize: T.base, color: C.cream },
  categoryOptionTextSelected: { color: C.amber, fontWeight: '600' },
  categoryCheck: { fontSize: T.base, color: C.amber },
  deletingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notFound: {
    flex: 1, backgroundColor: C.ink1,
    alignItems: 'center', justifyContent: 'center', gap: S[4],
  },
  notFoundText: { fontSize: T.lg, color: C.ash },
  backLink: { minHeight: 44, justifyContent: 'center' },
  backLinkText: { fontSize: T.base, color: C.amber },
});
