/**
 * capture/review.tsx — Document review + metadata entry before saving
 *
 * Flow:
 *   CaptureModal → (camera/photo) → ImageCropper → here
 *   CaptureModal → (file/PDF)     → here directly
 *
 * User can:
 *   - See a preview of the document
 *   - Edit the auto-generated title
 *   - Select a category
 *   - See OCR status (processing / done / unavailable)
 *   - Hit Save → document written to DB + files saved to disk
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  Image,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as FileSystem from 'expo-file-system';
import { nanoid } from 'nanoid/non-secure';
import * as Haptics from 'expo-haptics';
import { useAppStore, useDocumentStore, useProStore, FREE_DOCUMENT_LIMIT } from '@/store';
import { PaywallModal } from '@/components/PaywallModal';
import { saveDocumentFile, generateThumbnail, getFileSize, getExtension } from '@/services/fileStorage';
import { extractText, isOCRAvailable } from '@/services/ocr';
import { isPDFLike, getPDFInfo } from '@/services/pdfService';
import { apiRequest, isBackendConfigured, getAnthropicApiKey } from '@/services/api';
import { C, T, R, S } from '@/theme/tokens';
import type { DocumentCategory } from '@/types/document';

const CATEGORIES: DocumentCategory[] = [
  'receipt', 'bill', 'contract', 'id', 'warranty', 'medical', 'tax', 'work', 'retirement',
  'insurance', 'legal', 'vehicle', 'property', 'education', 'travel', 'pet', 'other',
];

// Most broadly useful categories for a personal document app — shown by default
// so the picker doesn't push the Save button far down the screen. The rest are
// available behind "More…".
const COMMON_CATEGORIES: DocumentCategory[] = ['receipt', 'bill', 'contract', 'id', 'tax', 'other'];

const CATEGORY_LABELS: Record<DocumentCategory, string> = {
  receipt: 'Receipt',
  bill: 'Bill',
  contract: 'Contract',
  id: 'ID',
  warranty: 'Warranty',
  medical: 'Medical',
  tax: 'Tax',
  work: 'Work',
  retirement: 'Retirement',
  insurance: 'Insurance',
  legal: 'Legal',
  vehicle: 'Vehicle',
  property: 'Property',
  education: 'Education',
  travel: 'Travel',
  pet: 'Pet',
  other: 'Other',
};

function generateTitle(source: string, mimeType?: string): string {
  const now = new Date();
  const date = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  if (source === 'camera') return `Scan ${date}`;
  if (source === 'photo') return `Photo ${date}`;
  if (mimeType?.includes('pdf')) return `Document ${date}`;
  return `Import ${date}`;
}

// The router param's reported size can be 0/undefined — fall back to the
// actual on-disk size so large files can't slip past the AI base64 limit.
async function resolveFileSize(uri: string | undefined, reportedBytes: number): Promise<number> {
  if (reportedBytes > 0) return reportedBytes;
  if (!uri) return 0;
  return getFileSize(uri);
}

function describeOcrResult(text: string | null): string {
  const trimmed = text?.trim() ?? '';
  if (!trimmed) return 'No text detected';
  return `${trimmed.split(/\s+/).length} words extracted`;
}

type OcrStatusDisplay =
  | { kind: 'spinner'; label: string }
  | { kind: 'done'; icon: string; label: string }
  | { kind: 'muted'; label: string }
  | null;

/** Single source of truth for the OCR/AI status row — collapses what was
 * 7 overlapping ocrStatus×aiStatus JSX conditionals into one lookup. */
function getOcrStatusDisplay(
  ocrStatus: 'idle' | 'processing' | 'done' | 'unavailable',
  aiStatus: 'idle' | 'processing' | 'done',
  ocrText: string | null,
  isPro: boolean
): OcrStatusDisplay {
  if (ocrStatus === 'processing') return { kind: 'spinner', label: 'Extracting text…' };
  if (aiStatus === 'processing') {
    return { kind: 'spinner', label: ocrStatus === 'done' ? 'AI analysing document…' : 'AI analysing…' };
  }
  if (aiStatus === 'done') return { kind: 'done', icon: '✦', label: 'AI filled title, category, and tags' };
  if (ocrStatus === 'done') return { kind: 'done', icon: '✓', label: describeOcrResult(ocrText) };
  if (ocrStatus === 'unavailable' && !isPro) return { kind: 'muted', label: 'AI available with Pro' };
  return null;
}

