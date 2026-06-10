/**
 * proStore.ts — Zustand store for RevenueCat Pro entitlement state
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { checkProEntitlement } from '@/services/purchases';
import { apiRequest, isBackendConfigured } from '@/services/api';

export const FREE_DOCUMENT_LIMIT = 3;

// If EXPO_PUBLIC_ADMIN_EMAIL is set at build time, this is an admin/dev build
// and Pro is granted automatically without requiring a purchase.
const IS_ADMIN_BUILD = Boolean(process.env.EXPO_PUBLIC_ADMIN_EMAIL);

interface ProState {
  isPro: boolean;
  isChecking: boolean;
  hasAdminAccess: boolean;
  checkPro: (email?: string) => Promise<void>;
  setAdminAccess: (enabled: boolean) => void;
}

export const useProStore = create<ProState>()(
  persist(
    (set, get) => ({
      isPro: IS_ADMIN_BUILD,
      isChecking: false,
      hasAdminAccess: false,
      checkPro: async (email?: string) => {
        if (IS_ADMIN_BUILD) {
          set({ isPro: true });
          return;
        }
        set({ isChecking: true });
        try {
          const revenueCatPro = await checkProEntitlement();
          if (revenueCatPro) {
            set({ isPro: true });
            return;
          }
          // Fall back to backend Pro status so admin panel toggle is respected.
          if (email && isBackendConfigured()) {
            try {
              const res = await apiRequest<{ found: boolean; isPro: boolean }>(
                `/v1/users/pro-status?email=${encodeURIComponent(email)}`,
              );
              if (res.found && res.isPro) {
                set({ isPro: true });
                return;
              }
            } catch {
              // Network error — non-fatal, fall through to local state
            }
          }
          set({ isPro: get().hasAdminAccess });
        } finally {
          set({ isChecking: false });
        }
      },
      setAdminAccess: (enabled) => set((state) => ({
        hasAdminAccess: enabled,
        isPro: enabled || state.isPro,
      })),
    }),
    {
      name: 'filetrail-pro-v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        hasAdminAccess: state.hasAdminAccess,
        isPro: state.isPro,
      }),
    },
  ),
);
