import React, { useEffect, useState } from 'react';
import { StyleSheet, Switch, Text, View, Alert } from 'react-native';
import { useAppStore } from '@/store';
import { authenticate, getBiometricCapability } from '@/services/biometricService';
import {
  SettingsSubpageShell,
  SectionHeader,
  SettingsCard,
  Hint,
} from '@/components/settings/SettingsUi';
import { C, T, S } from '@/theme/tokens';

export default function SecuritySettingsScreen() {
  const biometricEnabled = useAppStore((s) => s.biometricEnabled);
  const setBiometricEnabled = useAppStore((s) => s.setBiometricEnabled);
  const [biometricLabel, setBiometricLabel] = useState('Biometric Lock');
  const [biometricAvailable, setBiometricAvailable] = useState(false);

  useEffect(() => {
    getBiometricCapability().then((cap) => {
      setBiometricAvailable(cap.available);
      if (cap.available) setBiometricLabel(cap.label);
    });
  }, []);

  const handleToggleBiometric = async (value: boolean) => {
    if (value) {
      const success = await authenticate('Confirm to enable biometric lock');
      if (!success) {
        Alert.alert('Authentication Required', 'Could not verify biometric identity.');
        return;
      }
    }
    setBiometricEnabled(value);
  };

  return (
    <SettingsSubpageShell title="Security">
      <SectionHeader title="Vault Lock" />
      <SettingsCard>
        <View style={styles.switchRow}>
          <View style={styles.switchInfo}>
            <Text style={[styles.rowLabel, !biometricAvailable && styles.rowLabelDisabled]}>
              {biometricLabel}
            </Text>
            <Text style={styles.switchSub}>
              {biometricAvailable
                ? biometricEnabled
                  ? 'Vault locks when the app backgrounds'
                  : 'Enable to require biometric unlock when you return'
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
      </SettingsCard>
      <Hint>
        This only protects the local vault on this device. It does not change your account sign-in.
      </Hint>
    </SettingsSubpageShell>
  );
}

const styles = StyleSheet.create({
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: S[4],
    paddingVertical: S[3],
    minHeight: 64,
  },
  switchInfo: {
    flex: 1,
    gap: 2,
  },
  rowLabel: {
    fontSize: T.base,
    color: C.cream,
  },
  rowLabelDisabled: {
    color: C.ash,
  },
  switchSub: {
    fontSize: T.xs,
    color: C.ash,
    lineHeight: 18,
  },
});
