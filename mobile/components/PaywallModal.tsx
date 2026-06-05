/**
 * PaywallModal.tsx — Full-screen Pro paywall modal
 *
 * Shows FileTrail Pro features and an "Unlock Pro" CTA.
 * Calls purchasePro() on confirm and restorePurchases() on restore.
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { purchasePro, restorePurchases } from '@/services/purchases';
import { C, T, R, S } from '@/theme/tokens';

const PRO_FEATURES = [
  { icon: '∞', label: 'Unlimited Documents' },
  { icon: '✦', label: 'AI Auto-fill' },
  { icon: '📁', label: 'Folders' },
  { icon: '☁️', label: 'Cloud Backup' },
];

interface PaywallModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

function billingAlertTitle(code: string): string {
  switch (code) {
    case 'not_available':
      return 'Purchase Unavailable';
    case 'not_entitled':
      return 'Purchase Incomplete';
    case 'not_found':
      return 'No Purchase Found';
    case 'unsupported_platform':
      return 'Unavailable Here';
    case 'restore_failed':
      return 'Restore Failed';
    default:
      return 'Purchase Failed';
  }
}

export function PaywallModal({ visible, onClose, onSuccess }: PaywallModalProps) {
  const insets = useSafeAreaInsets();
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const isMounted = useRef(true);
  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  if (!visible) return null;

  const handleUnlock = async () => {
    setIsPurchasing(true);
    try {
      const result = await purchasePro();
      if (result.ok) {
        onSuccess();
        return;
      }

      if (result.code !== 'cancelled') {
        Alert.alert(billingAlertTitle(result.code), result.message);
      }
    } finally {
      if (isMounted.current) setIsPurchasing(false);
    }
  };

  const handleRestore = async () => {
    setIsRestoring(true);
    try {
      const result = await restorePurchases();
      if (result.ok) {
        onSuccess();
        return;
      }

      Alert.alert(billingAlertTitle(result.code), result.message);
    } finally {
      if (isMounted.current) setIsRestoring(false);
    }
  };

  const isLoading = isPurchasing || isRestoring;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        {/* Dismiss button */}
        <Pressable
          style={styles.dismissBtn}
          onPress={onClose}
          disabled={isLoading}
          hitSlop={8}
        >
          <Text style={styles.dismissText}>Maybe Later</Text>
        </Pressable>

        {/* Content */}
        <View style={styles.body}>
          {/* Icon + heading */}
          <Text style={styles.sparkle}>✦</Text>
          <Text style={styles.heading}>FileTrail Pro</Text>
          <Text style={styles.subheading}>
            Unlock the full power of your document vault.
          </Text>

          {/* Feature list */}
          <View style={styles.featureList}>
            {PRO_FEATURES.map(({ icon, label }) => (
              <View key={label} style={styles.featureRow}>
                <Text style={styles.featureIcon}>{icon}</Text>
                <Text style={styles.featureLabel}>{label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <Pressable
            style={[styles.unlockBtn, isLoading && styles.unlockBtnDisabled]}
            onPress={handleUnlock}
            disabled={isLoading}
          >
            {isPurchasing ? (
              <ActivityIndicator color={C.ink1} />
            ) : (
              <Text style={styles.unlockBtnText}>Unlock Pro</Text>
            )}
          </Pressable>

          <Pressable
            style={styles.restoreBtn}
            onPress={handleRestore}
            disabled={isLoading}
          >
            {isRestoring ? (
              <ActivityIndicator color={C.amber} size="small" />
            ) : (
              <Text style={styles.restoreText}>Restore Purchases</Text>
            )}
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.ink1,
    paddingHorizontal: S[6],
  },
  dismissBtn: {
    alignSelf: 'flex-end',
    paddingVertical: S[3],
    paddingLeft: S[4],
    minHeight: 44,
    justifyContent: 'center',
  },
  dismissText: {
    fontSize: T.sm,
    color: C.ash,
  },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: S[4],
  },
  sparkle: {
    fontSize: 56,
    color: C.amber,
    lineHeight: 72,
  },
  heading: {
    fontSize: 32,
    fontWeight: '800',
    color: C.cream,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  subheading: {
    fontSize: T.base,
    color: C.ash,
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 280,
  },
  featureList: {
    gap: S[3],
    alignSelf: 'stretch',
    marginTop: S[4],
    backgroundColor: C.ink2,
    borderRadius: R.xl,
    padding: S[5],
    borderWidth: 1,
    borderColor: C.amber + '33',
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S[3],
  },
  featureIcon: {
    fontSize: T.xl,
    color: C.amber,
    width: 28,
    textAlign: 'center',
  },
  featureLabel: {
    fontSize: T.base,
    color: C.cream,
    fontWeight: '500',
  },
  actions: {
    gap: S[3],
    paddingBottom: S[4],
  },
  unlockBtn: {
    backgroundColor: C.amber,
    borderRadius: R.lg,
    paddingVertical: S[4],
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
    shadowColor: C.amber,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  unlockBtnDisabled: {
    opacity: 0.55,
  },
  unlockBtnText: {
    fontSize: T.base,
    fontWeight: '700',
    color: C.ink1,
    letterSpacing: 0.3,
  },
  restoreBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  restoreText: {
    fontSize: T.sm,
    color: C.amber,
    fontWeight: '500',
  },
});
