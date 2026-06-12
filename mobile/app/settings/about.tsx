import React from 'react';
import { Platform, Text, StyleSheet } from 'react-native';
import Constants from 'expo-constants';
import { useAppStore } from '@/store';
import { isBackendConfigured } from '@/services/api';
import {
  SettingsSubpageShell,
  SectionHeader,
  SettingsCard,
  SettingsRow,
  Divider,
  Hint,
  formatUsd,
  spendWarning,
  SpendWarningBanner,
} from '@/components/settings/SettingsUi';
import { C, T, S } from '@/theme/tokens';

const APP_VERSION = Constants.expoConfig?.version ?? 'Unknown';
const BUILD = Platform.OS === 'ios'
  ? Constants.expoConfig?.ios?.buildNumber ?? Constants.nativeBuildVersion ?? 'Unknown'
  : Platform.OS === 'android'
    ? String(Constants.expoConfig?.android?.versionCode ?? Constants.nativeBuildVersion ?? 'Unknown')
    : APP_VERSION;

export default function AboutSettingsScreen() {
  const aiUsageCostUsd = useAppStore((s) => s.aiUsageCostUsd);
  const aiUsageCallCount = useAppStore((s) => s.aiUsageCallCount);
  const backendConfigured = isBackendConfigured();
  const warning = spendWarning(aiUsageCostUsd);

  return (
    <SettingsSubpageShell title="About">
      <SectionHeader title="App" />
      <SettingsCard>
        <SettingsRow label="Version" value={APP_VERSION} />
        <Divider />
        <SettingsRow label="Build" value={BUILD} />
        <Divider />
        <SettingsRow
          label="Storage"
          value={backendConfigured ? 'Device + cloud file backup' : 'On-device only'}
        />
      </SettingsCard>

      <SectionHeader title="AI Usage" />
      <SettingsCard>
        <SettingsRow label="Estimated Spend" value={formatUsd(aiUsageCostUsd)} />
        <Divider />
        <SettingsRow label="AI Calls" value={`${aiUsageCallCount}`} />
      </SettingsCard>
      <Hint>
        Estimated cost of Claude API calls made for AI Organize on this device, based on Claude Haiku pricing.
      </Hint>
      {warning && <SpendWarningBanner tone={warning.tone} message={warning.message} />}

      <Text style={styles.footer}>
        {backendConfigured
          ? 'FileTrail keeps local copies on your device and mirrors document files to your configured cloud backend.'
          : 'FileTrail stores all your documents privately on your device. Nothing is uploaded to any server.'}
      </Text>
    </SettingsSubpageShell>
  );
}

const styles = StyleSheet.create({
  footer: {
    fontSize: T.sm,
    color: C.ink4,
    textAlign: 'center',
    marginTop: S[6],
    lineHeight: 20,
    marginHorizontal: S[2],
  },
});
