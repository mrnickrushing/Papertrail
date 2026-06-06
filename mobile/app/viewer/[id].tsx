/**
 * viewer/[id].tsx — Full document viewer (Phase 4)
 *
 * Images: pinch-to-zoom via ScrollView.
 * PDFs:   Placeholder viewer. Native PDF rendering was removed from the
 *         production build until a stable Expo-compatible renderer is added.
 *
 * Header: title edit, favorite toggle, share (expo-sharing), delete.
 * Footer: expandable OCR text panel.
 */

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
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
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import * as FileSystem from 'expo-file-system';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDocumentStore } from '@/store/documentStore';
import { useProStore } from '@/store/proStore';
import { shareDocument } from '@/services/exportService';
import { apiRequest, isBackendConfigured } from '@/services/api';
import { TagEditor } from '@/components/TagEditor';
import { FolderPickerModal } from '@/components/FolderPickerModal';
import { PaywallModal } from '@/components/PaywallModal';
import { C, T, R, S } from '@/theme/tokens';
import type { DocumentCategory, Folder } from '@/types/document';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}

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

function tokenize(value: string): string[] {
  return value
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 1);
}

function suggestFolderId(
  folders: Folder[],
  input: {
    title: string;
    category: DocumentCategory;
    tags: string[];
    ocrText?: string;
  },
): string | null {
  if (folders.length === 0) return null;

  const contextTokens = new Set([
    ...tokenize(input.title),
    ...tokenize(input.category),
    ...input.tags.flatMap(tokenize),
    ...tokenize(input.ocrText?.slice(0, 600) ?? ''),
  ]);

  let bestFolderId: string | null = null;
  let bestScore = 0;

  for (const folder of folders) {
    const folderTokens = tokenize(folder.name);
    const folderName = folder.name.toLowerCase();
    let score = 0;

    for (const token of folderTokens) {
      if (contextTokens.has(token)) {
        score += token.length >= 5 ? 4 : 2;
      }
    }

    if (input.title.toLowerCase().includes(folderName)) score += 5;
    if (input.tags.some((tag) => tag.toLowerCase().includes(folderName))) score += 4;

    if (score > bestScore) {
      bestScore = score;
      bestFolderId = folder.id;
    }
  }

  return bestScore > 0 ? bestFolderId : null;
}

