/**
 * secureCredentials.ts — Secure on-device storage for the local account
 * password hash.
 *
 * Older builds persisted the hash as part of `accountProfile` in
 * AsyncStorage, which writes plain JSON to disk. It now lives here instead,
 * backed by `expo-secure-store` (iOS Keychain / Android Keystore), which the
 * OS encrypts at rest. See appStore.ts / app/account.tsx for the one-time
 * migration that moves any legacy hash out of AsyncStorage into this store.
 */

import * as SecureStore from 'expo-secure-store';

const PASSWORD_HASH_KEY = 'filetrail-account-password-hash';

export async function getStoredPasswordHash(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(PASSWORD_HASH_KEY);
  } catch {
    return null;
  }
}

export async function setStoredPasswordHash(hash: string): Promise<void> {
  await SecureStore.setItemAsync(PASSWORD_HASH_KEY, hash);
}

export async function deleteStoredPasswordHash(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(PASSWORD_HASH_KEY);
  } catch {
    // Nothing to delete — fine.
  }
}
