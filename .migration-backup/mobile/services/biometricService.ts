/**
 * biometricService.ts — Biometric authentication (Phase 8)
 *
 * Wraps expo-local-authentication to provide:
 *   - Capability check (Face ID, Touch ID, Fingerprint)
 *   - Prompt for authentication
 *   - Friendly error messages
 */

import * as LocalAuthentication from 'expo-local-authentication';

export type BiometricType = 'faceId' | 'touchId' | 'fingerprint' | 'none';

export interface BiometricCapability {
  available: boolean;
  type: BiometricType;
  label: string;
}

export async function getBiometricCapability(): Promise<BiometricCapability> {
  const hardware = await LocalAuthentication.hasHardwareAsync();
  if (!hardware) return { available: false, type: 'none', label: 'Not Available' };

  const enrolled = await LocalAuthentication.isEnrolledAsync();
  if (!enrolled) return { available: false, type: 'none', label: 'Not Enrolled' };

  const types = await LocalAuthentication.supportedAuthenticationTypesAsync();

  if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
    return { available: true, type: 'faceId', label: 'Face ID' };
  }
  if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
    const label = 'Touch ID / Fingerprint';
    return { available: true, type: 'fingerprint', label };
  }
  return { available: true, type: 'touchId', label: 'Biometric' };
}

export async function authenticate(reason = 'Unlock FileTrail'): Promise<boolean> {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: reason,
      fallbackLabel: 'Use Passcode',
      cancelLabel: 'Cancel',
      disableDeviceFallback: false,
    });
    return result.success;
  } catch {
    return false;
  }
}