export default function DocumentViewerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();

  const document = useDocumentStore(s => s.getDocument(id));
  const folders = useDocumentStore(s => s.folders);
  const updateDocument = useDocumentStore(s => s.updateDocument);
  const updateDocumentTags = useDocumentStore(s => s.updateDocumentTags);
  const moveDocumentToFolder = useDocumentStore(s => s.moveDocumentToFolder);
  const addFolder = useDocumentStore(s => s.addFolder);
  const allDocuments = useDocumentStore(s => s.documents);
  const allDocumentTags = useMemo(() => {
    const tagSet = new Set<string>();
    for (const doc of allDocuments) for (const tag of doc.tags) tagSet.add(tag);
    return Array.from(tagSet).sort();
  }, [allDocuments]);
  const deleteDocument = useDocumentStore(s => s.deleteDocument);
  const toggleFavorite = useDocumentStore(s => s.toggleFavorite);
  const isPro = useProStore(s => s.isPro);
  const checkPro = useProStore(s => s.checkPro);

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  // Ref so title editing state can be read without stale closure
  const isEditingTitleRef = useRef(false);
  const [editTitle, setEditTitle] = useState(document?.title ?? '');
  const [showOCR, setShowOCR] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showTagEditor, setShowTagEditor] = useState(false);
  const [showFolderPicker, setShowFolderPicker] = useState(false);
  const isMounted = useRef(true);
  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);
  useEffect(() => {
    isEditingTitleRef.current = isEditingTitle;
  }, [isEditingTitle]);

  // Keep editTitle in sync if document is renamed externally (e.g. AI Organize)
  // while the title input is not focused.
  useEffect(() => {
    if (!isEditingTitle && document?.title) {
      setEditTitle(document.title);
    }
  }, [document?.title, isEditingTitle]);
  const [showPaywall, setShowPaywall] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [isAiOrganizing, setIsAiOrganizing] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(null);

  // PDF-specific state
  const [pdfPage, setPdfPage] = useState(1);
  const [pdfTotal] = useState(document?.pageCount ?? 1);

  const titleInputRef = useRef<TextInput>(null);


  const handleSaveTitle = useCallback(() => {
    if (!document) return;
    const trimmed = editTitle.trim();
    if (trimmed && trimmed !== document.title) {
      updateDocument(document.id, { title: trimmed });
    } else {
      setEditTitle(document.title);
    }
    isEditingTitleRef.current = false;
    setIsEditingTitle(false);
  }, [document, editTitle, updateDocument]);

  const handleShare = useCallback(async () => {
    if (!document || isSharing) return;
    setIsSharing(true);
    try {
      await shareDocument(document);
    } catch (err: unknown) {
      Alert.alert('Share Failed', errorMessage(err, 'Could not share this document.'));
    } finally {
      if (isMounted.current) setIsSharing(false);
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
            if (isMounted.current) setIsDeleting(false);
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

  const handleFolderSelect = useCallback((folderId: string | null) => {
    if (!document) return;
    moveDocumentToFolder(document.id, folderId);
    setShowFolderPicker(false);
  }, [document, moveDocumentToFolder]);

  const handleAiOrganize = useCallback(async () => {
    if (!document || isAiOrganizing) return;

    if (!isPro) {
      setShowPaywall(true);
      return;
    }

    if (!isBackendConfigured()) {
      Alert.alert(
        'AI Unavailable',
        'Configure EXPO_PUBLIC_API_URL and deploy the backend AI service before using AI organize.',
      );
      return;
    }

    setIsAiOrganizing(true);
    setAiSummary(null);

    try {
      const FILE_SIZE_LIMIT = 4 * 1024 * 1024;
      const canReadFile = !!document.fileUri && (document.fileSizeBytes ?? 0) <= FILE_SIZE_LIMIT;

      let pdfBase64: string | undefined;
      let imageBase64: string | undefined;

      if (!document.ocrText && canReadFile) {
        if (document.mimeType === 'application/pdf') {
          try {
            pdfBase64 = await FileSystem.readAsStringAsync(document.fileUri!, {
              encoding: FileSystem.EncodingType.Base64,
            });
          } catch {
            // proceed without it
          }
        } else if (document.mimeType.startsWith('image/')) {
          try {
            imageBase64 = await FileSystem.readAsStringAsync(document.fileUri!, {
              encoding: FileSystem.EncodingType.Base64,
            });
          } catch {
            // proceed without it
          }
        }
      }

      const suggestion = await apiRequest<{
        suggestedTitle: string;
        category: DocumentCategory;
        tags: string[];
        notes: string;
        suggestedFolderName: string;
        source: string;
      }>('/v1/ai/suggest-document', {
        method: 'POST',
        body: {
          title: document.title,
          filename: document.title,
          ocrText: document.ocrText,
          mimeType: document.mimeType,
          pdfBase64,
          imageBase64,
          imageMimeType: imageBase64 ? document.mimeType : undefined,
        },
        timeoutMs: 30000,
      });

      if (!isMounted.current) return;

      const nextTitle = suggestion.suggestedTitle?.trim() || document.title;
      const nextCategory = suggestion.category || document.category;
      const nextTags = Array.isArray(suggestion.tags)
        ? Array.from(new Set(suggestion.tags.map((tag) => tag.trim()).filter(Boolean)))
        : document.tags;
      const nextNotes = typeof suggestion.notes === 'string' ? suggestion.notes : undefined;

      updateDocument(document.id, {
        title: nextTitle,
        category: nextCategory,
        ...(nextNotes ? { notes: nextNotes } : {}),
      });
      updateDocumentTags(document.id, nextTags);

      // Find or create the suggested folder, then move the document into it
      let targetFolder: { id: string; name: string } | null = null;
      if (suggestion.suggestedFolderName) {
        const folderNameLower = suggestion.suggestedFolderName.toLowerCase();
        const existingFolder = folders.find(
          (f) => f.name.toLowerCase() === folderNameLower,
        );
        if (existingFolder) {
          targetFolder = existingFolder;
        } else {
          targetFolder = addFolder(suggestion.suggestedFolderName);
        }
        moveDocumentToFolder(document.id, targetFolder.id);
      } else {
        const suggestedFolderId = suggestFolderId(folders, {
          title: nextTitle,
          category: nextCategory,
          tags: nextTags,
          ocrText: document.ocrText,
        });
        if (suggestedFolderId) {
          targetFolder = folders.find((f) => f.id === suggestedFolderId) ?? null;
          moveDocumentToFolder(document.id, suggestedFolderId);
        }
      }

      const summaryParts: string[] = [];
      if (nextTitle !== document.title) summaryParts.push('renamed');
      if (nextCategory !== document.category) summaryParts.push('categorized');
      const sortedCurrentTags = [...document.tags].sort().join('\0');
      const sortedNextTags = [...nextTags].sort().join('\0');
      if (sortedCurrentTags !== sortedNextTags) summaryParts.push('tagged');
      if (targetFolder && targetFolder.id !== document.folderId) summaryParts.push(`filed in "${targetFolder.name}"`);
      if (nextNotes && nextNotes !== document.notes) summaryParts.push('added notes');
      if (isMounted.current) {
        setAiSummary(
          summaryParts.length > 0
            ? `AI ${summaryParts.join(', ')}.`
            : 'Already organized — no changes needed.',
        );
      }
    } catch (err: unknown) {
      if (isMounted.current) {
        Alert.alert('AI Organize Failed', errorMessage(err, 'Could not analyze this document.'));
      }
    } finally {
      if (isMounted.current) setIsAiOrganizing(false);
    }
  }, [
    addFolder,
    document,
    folders,
    isAiOrganizing,
    isPro,
    moveDocumentToFolder,
    updateDocument,
    updateDocumentTags,
  ]);

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
  const currentFolder = document.folderId
    ? folders.find((folder) => folder.id === document.folderId) ?? null
    : null;

  return (
    <View
      style={[styles.container, { paddingTop: insets.top }]}
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
              style={styles.zoomScroll}
              contentContainerStyle={styles.zoomScrollContent}
              maximumZoomScale={4}
              minimumZoomScale={1}
              showsHorizontalScrollIndicator={false}
              showsVerticalScrollIndicator={false}
              bouncesZoom
              centerContent
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
              onPageChange={setPdfPage}
            />
          )}
        </View>

        {/* ── Title ── */}
        <View style={styles.metaSection}>
          <Pressable
            onPress={() => {
              isEditingTitleRef.current = true;
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
            <MetaChip label={currentFolder?.name ?? 'Unfiled'} />
          </View>

          <View style={styles.organizeCard}>
            <View style={styles.organizeHeader}>
              <View style={styles.organizeTitleWrap}>
                <Text style={styles.organizeTitle}>Smart Organize</Text>
                <Text style={styles.organizeBody}>
                  Use AI to rename, categorize, tag, and suggest a folder for this document.
                </Text>
              </View>
            </View>
            <View style={styles.organizeActions}>
              <Pressable
                style={({ pressed }) => [
                  styles.organizeBtnSecondary,
                  pressed && { opacity: 0.8 },
                ]}
                onPress={() => setShowFolderPicker(true)}
              >
                <Text style={styles.organizeBtnSecondaryText}>Move Folder</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.organizeBtnPrimary,
                  (pressed || isAiOrganizing) && { opacity: 0.85 },
                ]}
                onPress={handleAiOrganize}
                disabled={isAiOrganizing}
              >
                {isAiOrganizing ? (
                  <ActivityIndicator size="small" color={C.ink1} />
                ) : (
                  <Text style={styles.organizeBtnPrimaryText}>AI Organize</Text>
                )}
              </Pressable>
            </View>
            {aiSummary && <Text style={styles.organizeSummary}>{aiSummary}</Text>}
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
        {(document.ocrText || document.ocrStatus === 'pending' || document.ocrStatus === 'unavailable') && (
          <View style={styles.ocrSection}>
            <Pressable
              style={styles.ocrHeader}
              onPress={() => setShowOCR(v => !v)}
            >
              <Text style={styles.ocrTitle}>
                {document.ocrStatus === 'pending'
                  ? '⏳ Extracting text…'
                  : document.ocrStatus === 'unavailable'
                    ? 'OCR unavailable in this build'
                    : '📝 Extracted Text'}
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

      <FolderPickerModal
        visible={showFolderPicker}
        folders={folders}
        onSelect={handleFolderSelect}
        onCancel={() => setShowFolderPicker(false)}
      />

      <PaywallModal
        visible={showPaywall}
        onClose={() => setShowPaywall(false)}
        onSuccess={() => {
          setShowPaywall(false);
          void checkPro();
        }}
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
    </View>
  );
}

// ─── PDF Viewer sub-component ──────────────────────────────────────────────────

interface PDFViewerProps {
  uri: string;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

function PDFViewer({
  page, totalPages, onPageChange,
}: PDFViewerProps) {
  return (
    <View style={pdfStyles.container}>
      <View style={pdfStyles.placeholder}>
        <Text style={pdfStyles.icon}>📄</Text>
        <Text style={pdfStyles.title}>PDF saved</Text>
        <Text style={pdfStyles.subtitle}>
          PDF preview is temporarily disabled in this TestFlight build.
          You can still share or export the file.
        </Text>
      </View>

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
  zoomScrollContent: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '100%',
    minHeight: SCREEN_H * 0.5,
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
  organizeCard: {
    backgroundColor: C.ink2,
    borderRadius: R.lg,
    borderWidth: 1,
    borderColor: `${C.amber}33`,
    padding: S[4],
    gap: S[3],
  },
  organizeHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  organizeTitleWrap: {
    flex: 1,
    gap: 4,
  },
  organizeTitle: {
    fontSize: T.base,
    fontWeight: '700',
    color: C.cream,
  },
  organizeBody: {
    fontSize: T.sm,
    color: C.ash,
    lineHeight: 20,
  },
  organizeActions: {
    flexDirection: 'row',
    gap: S[2],
  },
  organizeBtnPrimary: {
    flex: 1,
    minHeight: 44,
    borderRadius: R.lg,
    backgroundColor: C.amber,
    alignItems: 'center',
    justifyContent: 'center',
  },
  organizeBtnPrimaryText: {
    fontSize: T.sm,
    fontWeight: '700',
    color: C.ink1,
  },
  organizeBtnSecondary: {
    flex: 1,
    minHeight: 44,
    borderRadius: R.lg,
    borderWidth: 1,
    borderColor: C.ink4,
    backgroundColor: C.ink3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  organizeBtnSecondaryText: {
    fontSize: T.sm,
    fontWeight: '600',
    color: C.cream,
  },
  organizeSummary: {
    fontSize: T.xs,
    color: C.amber,
    lineHeight: 18,
  },
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
