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
  Pressable,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  TextInput,
  Platform,
  Switch,
} from 'react-native';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDocumentStore, useAppStore, useProStore } from '@/store';
import { PaywallModal } from '@/components/PaywallModal';
import { ScreenHeader } from '@/components/ScreenHeader';
import { deleteDocumentFiles } from '@/services/fileStorage';
import { exportAllAsZip } from '@/services/exportService';
import { createBackup, restoreBackup } from '@/services/backupService';
import { getBiometricCapability, authenticate } from '@/services/biometricService';
import { isBackendConfigured } from '@/services/api';
import { resetSyncState } from '@/services/syncService';
import { isAdminBypassConfigured, validateAdminBypassCode } from '@/services/adminAccess';
import { deleteStoredPasswordHash } from '@/services/secureCredentials';
import { C, T, R, S } from '@/theme/tokens';

const APP_VERSION = Constants.expoConfig?.version ?? 'Unknown';
const BUILD = Platform.OS === 'ios'
  ? Constants.expoConfig?.ios?.buildNumber ?? Constants.nativeBuildVersion ?? 'Unknown'
  : Platform.OS === 'android'
    ? String(Constants.expoConfig?.android?.versionCode ?? Constants.nativeBuildVersion ?? 'Unknown')
    : APP_VERSION;

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const documents = useDocumentStore(s => s.documents);
  const folders = useDocumentStore(s => s.folders);
  const biometricEnabled = useAppStore(s => s.biometricEnabled);
  const setBiometricEnabled = useAppStore(s => s.setBiometricEnabled);
  const accountProfile = useAppStore(s => s.accountProfile);
  const clearAccountSession = useAppStore(s => s.clearAccountSession);
  const clearAccountProfile = useAppStore(s => s.clearAccountProfile);

  const aiUsageCostUsd = useAppStore(s => s.aiUsageCostUsd);
  const aiUsageCallCount = useAppStore(s => s.aiUsageCallCount);

  const isPro = useProStore(s => s.isPro);
  const checkPro = useProStore(s => s.checkPro);
  const hasAdminAccess = useProStore(s => s.hasAdminAccess);
  const setAdminAccess = useProStore(s => s.setAdminAccess);
  const [showPaywall, setShowPaywall] = useState(false);
  const [showAdminUnlock, setShowAdminUnlock] = useState(false);
  const [adminCode, setAdminCode] = useState('');
  const [adminError, setAdminError] = useState<string | null>(null);

  const [biometricLabel, setBiometricLabel] = useState('Biometric Lock');
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState<string | null>(null);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [backupProgress, setBackupProgress] = useState<string | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreProgress, setRestoreProgress] = useState<string | null>(null);
  const [isResettingSync, setIsResettingSync] = useState(false);
  const backendConfigured = isBackendConfigured();
  const adminBypassConfigured = isAdminBypassConfigured();

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
    if (!isPro) {
      setShowPaywall(true);
      return;
    }
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
    if (!isPro) {
      setShowPaywall(true);
      return;
    }
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

  const handleAdminUnlock = () => {
    if (validateAdminBypassCode(adminCode)) {
      setAdminAccess(true);
      setAdminCode('');
      setAdminError(null);
      setShowAdminUnlock(false);
      Alert.alert('Owner Access Enabled', 'This device now bypasses the Pro paywall.');
      return;
    }

    setAdminError('Code did not match the configured owner access secret.');
  };

  const handleDisableAdminAccess = () => {
    setAdminAccess(false);
    setAdminCode('');
    setAdminError(null);
    setShowAdminUnlock(false);
    void checkPro();
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'You will need to log back into your FileTrail account on this device before reopening the vault.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: () => {
            clearAccountSession();
            router.replace('/account');
          },
        },
      ],
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This removes your FileTrail account from this device and permanently deletes the local vault, including all documents and folders. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: async () => {
            setIsDeletingAccount(true);
            try {
              await Promise.all(
                documents.map((d) => deleteDocumentFiles(d.id).catch(() => undefined)),
              );

              const documentIds = documents.map((d) => d.id);
              const folderIds = folders.map((f) => f.id);

              useDocumentStore.setState((state) => ({
                documents: [],
                folders: [],
                deletedDocumentIds: Array.from(new Set([...state.deletedDocumentIds, ...documentIds])),
                deletedFolderIds: Array.from(new Set([...state.deletedFolderIds, ...folderIds])),
              }));

              await deleteStoredPasswordHash();
              setAdminAccess(false);
              clearAccountProfile();
              router.replace('/account');
            } finally {
              setIsDeletingAccount(false);
            }
          },
        },
      ],
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScreenHeader title="Settings" />

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

        {/* Sync */}
        {backendConfigured && (
          <>
            <SectionHeader title="Sync" />
            <View style={styles.card}>
              <Pressable
                style={({ pressed }) => [
                  styles.accountActionRow,
                  (pressed || isResettingSync) && { opacity: 0.75 },
                ]}
                onPress={handleResetSyncData}
                disabled={isResettingSync}
              >
                {isResettingSync ? (
                  <ActivityIndicator color={C.ash} />
                ) : (
                  <Text style={styles.accountActionText}>Reset Sync Data</Text>
                )}
              </Pressable>
            </View>
            <Text style={styles.hint}>
              Forgets this device’s sync identity so the next sync re-registers it and pulls a full snapshot. Your documents are not affected.
            </Text>
          </>
        )}

        {/* AI Usage */}
        <SectionHeader title="AI Usage" />
        <View style={styles.card}>
          <SettingsRow label="Estimated Spend" value={formatUsd(aiUsageCostUsd)} />
          <Divider />
          <SettingsRow label="AI Calls" value={`${aiUsageCallCount}`} />
        </View>
        <Text style={styles.hint}>
          Estimated cost of Claude API calls made for AI Organize on this device, based on Claude Haiku pricing.
        </Text>
        {(() => {
          const warning = spendWarning(aiUsageCostUsd);
          if (!warning) return null;
          return (
            <View style={[styles.spendWarning, warning.tone === 'danger' && styles.spendWarningDanger]}>
              <Text style={[styles.spendWarningText, warning.tone === 'danger' && styles.spendWarningTextDanger]}>
                {warning.message}
              </Text>
            </View>
          );
        })()}

        {/* Account */}
        <SectionHeader title="Account" />
        <View style={styles.card}>
          <SettingsRow label="Name" value={accountProfile?.fullName ?? 'Unknown'} />
          <Divider />
          <SettingsRow label="Email" value={accountProfile?.email ?? 'Unknown'} />
          <Divider />
          <SettingsRow
            label="Sign-in Method"
            value={accountProfile?.provider === 'apple' ? 'Apple' : 'Email'}
          />
        </View>
        <View style={styles.card}>
          <Pressable
            style={({ pressed }) => [styles.accountActionRow, pressed && { opacity: 0.75 }]}
            onPress={handleSignOut}
          >
            <Text style={styles.accountActionText}>Sign Out</Text>
          </Pressable>
          <Divider />
          <Pressable
            style={({ pressed }) => [
              styles.accountActionRow,
              (pressed || isDeletingAccount) && { opacity: 0.75 },
            ]}
            onPress={handleDeleteAccount}
            disabled={isDeletingAccount}
          >
            {isDeletingAccount ? (
              <ActivityIndicator color={C.danger} />
            ) : (
              <Text style={styles.accountDeleteText}>Delete Account</Text>
            )}
          </Pressable>
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
          Backups include all document files and metadata. The .ptbak file isn't password-protected, so store it somewhere only you can access — iCloud, Google Drive, or another location you control.
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
            <Text style={styles.proPrice}>{isPro ? 'Pro unlocked' : 'From $4.99/mo'}</Text>
            <Pressable
              style={({ pressed }) => [
                styles.proCTA,
                isPro && styles.proCTADisabled,
                pressed && !isPro && { opacity: 0.8 },
              ]}
              onPress={() => setShowPaywall(true)}
              disabled={isPro}
              accessibilityRole="button"
              accessibilityLabel={isPro ? 'FileTrail Pro is already unlocked' : 'Unlock FileTrail Pro'}
            >
              <Text style={styles.proCTAText}>{isPro ? 'Pro Active' : 'Unlock Pro'}</Text>
            </Pressable>
          </View>
          {adminBypassConfigured && (
            <View style={styles.adminPanel}>
              <View style={styles.adminHeader}>
                <View>
                  <Text style={styles.adminTitle}>Owner Access</Text>
                  <Text style={styles.adminBody}>
                    {hasAdminAccess
                      ? 'This device currently bypasses the Pro paywall.'
                      : 'Enter the configured owner access code to unlock Pro on this device.'}
                  </Text>
                </View>
                {hasAdminAccess ? (
                  <Pressable
                    style={({ pressed }) => [styles.adminBtnSecondary, pressed && { opacity: 0.85 }]}
                    onPress={handleDisableAdminAccess}
                  >
                    <Text style={styles.adminBtnSecondaryText}>Disable</Text>
                  </Pressable>
                ) : (
                  <Pressable
                    style={({ pressed }) => [styles.adminBtnSecondary, pressed && { opacity: 0.85 }]}
                    onPress={() => {
                      setAdminError(null);
                      setShowAdminUnlock(v => !v);
                    }}
                  >
                    <Text style={styles.adminBtnSecondaryText}>
                      {showAdminUnlock ? 'Hide' : 'Enter Code'}
                    </Text>
                  </Pressable>
                )}
              </View>
              {showAdminUnlock && !hasAdminAccess && (
                <View style={styles.adminUnlockBox}>
                  <TextInput
                    style={styles.adminInput}
                    value={adminCode}
                    onChangeText={(value) => {
                      setAdminCode(value);
                      if (adminError) setAdminError(null);
                    }}
                    placeholder="Owner access code"
                    placeholderTextColor={C.ash}
                    autoCapitalize="none"
                    autoCorrect={false}
                    secureTextEntry
                  />
                  {adminError && <Text style={styles.adminError}>{adminError}</Text>}
                  <Pressable
                    style={({ pressed }) => [
                      styles.adminBtnPrimary,
                      adminCode.trim().length === 0 && styles.adminBtnDisabled,
                      pressed && adminCode.trim().length > 0 && { opacity: 0.85 },
                    ]}
                    onPress={handleAdminUnlock}
                    disabled={adminCode.trim().length === 0}
                  >
                    <Text style={styles.adminBtnPrimaryText}>Enable Owner Access</Text>
                  </Pressable>
                </View>
              )}
            </View>
          )}
        </View>

        {/* About */}
        <SectionHeader title="About" />
        <View style={styles.card}>
          <SettingsRow label="Version" value={APP_VERSION} />
          <Divider />
          <SettingsRow label="Build" value={BUILD} />
          <Divider />
          <SettingsRow label="Storage" value={backendConfigured ? 'Device + cloud file backup' : 'On-device only'} />
        </View>

        <Text style={styles.footer}>
          {backendConfigured
            ? 'FileTrail keeps local copies on your device and mirrors document files to your configured cloud backend.'
            : 'FileTrail stores all your documents privately on your device.\nNothing is uploaded to any server.'}
        </Text>
      </ScrollView>

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

