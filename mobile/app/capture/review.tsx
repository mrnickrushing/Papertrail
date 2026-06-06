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
import { nanoid } from 'nanoid/non-secure';
import { useAppStore, useDocumentStore } from '@/store';
import { useProStore, FREE_DOCUMENT_LIMIT } from '@/store/proStore';
import { PaywallModal } from '@/components/PaywallModal';
import { saveDocumentFile, generateThumbnail, getFileSize, getExtension } from '@/services/fileStorage';
import { extractText, isOCRAvailable } from '@/services/ocr';
import { isPDFLike } from '@/services/pdfService';
import { apiRequest, isBackendConfigured } from '@/services/api';
import { useDebugStore } from '@/store/debugStore';
import { C, T, R, S } from '@/theme/tokens';
import type { DocumentCategory } from '@/types/document';

const CATEGORIES: DocumentCategory[] = [
  'receipt', 'contract', 'id', 'warranty', 'medical', 'tax', 'other',
];

const CATEGORY_LABELS: Record<DocumentCategory, string> = {
  receipt: '🧾 Receipt',
  contract: '📝 Contract',
  id: '🪪 ID',
  warranty: '🛡️ Warranty',
  medical: '🏥 Medical',
  tax: '💰 Tax',
  other: '📁 Other',
};