export default function DocumentReviewScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    uri: string;
    name?: string;
    mimeType?: string;
    size?: string;
    source: 'camera' | 'photo' | 'file';
  }>();

  const addDocument = useDocumentStore(s => s.addDocument);
  const addFolder = useDocumentStore(s => s.addFolder);
  const moveDocumentToFolder = useDocumentStore(s => s.moveDocumentToFolder);
  const folders = useDocumentStore(s => s.folders);
  const documents = useDocumentStore(s => s.documents);
  const autoOcr = useAppStore(s => s.autoOcr);
  const recordAiUsageCost = useAppStore(s => s.recordAiUsageCost);
  const isPro = useProStore(s => s.isPro);
  const checkPro = useProStore(s => s.checkPro);

  const [title, setTitle] = useState(() => generateTitle(params.source, params.mimeType));
  const [category, setCategory] = useState<DocumentCategory>('other');
  const [suggestedTags, setSuggestedTags] = useState<string[]>([]);
  const [suggestedNotes, setSuggestedNotes] = useState<string>('');
  const [suggestedFolderName, setSuggestedFolderName] = useState<string>('');
  const [suggestedSubfolderName, setSuggestedSubfolderName] = useState<string>('');
  const [suggestedAiSource, setSuggestedAiSource] = useState<'heuristic' | 'claude' | null>(null);
  const [suggestedDate, setSuggestedDate] = useState<string>('');
  const [suggestedVendor, setSuggestedVendor] = useState<string>('');
  const [suggestedAmounts, setSuggestedAmounts] = useState<number[]>([]);
  const [ocrText, setOCRText] = useState<string | null>(null);
  const [ocrStatus, setOCRStatus] = useState<'idle' | 'processing' | 'done' | 'unavailable'>('idle');
  const [aiStatus, setAiStatus] = useState<'idle' | 'processing' | 'done'>('idle');
  const [isSaving, setIsSaving] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [showAllCategories, setShowAllCategories] = useState(false);
  const isMounted = useRef(true);

  // Free users at the document limit can't save anyway — show the paywall
  // immediately instead of burning OCR/AI tokens on a doc that can't be kept.
  const atFreeLimit = documents.length >= FREE_DOCUMENT_LIMIT && !isPro;

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, [params.name, params.source]);

  useEffect(() => {
    if (atFreeLimit) setShowPaywall(true);
  }, [atFreeLimit]);

  // If AI suggests a category outside the "common" set, reveal the full list
  // so the selection isn't hidden behind "More…".
  useEffect(() => {
    if (!COMMON_CATEGORIES.includes(category)) setShowAllCategories(true);
  }, [category]);

  // Auto-run OCR then AI suggestions
  useEffect(() => {
    if (atFreeLimit) return;
    const isPdf = !params.uri || isPDFLike(params.uri, params.mimeType);
    if (isPdf) {
      setOCRStatus('unavailable');
      // For PDFs: read file content and call AI to suggest metadata
      if (isPro && isBackendConfigured() && (params.name || params.uri)) {
        setAiStatus('processing');
        const PDF_BASE64_SIZE_LIMIT = 4 * 1024 * 1024;
        const reportedSize = params.size ? parseInt(params.size, 10) : 0;
        const pdfReadPromise = resolveFileSize(params.uri, reportedSize).then((actualSize) =>
          params.uri && actualSize <= PDF_BASE64_SIZE_LIMIT
            ? FileSystem.readAsStringAsync(params.uri, { encoding: FileSystem.EncodingType.Base64 }).catch(() => undefined)
            : undefined
        );
        pdfReadPromise.then((pdfBase64) =>
        apiRequest<{
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
          body: { title, filename: params.name, mimeType: params.mimeType, pdfBase64, anthropicApiKey: getAnthropicApiKey() ?? undefined, existingFolders: folders.filter(f => !f.parentId).map(f => f.name) },
        }))
          .then((suggestion) => {
            if (!isMounted.current) return;
            if (suggestion.suggestedTitle) setTitle(suggestion.suggestedTitle);
            if (suggestion.category) setCategory(suggestion.category);
            setSuggestedTags(Array.isArray(suggestion.tags) ? suggestion.tags : []);
            if (suggestion.notes) setSuggestedNotes(suggestion.notes);
            if (suggestion.suggestedFolderName) setSuggestedFolderName(suggestion.suggestedFolderName);
            if (suggestion.suggestedSubfolderName) setSuggestedSubfolderName(suggestion.suggestedSubfolderName);
            if (suggestion.source === 'claude' || suggestion.source === 'heuristic') setSuggestedAiSource(suggestion.source);
            if (suggestion.date) setSuggestedDate(suggestion.date);
            if (suggestion.vendor) setSuggestedVendor(suggestion.vendor);
            if (Array.isArray(suggestion.amounts)) setSuggestedAmounts(suggestion.amounts);
            if (suggestion.usage) recordAiUsageCost(suggestion.usage.costUsd);
            setAiStatus('done');
          })
          .catch(() => {
            if (isMounted.current) setAiStatus('idle');
          });
      }
      return;
    }
    const FILE_SIZE_LIMIT = 4 * 1024 * 1024;
    const reportedImageSize = params.size ? parseInt(params.size, 10) : 0;
    const canReadImagePromise = resolveFileSize(params.uri, reportedImageSize).then(
      (actualSize) => !!params.uri && actualSize <= FILE_SIZE_LIMIT
    );

    const applySuggestion = (suggestion: {
      suggestedTitle?: string;
      category?: DocumentCategory;
      tags?: string[];
      notes?: string;
      suggestedFolderName?: string;
      suggestedSubfolderName?: string;
      source?: string;
      date?: string;
      vendor?: string;
      amounts?: number[];
      usage?: { inputTokens: number; outputTokens: number; costUsd: number };
    }) => {
      if (suggestion.suggestedTitle) setTitle(suggestion.suggestedTitle);
      if (suggestion.category) setCategory(suggestion.category);
      setSuggestedTags(Array.isArray(suggestion.tags) ? suggestion.tags : []);
      if (suggestion.notes) setSuggestedNotes(suggestion.notes);
      if (suggestion.suggestedFolderName) setSuggestedFolderName(suggestion.suggestedFolderName);
      if (suggestion.suggestedSubfolderName) setSuggestedSubfolderName(suggestion.suggestedSubfolderName);
      if (suggestion.source === 'claude' || suggestion.source === 'heuristic') setSuggestedAiSource(suggestion.source);
      if (suggestion.date) setSuggestedDate(suggestion.date);
      if (suggestion.vendor) setSuggestedVendor(suggestion.vendor);
      if (Array.isArray(suggestion.amounts)) setSuggestedAmounts(suggestion.amounts);
      if (suggestion.usage) recordAiUsageCost(suggestion.usage.costUsd);
    };

    if (!autoOcr || !isOCRAvailable()) {
      setOCRStatus('unavailable');
      // Call AI with image vision — no OCR available but Claude can read the file directly
      if (isPro && isBackendConfigured() && params.uri) {
        setAiStatus('processing');
        canReadImagePromise.then((canReadImage) =>
          canReadImage
            ? FileSystem.readAsStringAsync(params.uri, { encoding: FileSystem.EncodingType.Base64 }).catch(() => undefined)
            : Promise.resolve(undefined)
        ).then((imageBase64) =>
          apiRequest<{
            suggestedTitle: string; category: DocumentCategory;
            tags: string[]; notes: string; suggestedFolderName: string;
            suggestedSubfolderName?: string;
            source?: string; date?: string; vendor?: string; amounts?: number[];
            usage?: { inputTokens: number; outputTokens: number; costUsd: number };
          }>('/v1/ai/suggest-document', {
            method: 'POST',
            body: { title, filename: params.name, mimeType: params.mimeType, imageBase64, imageMimeType: imageBase64 ? params.mimeType : undefined, anthropicApiKey: getAnthropicApiKey() ?? undefined, existingFolders: folders.filter(f => !f.parentId).map(f => f.name) },
          })
        ).then((suggestion) => {
          if (!isMounted.current) return;
          applySuggestion(suggestion);
          setAiStatus('done');
        }).catch(() => {
          if (isMounted.current) setAiStatus('idle');
        });
      }
      return;
    }

    setOCRStatus('processing');
    extractText(params.uri)
      .then(async (result) => {
        if (!isMounted.current) return;
        const text = result.text || null;
        setOCRText(text);
        setOCRStatus('done');

        if (isPro && isBackendConfigured()) {
          setAiStatus('processing');
          try {
            // Read image for vision — Claude uses it alongside OCR text for best results
            const imageBase64 = (await canReadImagePromise)
              ? await FileSystem.readAsStringAsync(params.uri, { encoding: FileSystem.EncodingType.Base64 }).catch(() => undefined)
              : undefined;
            const suggestion = await apiRequest<{
              suggestedTitle: string; category: DocumentCategory;
              tags: string[]; notes: string; suggestedFolderName: string;
              suggestedSubfolderName?: string;
              source?: string; date?: string; vendor?: string; amounts?: number[];
              usage?: { inputTokens: number; outputTokens: number; costUsd: number };
            }>('/v1/ai/suggest-document', {
              method: 'POST',
              body: {
                title, filename: params.name,
                ocrText: text || undefined,
                mimeType: params.mimeType,
                imageBase64,
                imageMimeType: imageBase64 ? params.mimeType : undefined,
                anthropicApiKey: getAnthropicApiKey() ?? undefined,
                existingFolders: folders.filter(f => !f.parentId).map(f => f.name),
              },
            });
            if (!isMounted.current) return;
            applySuggestion(suggestion);
            setAiStatus('done');
          } catch {
            if (isMounted.current) setAiStatus('idle');
          }
        }
      })
      .catch(() => {
        if (!isMounted.current) return;
        setOCRStatus('unavailable');
      });
  }, [atFreeLimit, autoOcr, isPro, params.mimeType, params.name, params.uri]);

  const handleSave = useCallback(async () => {
    if (!params.uri || isSaving) return;

    // Gate: free users limited to FREE_DOCUMENT_LIMIT documents
    if (documents.length >= FREE_DOCUMENT_LIMIT && !isPro) {
      setShowPaywall(true);
      return;
    }

    setIsSaving(true);

    try {
      const documentId = nanoid();
      const ext = params.mimeType
        ? getExtension(params.mimeType)
        : getExtension(params.uri);

      // 1. Persist file to private storage
      const localUri = await saveDocumentFile(documentId, params.uri, ext);

      // 2. Generate thumbnail
      const isPdfDoc = isPDFLike(params.uri, params.mimeType);
      const thumbnailUri = isPdfDoc
        ? null
        : await generateThumbnail(documentId, params.uri);

      // 3. Get file size
      const sizeBytes = params.size
        ? parseInt(params.size, 10)
        : await getFileSize(localUri);

      // 3b. Get true page count for PDFs (parsed locally with pdf-lib; falls
      // back to 1 for images and unparseable PDFs)
      const pageCount = isPdfDoc ? (await getPDFInfo(localUri)).pageCount : 1;

      // 4. Write to DB via store
      await addDocument({
        id: documentId,
        title: title.trim() || generateTitle(params.source, params.mimeType),
        category,
        fileUri: localUri,
        thumbnailUri,
        mimeType: params.mimeType ?? (ext === 'pdf' ? 'application/pdf' : 'image/jpeg'),
        fileSizeBytes: sizeBytes,
        pageCount,
        ocrText: ocrText ?? undefined,
        ocrStatus:
          ocrStatus === 'done'
            ? 'done'
            : ocrStatus === 'unavailable'
              ? 'unavailable'
              : 'pending',
        isFavorite: false,
        folderId: null,
        tags: suggestedTags,
        ...(suggestedNotes ? { notes: suggestedNotes } : {}),
        ...(suggestedAiSource ? { aiSource: suggestedAiSource, aiOrganizedAt: new Date().toISOString() } : {}),
        ...(suggestedDate ? { inferredDate: suggestedDate } : {}),
        ...(suggestedVendor ? { vendor: suggestedVendor } : {}),
        ...(suggestedAmounts.length > 0 ? { amounts: suggestedAmounts } : {}),
      });

      // 5. Auto-file into suggested folder (find or create)
      if (suggestedFolderName) {
        const nameLower = suggestedFolderName.toLowerCase();
        const existing = folders.find((f) => f.name.toLowerCase() === nameLower && !f.parentId);
        const parentFolder = existing ?? addFolder(suggestedFolderName);
        if (suggestedSubfolderName) {
          const subLower = suggestedSubfolderName.toLowerCase();
          const freshFolders = useDocumentStore.getState().folders;
          const subFolder = freshFolders.find((f) => f.name.toLowerCase() === subLower && f.parentId === parentFolder.id)
            ?? addFolder(suggestedSubfolderName, parentFolder.color, parentFolder.id);
          moveDocumentToFolder(documentId, subFolder.id);
        } else {
          moveDocumentToFolder(documentId, parentFolder.id);
        }
      }

      // Navigate to the new document's viewer.
      // router.dismissAll() from inside the /capture nested stack does NOT remove
      // the transparent /capture modal container from the root stack — it leaves
      // an invisible backdrop that blocks every touch on the landing screen.
      // router.replace() with a root-level href properly unmounts the modal.
      // Confirmed working; do not change to dismissAll/dismiss without retesting.
      if (isMounted.current) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.replace(`/viewer/${documentId}`);
      }
    } catch (err) {
      Alert.alert('Save Failed', 'Something went wrong saving your document. Please try again.');
    } finally {
      if (isMounted.current) setIsSaving(false);
    }
  }, [params, title, category, suggestedTags, ocrText, ocrStatus, addDocument, isSaving, documents.length, isPro, suggestedAiSource, suggestedDate, suggestedVendor, suggestedAmounts]);

  const isImage = !isPDFLike(params.uri ?? '', params.mimeType);
  const ocrStatusDisplay = getOcrStatusDisplay(ocrStatus, aiStatus, ocrText, isPro);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : 0}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + S[4], paddingBottom: insets.bottom + S[16] },
        ]}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets={Platform.OS !== 'ios'}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            style={styles.backBtn}
            onPress={() => {
              router.back();
            }}
            hitSlop={8}
          >
            <Text style={styles.backText}>‹ Back</Text>
          </Pressable>
          <Text style={styles.headerTitle}>Review Document</Text>
          <View style={{ width: 60 }} />
        </View>

        {/* Preview */}
        <View style={styles.previewCard}>
          {isImage ? (
            <Image
              source={{ uri: params.uri }}
              style={styles.preview}
              resizeMode="contain"
            />
          ) : (
            <View style={styles.pdfPlaceholder}>
              <Text style={styles.pdfIcon}>📄</Text>
              <Text style={styles.pdfLabel}>
                {params.name ?? 'Document.pdf'}
              </Text>
            </View>
          )}
        </View>

        {/* OCR + AI Status */}
        <View style={styles.ocrRow}>
          {ocrStatusDisplay?.kind === 'spinner' && (
            <>
              <ActivityIndicator size="small" color={C.amber} style={{ marginRight: S[2] }} />
              <Text style={styles.ocrText}>{ocrStatusDisplay.label}</Text>
            </>
          )}
          {ocrStatusDisplay?.kind === 'done' && (
            <>
              <Text style={styles.ocrDot}>{ocrStatusDisplay.icon}</Text>
              <Text style={styles.ocrText}>{ocrStatusDisplay.label}</Text>
            </>
          )}
          {ocrStatusDisplay?.kind === 'muted' && (
            <Text style={styles.ocrMuted}>{ocrStatusDisplay.label}</Text>
          )}
        </View>

        {suggestedTags.length > 0 && (
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Suggested Tags</Text>
            <View style={styles.tagRow}>
              {suggestedTags.map((tag) => (
                <View key={tag} style={styles.tagChip}>
                  <Text style={styles.tagChipText}>{tag}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {suggestedFolderName ? (
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Will be filed in</Text>
            <View style={styles.tagRow}>
              <View style={[styles.tagChip, { backgroundColor: `${C.amber}22` }]}>
                <Text style={[styles.tagChipText, { color: C.amber }]}>📁 {suggestedFolderName}{suggestedSubfolderName ? ` › ${suggestedSubfolderName}` : ''}</Text>
              </View>
            </View>
          </View>
        ) : null}
        {suggestedNotes ? (
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>AI Notes</Text>
            <Text style={[styles.ocrMuted, { color: C.ash }]}>{suggestedNotes}</Text>
          </View>
        ) : null}

        {/* Title */}
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Title</Text>
          <TextInput
            style={styles.textInput}
            value={title}
            onChangeText={setTitle}
            placeholder="Document title…"
            placeholderTextColor={C.ash}
            returnKeyType="done"
            maxLength={120}
            autoCorrect={false}
          />
        </View>

        {/* Category */}
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Category</Text>
          <View style={styles.categoryGrid}>
            {(showAllCategories ? CATEGORIES : COMMON_CATEGORIES).map(cat => (
              <Pressable
                key={cat}
                style={({ pressed }) => [
                  styles.categoryChip,
                  category === cat && styles.categoryChipSelected,
                  pressed && styles.categoryChipPressed,
                ]}
                onPress={() => setCategory(cat)}
              >
                <Text
                  style={[
                    styles.categoryChipText,
                    category === cat && styles.categoryChipTextSelected,
                  ]}
                >
                  {CATEGORY_LABELS[cat]}
                </Text>
              </Pressable>
            ))}
            {!showAllCategories && (
              <Pressable
                style={({ pressed }) => [styles.categoryChip, pressed && styles.categoryChipPressed]}
                onPress={() => setShowAllCategories(true)}
              >
                <Text style={styles.categoryChipText}>More…</Text>
              </Pressable>
            )}
          </View>
        </View>

        {/* Save button */}
        <Pressable
          style={[styles.saveBtn, isSaving && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator color={C.ink1} />
          ) : (
            <Text style={styles.saveBtnText}>Save Document</Text>
          )}
        </Pressable>
        {aiStatus === 'processing' && (
          <Text style={styles.saveHint}>
            AI is still analysing this document. You can save now, but waiting a moment may improve the title, category, and folder suggestion.
          </Text>
        )}
      </ScrollView>
      {showPaywall && (
        <PaywallModal
          visible={showPaywall}
          onClose={() => {
            setShowPaywall(false);
          }}
          onSuccess={() => {
            setShowPaywall(false);
            void checkPro();
          }}
        />
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.ink1,
  },
  content: {
    paddingHorizontal: S[4],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: S[4],
  },
  backBtn: {
    minWidth: 60,
    minHeight: 44,
    justifyContent: 'center',
  },
  backText: {
    fontSize: T.base,
    color: C.amber,
    fontWeight: '500',
  },
  headerTitle: {
    fontSize: T.lg,
    fontWeight: '700',
    color: C.cream,
  },
  previewCard: {
    borderRadius: R.xl,
    overflow: 'hidden',
    backgroundColor: C.ink2,
    marginBottom: S[3],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
  },
  preview: {
    width: '100%',
    height: 280,
  },
  pdfPlaceholder: {
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
    gap: S[3],
  },
  pdfIcon: {
    fontSize: 56,
  },
  pdfLabel: {
    fontSize: T.sm,
    color: C.ash,
    textAlign: 'center',
    paddingHorizontal: S[4],
  },
  ocrRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: S[4],
    minHeight: 20,
  },
  ocrDot: {
    fontSize: T.sm,
    color: C.success,
    marginRight: S[2],
  },
  ocrText: {
    fontSize: T.sm,
    color: C.ash,
  },
  ocrMuted: {
    fontSize: T.sm,
    color: C.ink4,
  },
  field: {
    marginBottom: S[5],
  },
  fieldLabel: {
    fontSize: T.sm,
    fontWeight: '600',
    color: C.ash,
    marginBottom: S[2],
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  textInput: {
    backgroundColor: C.ink2,
    borderRadius: R.md,
    paddingHorizontal: S[4],
    paddingVertical: S[3],
    fontSize: T.base,
    color: C.cream,
    minHeight: 48,
    borderWidth: 1,
    borderColor: C.ink4,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: S[2],
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: S[2],
  },
  tagChip: {
    backgroundColor: C.ink2,
    borderRadius: R.full,
    paddingHorizontal: S[3],
    paddingVertical: S[2],
    borderWidth: 1,
    borderColor: C.amber + '55',
    minHeight: 34,
    justifyContent: 'center',
  },
  tagChipText: {
    fontSize: T.sm,
    color: C.amber,
    fontWeight: '600',
  },
  categoryChip: {
    backgroundColor: C.ink2,
    borderRadius: R.full,
    paddingHorizontal: S[4],
    paddingVertical: S[2],
    borderWidth: 1,
    borderColor: C.ink4,
    minHeight: 36,
    justifyContent: 'center',
  },
  categoryChipSelected: {
    backgroundColor: C.amberDim,
    borderColor: C.amber,
  },
  categoryChipPressed: {
    opacity: 0.7,
  },
  categoryChipText: {
    fontSize: T.sm,
    color: C.ash,
    fontWeight: '500',
  },
  categoryChipTextSelected: {
    color: C.amber,
    fontWeight: '600',
  },
  saveBtn: {
    backgroundColor: C.amber,
    borderRadius: R.lg,
    paddingVertical: S[4],
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
    marginTop: S[4],
    shadowColor: C.amber,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  saveBtnDisabled: {
    opacity: 0.55,
  },
  saveBtnText: {
    fontSize: T.base,
    fontWeight: '700',
    color: C.ink1,
    letterSpacing: 0.3,
  },
  saveHint: {
    fontSize: T.xs,
    color: C.ash,
    textAlign: 'center',
    marginTop: S[2],
    marginBottom: S[2],
    lineHeight: 18,
    paddingHorizontal: S[2],
  },
});
