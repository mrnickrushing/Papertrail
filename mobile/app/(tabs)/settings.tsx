/**
 * settings.tsx — App settings screen (Phase 8)
 *
 * Sections:
 *   - Security: biometric lock toggle
 *   - Storage: total docs, disk usage, clear all
 *   - Backup & Restore: create/restore .ptbak
 *   - Export: ZIP export
 *   - About: version, build
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  Linking,
  Pressable,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDocumentStore } from '@/store/documentStore';
import { useAppStore } from '@/store/appStore';
import { deleteDocumentFiles } from '@/services/fileStorage';
import { exportAllAsZip } from '@/services/exportService';
import { createBackup, restoreBackup } from '@/services/backupService';
import { getBiometricCapability, authenticate } from '@/services/biometricService';
import { isBackendConfigured } from '@/services/api';
import { C, T, R, S } from '@/theme/tokens';

const APP_VERSION = '1.1.0';
const BUILD = '2026.06';

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const documents = useDocumentStore(s => s.documents);
  const folders = useDocumentStore(s => s.folders);
  const biometricEnabled = useAppStore(s => s.biometricEnabled);
  const setBiometricEnabled = useAppStore(s => s.setBiometricEnabled);

  const [biometricLabel, setBiometricLabel] = useState('Biometric Lock');
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState<string | null>(null);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [backupProgress, setBackupProgress] = useState<string | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreProgress, setRestoreProgress] = useState<string | null>(null);
  const backendConfigured = isBackendConfigured();

  useEffect(() => {
    getBiometricCapability().then(cap => {
      setBiometricAvailable(cap.available);
      if (cap.available) setBiometricLabel(cap.label);
    });
  }, []);

  const handleToggleBiometric = async (value: boolean) => {
    if (value) {
      // Require auth before enabling to prove device ownership
      const success = await authenticate('Confirm to enable biometric lock');
      if (!success) {
        Alert.alert('Authentication Required', 'Could not verify biometric identity.');
        return;
      }
    }
    setBiometricEnabled(value);
  };

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
              const documentIds = documents.map(d => d.id);
              const folderIds = folders.map(f => f.id);
              useDocumentStore.setState((state) => ({
                documents: [],
                folders: [],
                deletedDocumentIds: Array.from(new Set([...state.deletedDocumentIds, ...documentIds])),
                deletedFolderIds: Array.from(new Set([...state.deletedFolderIds, ...folderIds])),
              }));
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
    } catch (err: unknown) {
      Alert.alert('Export Failed', errorMessage(err, 'Something went wrong.'));
    } finally {
      setIsExporting(false);
      setExportProgress(null);
    }
  };

  const handleBackup = async () => {
    if (documents.length === 0) {
      Alert.alert('Nothing to Back Up', 'Add some documents first.');
      return;
    }
    setIsBackingUp(true);
    setBackupProgress(null);
    try {
      await createBackup(documents, folders, ({ current, total, label }) => {
        setBackupProgress(`Reading ${current}/${total}: ${label}`);
      });
    } catch (err: unknown) {
      Alert.alert('Backup Failed', errorMessage(err, 'Something went wrong.'));
    } finally {
      setIsBackingUp(false);
      setBackupProgress(null);
    }
  };

  const handleRestore = async () => {
    Alert.alert(
      'Restore Backup',
      'This will add documents from the backup to your vault. Existing documents are not deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Choose Backup File',
          onPress: async () => {
            setIsRestoring(true);
            setRestoreProgress('Picking file…');
            try {
              const result = await restoreBackup(({ current, total, label }) => {
                setRestoreProgress(`Restoring ${current}/${total}: ${label}`);
              });

              // Merge restored docs into store (skip duplicates by id)
              const existing = useDocumentStore.getState();
              const existingIds = new Set(existing.documents.map(d => d.id));
              const newDocs = result.documents.filter(d => !existingIds.has(d.id));
              const existingFolderIds = new Set(existing.folders.map(f => f.id));
              const newFolders = result.folders.filter(f => !existingFolderIds.has(f.id));

              useDocumentStore.setState({
                documents: [...newDocs, ...existing.documents],
                folders: [...newFolders, ...existing.folders],
                deletedDocumentIds: existing.deletedDocumentIds.filter(
                  id => !newDocs.some(doc => doc.id === id)
                ),
                deletedFolderIds: existing.deletedFolderIds.filter(
                  id => !newFolders.some(folder => folder.id === id)
                ),
              });

              Alert.alert(
                'Restore Complete',
                `Restored ${newDocs.length} document${newDocs.length === 1 ? '' : 's'}${result.skipped > 0 ? ` (${result.skipped} skipped — files missing from backup)` : ''}.`,
              );
            } catch (err: unknown) {
              Alert.alert('Restore Failed', errorMessage(err, 'Could not read backup file.'));
            } finally {
              setIsRestoring(false);
              setRestoreProgress(null);
            }
          },
        },
      ],
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.screenTitle}>Settings</Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
      >
        {/* Security */}
        <SectionHeader title="Security" />
        <View style={styles.card}>
          <View style={styles.switchRow}>
            <View style={styles.switchInfo}>
              <Text style={[styles.rowLabel, !biometricAvailable && styles.rowLabelDisabled]}>
                {biometricLabel}
              </Text>
              <Text style={styles.switchSub}>
                {biometricAvailable
                  ? biometricEnabled
                    ? `Vault locks when app backgrounds`
                    : 'Enable to lock vault on backgrounding'
                  : 'Not available on this device'}
              </Text>
            </View>
            <Switch
              value={biometricEnabled}
              onValueChange={handleToggleBiometric}
              disabled={!biometricAvailable}
              trackColor={{ false: C.ink4, true: C.amber }}
              thumbColor={biometricEnabled ? C.ink1 : C.ash}
            />
          </View>
        </View>

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
            {isClearing
              ? <ActivityIndicator color={C.danger} />
              : <Text style={[styles.dangerText, documents.length === 0 && styles.dangerTextDisabled]}>
                  Clear All Documents
                </Text>
            }
          </Pressable>
        </View>

        {/* Backup & Restore */}
        <SectionHeader title="Backup & Restore" />
        <View style={styles.card}>
          <ActionRow
            label="Create Backup"
            sub={backupProgress ?? `${documents.length} doc${documents.length === 1 ? '' : 's'} · saves a .ptbak file`}
            loading={isBackingUp}
            disabled={isBackingUp || documents.length === 0}
            onPress={handleBackup}
          />
          <Divider />
          <ActionRow
            label="Restore from Backup"
            sub={restoreProgress ?? 'Choose a .ptbak file to import'}
            loading={isRestoring}
            disabled={isRestoring}
            onPress={handleRestore}
          />
        </View>
        <Text style={styles.hint}>
          Backups include all document files and metadata. Save the .ptbak file to iCloud, Google Drive, or any location you control.
        </Text>

        {/* Export */}
        <SectionHeader title="Export" />
        <View style={styles.card}>
          <ActionRow
            label="Export All as ZIP"
            sub={exportProgress ?? `${documents.length} doc${documents.length === 1 ? '' : 's'} · ${formatBytes(totalSize)}`}
            loading={isExporting}
            disabled={isExporting || documents.length === 0}
            onPress={handleExportZip}
          />
        </View>
        <Text style={styles.hint}>
          To share a single document, open it and tap ↑ in the top right.
        </Text>

        {/* Pro Upsell */}
        <SectionHeader title="Upgrade" />
        <View style={styles.proCard}>
          <View style={styles.proCardHeader}>
            <Text style={styles.proTitle}>FileTrail Pro</Text>
            <View style={styles.proBadge}><Text style={styles.proBadgeText}>PRO</Text></View>
          </View>
          <Text style={styles.proBody}>
            Cloud sync across devices, AI auto-naming, expiry detection, shared vaults, and natural-language search.
          </Text>
          <View style={styles.proFeatures}>
            {['☁️ Encrypted cloud sync', '🤖 AI auto-naming', '⏰ Expiry detection', '👥 Shared vaults'].map(f => (
              <Text key={f} style={styles.proFeatureItem}>{f}</Text>
            ))}
          </View>
          <View style={styles.proAction}>
            <Text style={styles.proPrice}>From $4.99/mo</Text>
            <Pressable
              style={({ pressed }) => [styles.proCTA, pressed && { opacity: 0.8 }]}
              onPress={() => Linking.openURL('https://filetrail.app/pro')}
              accessibilityRole="link"
              accessibilityLabel="Learn more about FileTrail Pro"
            >
              <Text style={styles.proCTAText}>Learn More →</Text>
            </Pressable>
          </View>
        </View>

        {/* About */}
        <SectionHeader title="About" />
        <View style={styles.card}>
          <SettingsRow label="Version" value={APP_VERSION} />
          <Divider />
          <SettingsRow label="Build" value={BUILD} />
          <Divider />
          <SettingsRow label="Storage" value={backendConfigured ? 'Device + cloud metadata' : 'On-device only'} />
        </View>

        <Text style={styles.footer}>
          {backendConfigured
            ? 'FileTrail keeps document files on your device and syncs metadata with your configured backend.'
            : 'FileTrail stores all your documents privately on your device.\nNothing is uploaded to any server.'}
        </Text>
      </ScrollView>
    </View>
  );
}

