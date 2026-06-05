/**
 * appStore.ts — App-level Zustand store with persistence (Phase 8)
 *
 * Persists: biometricEnabled, hasOnboarded, viewMode, sortBy, sortDir
 * Runtime-only: isLocked (always starts locked if biometric is enabled)
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type AccountProvider = 'email' | 'apple';

export interface AccountProfile {
  fullName: string;
  email: string;
  provider: AccountProvider;
  appleUserId?: string;
  passwordHash?: string;
  createdAt: string;
  userId?: string;
}

interface AppState {
  // Lock
  hasHydrated: boolean;
  isLocked: boolean;
  biometricEnabled: boolean;
  hasOnboarded: boolean;
  accountProfile: AccountProfile | null;
  isAccountAuthenticated: boolean;

  // Settings
  viewMode: 'card' | 'list';
  sortBy: 'updatedAt' | 'createdAt' | 'title' | 'category';
  sortDir: 'asc' | 'desc';
  autoOcr: boolean;

  // Pro
  isPro: boolean;

  // Actions
  setHasHydrated: (hydrated: boolean) => void;
  setLocked: (locked: boolean) => void;
  setBiometricEnabled: (enabled: boolean) => void;
  setHasOnboarded: (v: boolean) => void;
  completeAccountSetup: (profile: AccountProfile) => void;
  setAccountAuthenticated: (value: boolean) => void;
  clearAccountSession: () => void;
  clearAccountProfile: () => void;
  setViewMode: (mode: 'card' | 'list') => void;
  setSortBy: (by: AppState['sortBy']) => void;
  setSortDir: (dir: 'asc' | 'desc') => void;
  setAutoOcr: (enabled: boolean) => void;
  setIsPro: (v: boolean) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      hasHydrated: false,
      isLocked: false,
      biometricEnabled: false,
      hasOnboarded: false,
      accountProfile: null,
      isAccountAuthenticated: false,
      viewMode: 'card',
      sortBy: 'updatedAt',
      sortDir: 'desc',
      autoOcr: true,
      isPro: false,

      setHasHydrated: (hasHydrated) => set({ hasHydrated }),
      setLocked: (isLocked) => set({ isLocked }),
      setBiometricEnabled: (biometricEnabled) => set({ biometricEnabled }),
      setHasOnboarded: (hasOnboarded) => set({ hasOnboarded }),
      completeAccountSetup: (accountProfile) => set({
        accountProfile,
        isAccountAuthenticated: true,
      }),
      setAccountAuthenticated: (isAccountAuthenticated) => set({ isAccountAuthenticated }),
      clearAccountSession: () => set({ isAccountAuthenticated: false }),
      clearAccountProfile: () => set({
        accountProfile: null,
        isAccountAuthenticated: false,
      }),
      setViewMode: (viewMode) => set({ viewMode }),
      setSortBy: (sortBy) => set({ sortBy }),
      setSortDir: (sortDir) => set({ sortDir }),
      setAutoOcr: (autoOcr) => set({ autoOcr }),
      setIsPro: (isPro) => set({ isPro }),
    }),
    {
      name: 'filetrail-app-settings-v1',
      storage: createJSONStorage(() => AsyncStorage),
      // isLocked is always runtime — never persisted
      partialize: (state) => ({
        biometricEnabled: state.biometricEnabled,
        hasOnboarded: state.hasOnboarded,
        accountProfile: state.accountProfile,
        isAccountAuthenticated: state.isAccountAuthenticated,
        viewMode: state.viewMode,
        sortBy: state.sortBy,
        sortDir: state.sortDir,
        autoOcr: state.autoOcr,
        isPro: state.isPro,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
        // Lock on cold start if biometric is enabled so the LockScreen
        // shows immediately rather than only after a background→foreground cycle.
        if (state?.biometricEnabled) {
          state.setLocked(true);
        }
      },
    }
  )
);
