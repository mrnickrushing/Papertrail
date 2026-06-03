import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface SettingsState {
  biometricEnabled:  boolean;
  theme:             'dark' | 'light' | 'system';
  defaultCategory:   string;
  autoOcr:           boolean;
  isPro:             boolean;

  setBiometric:     (enabled: boolean) => void;
  setTheme:         (theme: 'dark' | 'light' | 'system') => void;
  setDefaultCat:    (cat: string) => void;
  setAutoOcr:       (enabled: boolean) => void;
  setIsPro:         (isPro: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      biometricEnabled: false,
      theme:            'system',
      defaultCategory:  'other',
      autoOcr:          true,
      isPro:            false,

      setBiometric:  (enabled) => set({ biometricEnabled: enabled }),
      setTheme:      (theme) => set({ theme }),
      setDefaultCat: (cat) => set({ defaultCategory: cat }),
      setAutoOcr:    (enabled) => set({ autoOcr: enabled }),
      setIsPro:      (isPro) => set({ isPro }),
    }),
    {
      name: 'papertrail-settings-v1',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
