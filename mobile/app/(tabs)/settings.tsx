/**
 * settings.tsx — App settings screen (Phase 4)
 *
 * Sections:
 *   - Storage: total docs, disk usage, clear all
 *   - Export: share single (from viewer) / export all as ZIP
 *   - About: version, build, licenses
 */

import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDocumentStore } from '@/store/documentStore';
import { deleteDocumentFiles } from '@/services/fileStorage';
import { exportAllAsZip } from '@/services/exportService';
import { C, T, R, S } from '@/theme/tokens';

const APP_VERSION = '0.6.0';
const BUILD = 'Phase 6 — OCR Queue · Metadata Extraction · Search History';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const documents = useDocumentStore(s => s.documents);
  const folders = useDocumentStore(s => s.folders);

  const [isClearing, setIsClearing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState<string | null>(null);

  const totalSize = useMemo(
    () => documents.reduce((sum, d) => sum + (d.fileSizeBytes ?? 0), 0),
    [documents],
  );

  const handleClearAll = () => {
    Alert.alert(
      'Clear All Data',
      `This will permanently delete all ${documents.length} document${documents.length === 1 ? '' : 's'} and ${folders.length} folder${folders.length === 1 ? '' : 's'}. This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear Everything',
          style: 'destructive',
          onPress: async () => {
            setIsClearing(true);
            try {
              await Promise.all(
                documents.map(d => deleteDocumentFiles(d.id).catch(() => {})),
              );
              useDocumentStore.setState({ documents: [], folders: [] });
            } finally {
              setIsClearing(false);
            }
          },
        },
      ],
    );
  };

  const handleExportZip = async () => {
    if (documents.length === 0) {
      Alert.alert('Nothing to Export', 'Add some documents first.');
      return;
    }

    setIsExporting(true);
    setExportProgress(null);

    try {
      await exportAllAsZip(documents, ({ current, total, filename }) => {
        setExportProgress(`Packing ${current}/${total}: ${filename}`);
      });
    } catch (err: any) {
      Alert.alert('Export Failed', err?.message ?? 'Something went wrong.');
    } finally {
      setIsExporting(false);
      setExportProgress(null);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.screenTitle}>Settings</Text>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + S[8] },
        ]}
      >
        {/* Storage */}
        <SectionHeader title="Storage" />
        <View style={styles.card}>
          <SettingsRow label="Documents" value={`${documents.length}`} />
          <Divider />
          <SettingsRow label="Folders" value={`${folders.length}`} />
          <Divider />
          <SettingsRow label="Disk Usage" value={formatBytes(totalSize)} />
        </View>

        <View style={styles.card}>
          <Pressable
            style={({ pressed }) => [styles.dangerRow, pressed && { opacity: 0.7 }]}
            onPress={handleClearAll}
            disabled={isClearing || documents.length === 0}
          >
            {isClearing ? (
              <ActivityIndicator color={C.danger} />
            ) : (
              <Text style={[
                styles.dangerText,
                documents.length === 0 && styles.dangerTextDisabled,
              ]}>
                Clear All Documents
              </Text>
            )}
          </Pressable>
        </View>

        {/* Export */}
        <SectionHeader title="Export" />
        <View style={styles.card}>
          <Pressable
            style={({ pressed }) => [
              styles.actionRow,
              (pressed || isExporting) && { opacity: 0.7 },
              documents.length === 0 && styles.actionRowDisabled,
            ]}
            onPress={handleExportZip}
            disabled={isExporting || documents.length === 0}
          >
            <View style={styles.actionContent}>
              <Text style={[
                styles.actionLabel,
                documents.length === 0 && styles.actionLabelDisabled,
              ]}>
                Export All as ZIP
              </Text>
              {exportProgress ? (
                <Text style={styles.progressText} numberOfLines={1}>
                  {exportProgress}
                </Text>
              ) : (
                <Text style={styles.actionSub}>
                  {documents.length} document{documents.length === 1 ? '' : 's'} · {formatBytes(totalSize)}
                </Text>
              )}
            </View>
            {isExporting
              ? <ActivityIndicator color={C.amber} />
              : <Text style={styles.actionChevron}>›</Text>
            }
          </Pressable>
        </View>

        <Text style={styles.exportHint}>
          To share a single document, open it and tap the share button (↑) in the top right.
        </Text>

        {/* About */}
        <SectionHeader title="About" />
        <View style={styles.card}>
          <SettingsRow label="Version" value={APP_VERSION} />
          <Divider />
          <SettingsRow label="Build" value={BUILD} />
          <Divider />
          <SettingsRow label="Storage" value="On-device only" />
        </View>

        <Text style={styles.footer}>
          PaperTrail stores all your documents privately on your device.{'\n'}
          Nothing is uploaded to any server.
        </Text>
      </ScrollView>
    </View>
  );
}

function SectionHeader({ title }: { title: string }) {
  return <Text style={styles.sectionHeader}>{title.toUpperCase()}</Text>;
}

function SettingsRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.ink1 },
  header: {
    paddingHorizontal: S[4],
    paddingVertical: S[4],
    borderBottomWidth: 1,
    borderBottomColor: C.ink3,
  },
  screenTitle: { fontSize: T.xl, fontWeight: '700', color: C.cream },
  content: { padding: S[4], gap: S[2] },
  sectionHeader: {
    fontSize: T.xs,
    fontWeight: '600',
    color: C.ash,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: S[4],
    marginBottom: S[1],
    marginLeft: S[2],
  },
  card: {
    backgroundColor: C.ink2,
    borderRadius: R.lg,
    overflow: 'hidden',
    marginBottom: S[2],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: S[4],
    paddingVertical: S[4],
    minHeight: 52,
  },
  rowLabel: { flex: 1, fontSize: T.base, color: C.cream },
  rowValue: { fontSize: T.base, color: C.ash, fontWeight: '500' },
  divider: { height: 1, backgroundColor: C.ink3, marginLeft: S[4] },
  dangerRow: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: S[4],
    minHeight: 52,
  },
  dangerText: { fontSize: T.base, color: C.danger, fontWeight: '600' },
  dangerTextDisabled: { color: C.ink4 },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: S[4],
    paddingVertical: S[4],
    minHeight: 64,
  },
  actionRowDisabled: { opacity: 0.45 },
  actionContent: { flex: 1, gap: 2 },
  actionLabel: { fontSize: T.base, color: C.cream, fontWeight: '600' },
  actionLabelDisabled: { color: C.ash },
  actionSub: { fontSize: T.sm, color: C.ash },
  progressText: { fontSize: T.xs, color: C.amber },
  actionChevron: { fontSize: 22, color: C.ash },
  exportHint: {
    fontSize: T.xs,
    color: C.ink4,
    marginHorizontal: S[2],
    marginBottom: S[2],
    lineHeight: 18,
  },
  footer: {
    fontSize: T.sm,
    color: C.ink4,
    textAlign: 'center',
    marginTop: S[6],
    lineHeight: 20,
  },
});