// ── Small helper components ────────────────────────────────────────────────────

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

function ActionRow({
  label, sub, loading, disabled, onPress,
}: {
  label: string; sub: string; loading: boolean; disabled: boolean; onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.actionRow, (pressed || disabled) && { opacity: 0.7 }]}
      onPress={onPress}
      disabled={disabled}
    >
      <View style={styles.actionContent}>
        <Text style={[styles.actionLabel, disabled && !loading && styles.actionLabelDisabled]}>
          {label}
        </Text>
        <Text style={styles.actionSub} numberOfLines={1}>{sub}</Text>
      </View>
      {loading ? <ActivityIndicator color={C.amber} /> : <Text style={styles.actionChevron}>›</Text>}
    </Pressable>
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
  header: { paddingHorizontal: S[4], paddingVertical: S[4], borderBottomWidth: 1, borderBottomColor: C.ink3 },
  screenTitle: { fontSize: T.xl, fontWeight: '700', color: C.cream },
  content: { padding: S[4], gap: S[2] },
  sectionHeader: {
    fontSize: T.xs, fontWeight: '600', color: C.ash,
    textTransform: 'uppercase', letterSpacing: 0.8,
    marginTop: S[4], marginBottom: S[1], marginLeft: S[2],
  },
  card: { backgroundColor: C.ink2, borderRadius: R.lg, overflow: 'hidden', marginBottom: S[2] },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: S[4], paddingVertical: S[4], minHeight: 52 },
  rowLabel: { flex: 1, fontSize: T.base, color: C.cream },
  rowLabelDisabled: { color: C.ash },
  switchRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: S[4], paddingVertical: S[3], minHeight: 60 },
  switchInfo: { flex: 1, gap: 2 },
  switchSub: { fontSize: T.xs, color: C.ash },
  rowValue: { fontSize: T.base, color: C.ash, fontWeight: '500' },
  divider: { height: 1, backgroundColor: C.ink3, marginLeft: S[4] },
  dangerRow: { alignItems: 'center', justifyContent: 'center', paddingVertical: S[4], minHeight: 52 },
  dangerText: { fontSize: T.base, color: C.danger, fontWeight: '600' },
  dangerTextDisabled: { color: C.ink4 },
  actionRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: S[4], paddingVertical: S[4], minHeight: 64 },
  actionContent: { flex: 1, gap: 2 },
  actionLabel: { fontSize: T.base, color: C.cream, fontWeight: '600' },
  actionLabelDisabled: { color: C.ash },
  actionSub: { fontSize: T.sm, color: C.ash },
  actionChevron: { fontSize: 22, color: C.ash },
  hint: { fontSize: T.xs, color: C.ink4, marginHorizontal: S[2], marginBottom: S[2], lineHeight: 18 },
  footer: { fontSize: T.sm, color: C.ink4, textAlign: 'center', marginTop: S[6], lineHeight: 20 },
  proCard: {
    backgroundColor: C.ink2,
    borderRadius: R.lg,
    overflow: 'hidden',
    marginBottom: S[2],
    borderWidth: 1,
    borderColor: C.amber + '55',
    padding: S[4],
    gap: S[3],
    shadowColor: C.amber,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  proCardHeader: { flexDirection: 'row', alignItems: 'center', gap: S[2] },
  proTitle: { fontSize: T.lg, fontWeight: '700', color: C.cream, flex: 1 },
  proBadge: {
    backgroundColor: C.amber,
    borderRadius: R.sm,
    paddingHorizontal: S[2],
    paddingVertical: 2,
  },
  proBadgeText: { fontSize: T.xs, fontWeight: '700', color: C.ink1, letterSpacing: 0.5 },
  proBody: { fontSize: T.sm, color: C.ash, lineHeight: 20 },
  proFeatures: { gap: S[1] },
  proFeatureItem: { fontSize: T.sm, color: C.ash },
  proAction: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: S[1] },
  proPrice: { fontSize: T.sm, color: C.ash },
  proCTA: {
    backgroundColor: C.amber,
    borderRadius: R.lg,
    paddingHorizontal: S[4],
    paddingVertical: S[2],
  },
  proCTAText: { fontSize: T.sm, fontWeight: '700', color: C.ink1 },
});