function formatUsd(amount: number): string {
  if (amount === 0) return '$0.00';
  if (amount < 0.01) return '< $0.01';
  return `$${amount.toFixed(2)}`;
}

/** Soft heads-up once on-device AI spend crosses friendly checkpoints. */
function spendWarning(amount: number): { tone: 'amber' | 'danger'; message: string } | null {
  if (amount >= 5) {
    return { tone: 'danger', message: `You’ve spent ${formatUsd(amount)} on AI Organize on this device — keep an eye on it.` };
  }
  if (amount >= 1) {
    return { tone: 'amber', message: `You’ve crossed ${formatUsd(amount)} in AI Organize spend on this device.` };
  }
  return null;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.ink1 },
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
  accountActionRow: { alignItems: 'center', justifyContent: 'center', paddingVertical: S[4], minHeight: 52 },
  accountActionText: { fontSize: T.base, color: C.cream, fontWeight: '600' },
  accountDeleteText: { fontSize: T.base, color: C.danger, fontWeight: '600' },
  actionRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: S[4], paddingVertical: S[4], minHeight: 64 },
  actionContent: { flex: 1, gap: 2 },
  actionLabel: { fontSize: T.base, color: C.cream, fontWeight: '600' },
  actionLabelDisabled: { color: C.ash },
  actionSub: { fontSize: T.sm, color: C.ash },
  actionChevron: { fontSize: 22, color: C.ash },
  hint: { fontSize: T.xs, color: C.ink4, marginHorizontal: S[2], marginBottom: S[2], lineHeight: 18 },
  spendWarning: {
    backgroundColor: C.amberDim,
    borderRadius: R.md,
    paddingHorizontal: S[3],
    paddingVertical: S[2] + 2,
    marginHorizontal: S[2],
    marginBottom: S[3],
  },
  spendWarningDanger: { backgroundColor: C.danger + '22' },
  spendWarningText: { fontSize: T.xs, color: C.amber, fontWeight: '600', lineHeight: 18 },
  spendWarningTextDanger: { color: C.danger },
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
  proCTADisabled: {
    opacity: 0.65,
  },
  proCTAText: { fontSize: T.sm, fontWeight: '700', color: C.ink1 },
  adminPanel: {
    marginTop: S[2],
    borderTopWidth: 1,
    borderTopColor: C.ink4,
    paddingTop: S[3],
    gap: S[3],
  },
  adminHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: S[3],
  },
  adminTitle: {
    fontSize: T.sm,
    fontWeight: '700',
    color: C.cream,
    marginBottom: 4,
  },
  adminBody: {
    fontSize: T.xs,
    color: C.ash,
    lineHeight: 18,
    maxWidth: 220,
  },
  adminUnlockBox: {
    gap: S[2],
  },
  adminInput: {
    backgroundColor: C.ink1,
    borderRadius: R.md,
    minHeight: 44,
    paddingHorizontal: S[3],
    color: C.cream,
    borderWidth: 1,
    borderColor: C.ink4,
  },
  adminError: {
    fontSize: T.xs,
    color: C.danger,
  },
  adminBtnPrimary: {
    backgroundColor: C.amber,
    borderRadius: R.lg,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  adminBtnDisabled: {
    opacity: 0.55,
  },
  adminBtnPrimaryText: {
    fontSize: T.sm,
    fontWeight: '700',
    color: C.ink1,
  },
  adminBtnSecondary: {
    borderWidth: 1,
    borderColor: C.amber + '66',
    borderRadius: R.md,
    minHeight: 36,
    paddingHorizontal: S[3],
    alignItems: 'center',
    justifyContent: 'center',
  },
  adminBtnSecondaryText: {
    fontSize: T.xs,
    fontWeight: '700',
    color: C.amber,
  },
});
