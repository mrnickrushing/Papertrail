import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  Pressable, Alert, ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDocumentStore } from '@/store';
import { Document } from '@/types';
import { Colors, Typography, Spacing, Radius, Shadows } from '@/theme';
import { CategoryBadge } from '@/components/CategoryBadge';
import { formatFileSize, formatDate } from '@/utils/format';

export default function DocumentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { documents, deleteDocument } = useDocumentStore();
  const [doc, setDoc] = useState<Document | null>(null);

  useEffect(() => {
    const found = documents.find((d) => d.id === id);
    setDoc(found ?? null);
  }, [id, documents]);

  if (!doc) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Colors.primary} />
      </View>
    );
  }

  const handleDelete = () => {
    Alert.alert(
      'Delete Document',
      `Permanently delete "${doc.title}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteDocument(doc.id);
            router.back();
          },
        },
      ],
    );
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Title block */}
      <View style={styles.titleBlock}>
        <CategoryBadge category={doc.category} size="lg" />
        <Text style={styles.title} numberOfLines={3}>{doc.title}</Text>
        <Text style={styles.meta}>
          {formatDate(doc.createdAt)} · {formatFileSize(doc.fileSizeBytes)}
        </Text>
      </View>

      {/* Metadata card */}
      <View style={styles.card}>
        <MetaRow label="Category" value={doc.category} />
        <MetaRow label="MIME type" value={doc.mimeType} />
        {doc.pageCount != null && (
          <MetaRow label="Pages" value={String(doc.pageCount)} />
        )}
        <MetaRow
          label="OCR"
          value={
            doc.ocrStatus === 'done'
              ? 'Complete'
              : doc.ocrStatus === 'unavailable'
                ? 'Unavailable in this build'
                : doc.ocrStatus
          }
        />

      </View>

      {/* OCR text preview */}
      {doc.ocrText && doc.ocrText.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Extracted Text</Text>
          <Text style={styles.ocrText}>{doc.ocrText}</Text>
        </View>
      )}

      {/* Actions */}
      <View style={styles.actions}>
        <Pressable
          style={[styles.actionBtn, styles.actionBtnDanger]}
          onPress={handleDelete}
        >
          <Text style={styles.actionBtnDangerText}>🗑 Delete Document</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metaRow}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container:     { flex: 1, backgroundColor: Colors.bg },
  center:        { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.bg },
  titleBlock: {
    padding:      Spacing['6'],
    gap:          Spacing['3'],
  },
  title: {
    fontSize:   Typography.xl,
    fontWeight: Typography.bold,
    color:      Colors.text,
    lineHeight: Typography.xl * 1.2,
  },
  meta: {
    fontSize: Typography.sm,
    color:    Colors.textMuted,
  },
  card: {
    marginHorizontal: Spacing['4'],
    marginBottom:     Spacing['4'],
    backgroundColor:  Colors.surface,
    borderRadius:     Radius.lg,
    overflow:         'hidden',
    ...Shadows.sm,
  },
  sectionLabel: {
    fontSize:     Typography.xs,
    fontWeight:   Typography.semibold,
    color:        Colors.textFaint,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    padding:      Spacing['4'],
    paddingBottom: Spacing['2'],
  },
  metaRow: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'center',
    paddingHorizontal: Spacing['4'],
    paddingVertical: Spacing['3'],
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
    minHeight:      48,
  },
  metaLabel: { fontSize: Typography.sm, color: Colors.textMuted },
  metaValue: { fontSize: Typography.sm, color: Colors.text, fontWeight: Typography.medium },
  ocrText: {
    fontSize:   Typography.sm,
    color:      Colors.textMuted,
    lineHeight: Typography.sm * 1.6,
    padding:    Spacing['4'],
  },
  actions: {
    paddingHorizontal: Spacing['4'],
    marginTop:         Spacing['4'],
    gap:               Spacing['3'],
  },
  actionBtn: {
    borderRadius:    Radius.lg,
    paddingVertical: Spacing['4'],
    alignItems:      'center',
    minHeight:       52,
    justifyContent:  'center',
  },
  actionBtnDanger:     { backgroundColor: Colors.errorHighlight, borderWidth: 1, borderColor: Colors.error },
  actionBtnDangerText: { fontSize: Typography.base, fontWeight: Typography.semibold, color: Colors.error },
});
