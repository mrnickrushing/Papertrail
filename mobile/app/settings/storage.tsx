import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text } from 'react-native';
import { useDocumentStore, useProStore } from '@/store';
import { PaywallModal } from '@/components/PaywallModal';
import { deleteDocumentFiles } from '@/services/fileStorage';
import { exportAllAsZip } from '@/services/exportService';
import { createBackup, restoreBackup } from '@/services/backupService';
import { isBackendConfigured } from '@/services/api';
import { resetSyncState } from '@/services/syncService';
import {
  SettingsSubpageShell,
  SectionHeader,
  SettingsCard,
  SettingsRow,
  Divider,
  ActionRow,
  Hint,
  formatBytes,
} from '@/components/settings/SettingsUi';
import { C, T, S } from '@/theme/tokens';

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}

export default function StorageSettingsScreen() {
  const documents = useDocumentStore((s) => s.documents);
  const folders = useDocumentStore((s) => s.folders);
  const isPro = useProStore((s) => s.isPro);
  const checkPro = useProStore((s) => s.checkPro);

  const [showPaywall, setShowPaywall] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState<string | null>(null);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [backupProgress, setBackupProgress] = useState<string | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreProgress, setRestoreProgress] = useState<string | null>(null);
  const [isResettingSync, setIsResettingSync] = useState(false);

  const backendConfigured = isBackendConfigured();
  const totalSize = useMemo(
    () => documents.reduce((sum, doc) => sum + (doc.fileSizeBytes ?? 0), 0),
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
              await Promise.all(documents.map((doc) => deleteDocumentFiles(doc.id).catch(() => undefined)));
              const documentIds = documents.map((doc) => doc.id);
              const folderIds = folders.map((folder) => folder.id);
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

  const requirePro = (action: () => Promise<void> | void) => {
    if (!isPro) {
      setShowPaywall(true);
      return;
    }
    void action();
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

              const existing = useDocumentStore.getState();
              const existingIds = new Set(existing.documents.map((doc) => doc.id));
              const newDocs = result.documents.filter((doc) => !existingIds.has(doc.id));
              const existingFolderIds = new Set(existing.folders.map((folder) => folder.id));
              const newFolders = result.folders.filter((folder) => !existingFolderIds.has(folder.id));

              useDocumentStore.setState({
                documents: [...newDocs, ...existing.documents],
                folders: [...newFolders, ...existing.folders],
                deletedDocumentIds: existing.deletedDocumentIds.filter(
                  (id) => !newDocs.some((doc) => doc.id === id),
                ),
                deletedFolderIds: existing.deletedFolderIds.filter(
                  (id) => !newFolders.some((folder) => folder.id === id),
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

  const handleResetSyncData = () => {
    Alert.alert(
      'Reset Sync Data',
      'This forgets this device’s sync identity on this device only. Your documents are not touched — the next sync will re-register this device and pull a full snapshot from the server.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            setIsResettingSync(true);
            try {
              await resetSyncState();
              Alert.alert('Sync Data Reset', 'This device will re-sync from scratch next time it connects.');
            } catch (err: unknown) {
              Alert.alert('Reset Failed', errorMessage(err, 'Could not reset sync data.'));
            } finally {
              setIsResettingSync(false);
            }
          },
        },
      ],
    );
  };

  return (
    <SettingsSubpageShell title="Storage & Backup">
      <SectionHeader title="Storage" />
      <SettingsCard>
        <SettingsRow label="Documents" value={`${documents.length}`} />
        <Divider />
        <SettingsRow label="Folders" value={`${folders.length}`} />
        <Divider />
        <SettingsRow label="Disk Usage" value={formatBytes(totalSize)} />
      </SettingsCard>

      {backendConfigured && (
        <>
          <SectionHeader title="Sync" />
          <SettingsCard>
            <Pressable
              style={({ pressed }) => [styles.centerRow, (pressed || isResettingSync) && styles.pressed]}
              onPress={handleResetSyncData}
              disabled={isResettingSync}
            >
              {isResettingSync ? <ActivityIndicator color={C.ash} /> : <Text style={styles.centerRowText}>Reset Sync Data</Text>}
            </Pressable>
          </SettingsCard>
          <Hint>
            Forgets this device’s sync identity so the next sync re-registers it and pulls a full snapshot.
          </Hint>
        </>
      )}

      <SectionHeader title="Backup & Restore" />
      <SettingsCard>
        <ActionRow
          label="Create Backup"
          sub={backupProgress ?? `${documents.length} doc${documents.length === 1 ? '' : 's'} · saves a .ptbak file`}
          loading={isBackingUp}
          disabled={isBackingUp || documents.length === 0}
          onPress={() => requirePro(handleBackup)}
        />
        <Divider />
        <ActionRow
          label="Restore from Backup"
          sub={restoreProgress ?? 'Choose a .ptbak file to import'}
          loading={isRestoring}
          disabled={isRestoring}
          onPress={() => requirePro(handleRestore)}
        />
      </SettingsCard>
      <Hint>
        Backups include all document files and metadata. Store the .ptbak file somewhere only you can access.
      </Hint>

      <SectionHeader title="Export" />
      <SettingsCard>
        <ActionRow
          label="Export All as ZIP"
          sub={exportProgress ?? `${documents.length} doc${documents.length === 1 ? '' : 's'} · ${formatBytes(totalSize)}`}
          loading={isExporting}
          disabled={isExporting || documents.length === 0}
          onPress={handleExportZip}
        />
      </SettingsCard>

      <SectionHeader title="Danger Zone" />
      <SettingsCard>
        <Pressable
          style={({ pressed }) => [styles.centerRow, (pressed || isClearing || documents.length === 0) && styles.pressed]}
          onPress={handleClearAll}
          disabled={isClearing || documents.length === 0}
        >
          {isClearing ? (
            <ActivityIndicator color={C.danger} />
          ) : (
            <Text style={[styles.clearText, documents.length === 0 && styles.clearTextDisabled]}>
              Clear All Documents
            </Text>
          )}
        </Pressable>
      </SettingsCard>

      {showPaywall && (
        <PaywallModal
          visible={showPaywall}
          onClose={() => setShowPaywall(false)}
          onSuccess={() => {
            setShowPaywall(false);
            void checkPro();
          }}
        />
      )}
    </SettingsSubpageShell>
  );
}

const styles = StyleSheet.create({
  centerRow: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: S[4],
  },
  centerRowText: {
    fontSize: T.base,
    color: C.cream,
    fontWeight: '600',
  },
  clearText: {
    fontSize: T.base,
    color: C.danger,
    fontWeight: '600',
  },
  clearTextDisabled: {
    color: C.ink4,
  },
  pressed: {
    opacity: 0.78,
  },
});
