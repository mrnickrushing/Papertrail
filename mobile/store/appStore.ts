/**
 * PaperTrail — App-level Zustand Store
 * Auth state, onboarding, settings, biometric lock.
 */
import { create } from 'zustand';

interface AppState {
  // Lock
  isLocked: boolean;
  biometricEnabled: boolean;
  hasOnboarded: boolean;

  // Settings
  viewMode: 'card' | 'list';
  sortBy: 'updatedAt' | 'createdAt' | 'title' | 'category';
  sortDir: 'asc' | 'desc';

  // Pro
  isPro: boolean;

  // Actions
  setLocked: (locked: boolean) => void;
  setBiometricEnabled: (enabled: boolean) => void;
  setHasOnboarded: (v: boolean) => void;
  setViewMode: (mode: 'card' | 'list') => void;
  setSortBy: (by: AppState['sortBy']) => void;
  setSortDir: (dir: 'asc' | 'desc') => void;
  setIsPro: (v: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  isLocked: false,
  biometricEnabled: false,
  hasOnboarded: false,
  viewMode: 'card',
  sortBy: 'updatedAt',
  sortDir: 'desc',
  isPro: false,

  setLocked: (isLocked) => set({ isLocked }),
  setBiometricEnabled: (biometricEnabled) => set({ biometricEnabled }),
  setHasOnboarded: (hasOnboarded) => set({ hasOnboarded }),
  setViewMode: (viewMode) => set({ viewMode }),
  setSortBy: (sortBy) => set({ sortBy }),
  setSortDir: (sortDir) => set({ sortDir }),
  setIsPro: (isPro) => set({ isPro }),
}));