function generateTitle(source: string, mimeType?: string): string {
  const now = new Date();
  const date = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  if (source === 'camera') return `Scan ${date}`;
  if (source === 'photo') return `Photo ${date}`;
  if (mimeType?.includes('pdf')) return `Document ${date}`;
  return `Import ${date}`;
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
  const documents = useDocumentStore(s => s.documents);
  const autoOcr = useAppStore(s => s.autoOcr);
  const isPro = useProStore(s => s.isPro);
  const checkPro = useProStore(s => s.checkPro);
  const logDebug = useDebugStore(s => s.log);
  const setDebugScreenState = useDebugStore(s => s.setScreenState);

  const [title, setTitle] = useState(() => generateTitle(params.source, params.mimeType));
  const [category, setCategory] = useState<DocumentCategory>('other');
  const [suggestedTags, setSuggestedTags] = useState<string[]>([]);
  const [ocrText, setOCRText] = useState<string | null>(null);
  const [ocrStatus, setOCRStatus] = useState<'idle' | 'processing' | 'done' | 'unavailable'>('idle');
  const [aiStatus, setAiStatus] = useState<'idle' | 'processing' | 'done'>('idle');
  const [isSaving, setIsSaving] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    logDebug(`review mount source=${params.source} name=${params.name ?? 'untitled'}`);
    return () => {
      isMounted.current = false;
      logDebug('review unmount');
    };
  }, [logDebug, params.name, params.source]);

  useEffect(() => {
    setDebugScreenState(
      'review',
      `save=${isSaving ? '1' : '0'} paywall=${showPaywall ? '1' : '0'} ocr=${ocrStatus} ai=${aiStatus}`,
    );
  }, [aiStatus, isSaving, ocrStatus, setDebugScreenState, showPaywall]);

  // Auto-run OCR then AI suggestions
  useEffect(() => {
    const isPdf = !params.uri || isPDFLike(params.uri, params.mimeType);
    if (isPdf) {
      logDebug('review detected pdf import');
      setOCRStatus('unavailable');
      // For PDFs: call AI from filename alone if pro and backend configured
      if (isPro && isBackendConfigured() && (params.name || params.uri)) {
        setAiStatus('processing');
        apiRequest<{
          suggestedTitle: string;
          category: DocumentCategory;
          tags: string[];
          source: string;
        }>('/v1/ai/suggest-document', {
          method: 'POST',
          body: { title: params.name, filename: params.name, mimeType: params.mimeType },
        })
          .then((suggestion) => {
            if (!isMounted.current) return;
            logDebug(`review pdf ai ok ${suggestion.category ?? 'none'}`);
            if (suggestion.suggestedTitle) setTitle(suggestion.suggestedTitle);
            if (suggestion.category) setCategory(suggestion.category);
            setSuggestedTags(Array.isArray(suggestion.tags) ? suggestion.tags : []);
            setAiStatus('done');
          })
          .catch(() => {
            logDebug('review pdf ai failed');
            if (isMounted.current) setAiStatus('idle');
          });
      }
      return;
    }
    if (!autoOcr || !isOCRAvailable()) {
      logDebug('review ocr unavailable');
      setOCRStatus('unavailable');
      return;
    }

    logDebug('review start ocr');
    setOCRStatus('processing');
    extractText(params.uri)
      .then(async (result) => {
        if (!isMounted.current) return;
        const text = result.text || null;
        logDebug(`review ocr done words=${text ? text.split(/\s+/).length : 0}`);
        setOCRText(text);
        setOCRStatus('done');

        // Call backend AI to suggest title + category + tags (pro only)
        if (isPro && text && isBackendConfigured()) {
          setAiStatus('processing');
          try {
            const suggestion = await apiRequest<{
              suggestedTitle: string;
              category: DocumentCategory;
              tags: string[];
              source: string;
            }>('/v1/ai/suggest-document', {
              method: 'POST',
              body: { title: params.name, filename: params.name, ocrText: text, mimeType: params.mimeType },
            });
            if (!isMounted.current) return;
            logDebug(`review image ai ok ${suggestion.category ?? 'none'}`);
            if (suggestion.suggestedTitle) setTitle(suggestion.suggestedTitle);
            if (suggestion.category) setCategory(suggestion.category);
            setSuggestedTags(Array.isArray(suggestion.tags) ? suggestion.tags : []);
            setAiStatus('done');
          } catch {
            logDebug('review image ai failed');
            if (isMounted.current) setAiStatus('idle');
          }
        }
      })
      .catch(() => {
        if (!isMounted.current) return;
        logDebug('review ocr failed');
        setOCRStatus('unavailable');
      });
  }, [autoOcr, isPro, logDebug, params.mimeType, params.name, params.uri]);

  const handleSave = useCallback(async () => {
    if (!params.uri || isSaving) return;

    // Gate: free users limited to FREE_DOCUMENT_LIMIT documents
    if (documents.length >= FREE_DOCUMENT_LIMIT && !isPro) {
      logDebug('review blocked by paywall');
      setShowPaywall(true);
      return;
    }

    logDebug('review save start');
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

      // 4. Write to DB via store
      await addDocument({
        id: documentId,
        title: title.trim() || generateTitle(params.source, params.mimeType),
        category,
        fileUri: localUri,
        thumbnailUri,
        mimeType: params.mimeType ?? (ext === 'pdf' ? 'application/pdf' : 'image/jpeg'),
        fileSizeBytes: sizeBytes,
        pageCount: 1,
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
      });

      // Navigate explicitly to the new document's viewer.
      // router.dismissAll() from inside the /capture nested stack does NOT remove
      // the transparent /capture modal container from the root stack — leaving an
      // invisible backdrop on top of whatever the user lands on, which eats every
      // touch. router.replace() targets the root stack and properly unmounts it.
      logDebug('review save success -> replace viewer');
      router.replace(`/viewer/${documentId}`);
    } catch (err) {
      logDebug('review save failed');
      Alert.alert('Save Failed', 'Something went wrong saving your document. Please try again.');
      console.error('[Review] save error:', err);
    } finally {
      if (isMounted.current) setIsSaving(false);
    }
  }, [params, title, category, suggestedTags, ocrText, ocrStatus, addDocument, isSaving, documents.length, isPro]);

  const isImage = !isPDFLike(params.uri ?? '', params.mimeType);

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
              logDebug('review back');
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
          {ocrStatus === 'processing' && (
            <>
              <ActivityIndicator size="small" color={C.amber} style={{ marginRight: S[2] }} />
              <Text style={styles.ocrText}>Extracting text…</Text>
            </>
          )}
          {ocrStatus === 'done' && aiStatus === 'processing' && (
            <>
              <ActivityIndicator size="small" color={C.amber} style={{ marginRight: S[2] }} />
              <Text style={styles.ocrText}>AI analysing document…</Text>
            </>
          )}
          {ocrStatus === 'done' && aiStatus === 'done' && (
            <>
              <Text style={styles.ocrDot}>✦</Text>
              <Text style={styles.ocrText}>AI filled title, category, and tags</Text>
            </>
          )}
          {ocrStatus === 'done' && aiStatus === 'idle' && (
            <>
              <Text style={styles.ocrDot}>✓</Text>
              <Text style={styles.ocrText}>
                {ocrText ? `${ocrText.split(/\s+/).length} words extracted` : 'No text found'}
              </Text>
            </>
          )}
          {ocrStatus === 'unavailable' && aiStatus === 'processing' && (
            <>
              <ActivityIndicator size="small" color={C.amber} style={{ marginRight: S[2] }} />
              <Text style={styles.ocrText}>AI analysing…</Text>
            </>
          )}
          {ocrStatus === 'unavailable' && aiStatus === 'done' && (
            <>
              <Text style={styles.ocrDot}>✦</Text>
              <Text style={styles.ocrText}>AI filled title, category, and tags</Text>
            </>
          )}
          {ocrStatus === 'unavailable' && aiStatus === 'idle' && (
            <Text style={styles.ocrMuted}>OCR available in full build</Text>
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
            {CATEGORIES.map(cat => (
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
      </ScrollView>
      {showPaywall && (
        <PaywallModal
          visible={showPaywall}
          onClose={() => {
            logDebug('review paywall close');
            setShowPaywall(false);
          }}
          onSuccess={() => {
            logDebug('review paywall success');
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
});
