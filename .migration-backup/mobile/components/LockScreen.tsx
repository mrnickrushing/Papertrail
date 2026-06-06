/**
 * LockScreen.tsx — Biometric lock overlay (Phase 8)
 *
 * Shown when biometricEnabled=true and isLocked=true.
 * Calls authenticate() automatically on mount and on button press.
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { authenticate, getBiometricCapability } from '@/services/biometricService';
import { C, T, S, R } from '@/theme/tokens';

interface LockScreenProps {
  onUnlocked: () => void;
}

export function LockScreen({ onUnlocked }: LockScreenProps) {
  const insets = useSafeAreaInsets();
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [biometricLabel, setBiometricLabel] = useState('Biometric');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getBiometricCapability().then(cap => setBiometricLabel(cap.label));
    tryAuth();
  }, []);

  async function tryAuth() {
    setIsAuthenticating(true);
    setError(null);
    try {
      const success = await authenticate('Unlock FileTrail');
      if (success) {
        onUnlocked();
      } else {
        setError('Authentication failed. Try again.');
      }
    } catch {
      setError('Authentication unavailable.');
    } finally {
      setIsAuthenticating(false);
    }
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.inner}>
        <Text style={styles.icon}>🔒</Text>
        <Text style={styles.title}>FileTrail is Locked</Text>
        <Text style={styles.subtitle}>
          Use {biometricLabel} to access your documents.
        </Text>

        {error && <Text style={styles.error}>{error}</Text>}

        {isAuthenticating ? (
          <ActivityIndicator color={C.amber} size="large" style={styles.spinner} />
        ) : (
          <Pressable
            style={({ pressed }) => [styles.unlockBtn, pressed && styles.unlockBtnPressed]}
            onPress={tryAuth}
          >
            <Text style={styles.unlockBtnText}>
              {error ? 'Try Again' : `Unlock with ${biometricLabel}`}
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: C.ink1,
    zIndex: 9999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inner: {
    alignItems: 'center',
    paddingHorizontal: S[8],
    gap: S[4],
  },
  icon: { fontSize: 64, marginBottom: S[2] },
  title: {
    fontSize: T.xl,
    fontWeight: '700',
    color: C.cream,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: T.base,
    color: C.ash,
    textAlign: 'center',
    lineHeight: 22,
  },
  error: {
    fontSize: T.sm,
    color: C.danger,
    textAlign: 'center',
  },
  spinner: { marginTop: S[4] },
  unlockBtn: {
    backgroundColor: C.amber,
    borderRadius: R.lg,
    paddingHorizontal: S[8],
    paddingVertical: S[4],
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: S[4],
  },
  unlockBtnPressed: { opacity: 0.75 },
  unlockBtnText: {
    fontSize: T.base,
    fontWeight: '700',
    color: C.ink1,
  },
});
