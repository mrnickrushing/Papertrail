/**
 * PermissionPrompt.tsx — Shown when camera or photo library permission is denied
 *
 * Provides a contextual explanation + a deep-link button to open Settings.
 */

import React from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Linking,
  Platform,
} from 'react-native';
import { C, T, R, S } from '@/theme/tokens';

interface PermissionPromptProps {
  type: 'camera' | 'photos';
  onDismiss: () => void;
}

const COPY = {
  camera: {
    emoji: '📷',
    title: 'Camera Access Required',
    body: 'FileTrail needs camera access to scan documents. Your photos are stored privately on your device.',
    action: 'Open Settings',
  },
  photos: {
    emoji: '🖼️',
    title: 'Photo Library Access',
    body: 'FileTrail needs access to your photo library to import images as documents.',
    action: 'Open Settings',
  },
};

export function PermissionPrompt({ type, onDismiss }: PermissionPromptProps) {
  const copy = COPY[type];

  const openSettings = () => {
    if (Platform.OS === 'ios') {
      Linking.openURL('app-settings:');
    } else {
      Linking.openSettings();
    }
    onDismiss();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>{copy.emoji}</Text>
      <Text style={styles.title}>{copy.title}</Text>
      <Text style={styles.body}>{copy.body}</Text>
      <Pressable style={styles.btn} onPress={openSettings}>
        <Text style={styles.btnText}>{copy.action}</Text>
      </Pressable>
      <Pressable style={styles.dismissBtn} onPress={onDismiss}>
        <Text style={styles.dismissText}>Not Now</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingHorizontal: S[6],
    paddingVertical: S[8],
    gap: S[3],
  },
  emoji: {
    fontSize: 48,
    marginBottom: S[2],
  },
  title: {
    fontSize: T.lg,
    fontWeight: '700',
    color: C.cream,
    textAlign: 'center',
  },
  body: {
    fontSize: T.base,
    color: C.ash,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 300,
  },
  btn: {
    backgroundColor: C.amber,
    borderRadius: R.lg,
    paddingVertical: S[3],
    paddingHorizontal: S[8],
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: S[2],
  },
  btnText: {
    fontSize: T.base,
    fontWeight: '700',
    color: C.ink1,
  },
  dismissBtn: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: S[4],
  },
  dismissText: {
    fontSize: T.base,
    color: C.ash,
  },
});
