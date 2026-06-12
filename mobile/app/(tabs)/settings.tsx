import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useDocumentStore, useAppStore, useProStore } from '@/store';
import { TourBubble } from '@/components/TourBubble';
import { useTourTip } from '@/hooks/useTourTip';
import { TourBubble } from '@/components/TourBubble';
import { useTourTip } from '@/hooks/useTourTip';
import { PaywallModal } from '@/components/PaywallModal';
import { FAB } from '@/components/FAB';
import {
  SettingsTabShell,
  SectionHeader,
  SettingsCard,
  SettingsNavRow,
  Hint,
  formatBytes,
} from '@/components/settings/SettingsUi';
import { C, R, S, T } from '@/theme/tokens';

export default function SettingsScreen() {
  const router = useRouter();
  const documents = useDocumentStore((s) => s.documents);
  const accountProfile = useAppStore((s) => s.accountProfile);
  const biometricEnabled = useAppStore((s) => s.biometricEnabled);
  const isPro = useProStore((s) => s.isPro);
  const checkPro = useProStore((s) => s.checkPro);
  const [showPaywall, setShowPaywall] = React.useState(false);

  const totalSize = React.useMemo(
    () => documents.reduce((sum, doc) => sum + (doc.fileSizeBytes ?? 0), 0),
    [documents],
  );

  const docsLabel = `${documents.length} doc${documents.length === 1 ? '' : 's'} • ${formatBytes(totalSize)}`;
  const backupLabel = isPro
    ? `${documents.length} doc${documents.length === 1 ? '' : 's'} ready to back up`
    : 'Upgrade to enable vault backups';

  return (
    <SettingsTabShell
      title="Settings"
      overlay={<FAB onPress={() => router.push('/capture')} />}
    >
      {documents.length >= 5 && (
        <Pressable
          style={({ pressed }) => [styles.backupBanner, pressed && styles.pressed]}
          onPress={() => router.push('/settings/storage')}
        >
          <View style={styles.backupBannerCopy}>
            <Text style={styles.backupBannerTitle}>Back up your vault</Text>
            <Text style={styles.backupBannerBody}>
              {backupLabel}
            </Text>
          </View>
          <Text style={styles.backupBannerAction}>Open</Text>
        </Pressable>
      )}

      <SectionHeader title="Workspace" />
      <SettingsCard>
        <SettingsNavRow
          label="Account"
          value={accountProfile?.email ?? 'Manage sign-in and owner access'}
          icon="user"
          onPress={() => router.push('/settings/account')}
        />
        <SettingsNavRow
          label="Storage & Backup"
          value={docsLabel}
          icon="hard-drive"
          onPress={() => router.push('/settings/storage')}
        />
        <SettingsNavRow
          label="Security"
          value={biometricEnabled ? 'Biometric lock on' : 'Biometric lock off'}
          icon="shield"
          onPress={() => router.push('/settings/security')}
        />
        <SettingsNavRow
          label="About"
          value="Version, build, and AI usage"
          icon="info"
          onPress={() => router.push('/settings/about')}
        />
      </SettingsCard>

      <SectionHeader title="Upgrade" />
      <View style={styles.proCard}>
        <View style={styles.proCardHeader}>
          <Text style={styles.proTitle}>FileTrail Pro</Text>
          <View style={styles.proBadge}><Text style={styles.proBadgeText}>PRO</Text></View>
        </View>
        <Text style={styles.proBody}>
          Cloud sync across devices, AI auto-naming, expiry detection, shared vaults, and backup workflows.
        </Text>
        <View style={styles.proFeatures}>
          {['☁️ Encrypted cloud sync', '🤖 AI auto-naming', '🗂 Smart filing', '💾 Backup & restore'].map((feature) => (
            <Text key={feature} style={styles.proFeatureItem}>{feature}</Text>
          ))}
        </View>
        <View style={styles.proAction}>
          <Text style={styles.proPrice}>{isPro ? 'Pro unlocked' : 'From $4.99/mo'}</Text>
          <Pressable
            style={({ pressed }) => [
              styles.proCTA,
              isPro && styles.proCTADisabled,
              pressed && !isPro && styles.pressed,
            ]}
            onPress={() => setShowPaywall(true)}
            disabled={isPro}
            accessibilityRole="button"
            accessibilityLabel={isPro ? 'FileTrail Pro is already unlocked' : 'Unlock FileTrail Pro'}
          >
            <Text style={styles.proCTAText}>{isPro ? 'Pro Active' : 'Unlock Pro'}</Text>
          </Pressable>
        </View>
      </View>

      <Hint>
        Capture is available everywhere now. Use the + button from any tab to add a document without jumping back to Vault.
      </Hint>

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
      <SettingsTourTip />
    </SettingsTabShell>
  );
}

function SettingsTourTip() {
  const { visible, dismiss } = useTourTip(‘settings-backup’);
  const insets = useSafeAreaInsets();
  return (
    <TourBubble
      title="Back up your vault"
      body="Create a .ptbak backup to iCloud or Google Drive. Restore it any time to recover your documents."
      visible={visible}
      onDismiss={dismiss}
      anchor={{ bottom: Math.max(insets.bottom, 16) + 16, left: 12, right: 12 }}
      arrow="none"
    />
  );
}


const styles = StyleSheet.create({
  backupBanner: {
    backgroundColor: C.amberDim,
    borderRadius: R.lg,
    borderWidth: 1,
    borderColor: C.amber + '33',
    paddingHorizontal: S[4],
    paddingVertical: S[3],
    flexDirection: 'row',
    alignItems: 'center',
    gap: S[3],
    marginBottom: S[2],
  },
  backupBannerCopy: {
    flex: 1,
    gap: 2,
  },
  backupBannerTitle: {
    fontSize: T.base,
    color: C.amber,
    fontWeight: '700',
  },
  backupBannerBody: {
    fontSize: T.sm,
    color: C.ash,
    lineHeight: 18,
  },
  backupBannerAction: {
    fontSize: T.sm,
    color: C.amber,
    fontWeight: '700',
  },
  proCard: {
    backgroundColor: C.ink2,
    borderRadius: R.lg,
    borderWidth: 1,
    borderColor: C.ink3,
    padding: S[4],
    gap: S[3],
    marginBottom: S[2],
  },
  proCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  proTitle: {
    fontSize: T.base,
    color: C.cream,
    fontWeight: '700',
  },
  proBadge: {
    backgroundColor: C.amberDim,
    borderRadius: R.full,
    paddingHorizontal: S[3],
    paddingVertical: S[1],
  },
  proBadgeText: {
    fontSize: T.xs,
    color: C.amber,
    fontWeight: '700',
  },
  proBody: {
    fontSize: T.sm,
    color: C.ash,
    lineHeight: 20,
  },
  proFeatures: {
    gap: S[2],
  },
  proFeatureItem: {
    fontSize: T.sm,
    color: C.cream,
  },
  proAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: S[3],
    marginTop: S[1],
  },
  proPrice: {
    flex: 1,
    fontSize: T.sm,
    color: C.ash,
    fontWeight: '600',
  },
  proCTA: {
    minHeight: 42,
    borderRadius: R.md,
    backgroundColor: C.amber,
    paddingHorizontal: S[4],
    alignItems: 'center',
    justifyContent: 'center',
  },
  proCTADisabled: {
    backgroundColor: C.ink3,
  },
  proCTAText: {
    fontSize: T.sm,
    fontWeight: '700',
    color: C.ink1,
  },
  pressed: {
    opacity: 0.82,
  },
});
