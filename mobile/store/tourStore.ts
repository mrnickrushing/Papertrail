import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const TOUR_TIP_IDS = [
  'vault-fab',
  'vault-filter',
  'search-bar',
  'folders-new',
  'viewer-organize',
  'settings-backup',
] as const;

export type TourTipId = (typeof TOUR_TIP_IDS)[number];

interface TourState {
  isTourActive: boolean;
  seenTips: TourTipId[];
  startTour: () => void;
  markSeen: (id: TourTipId) => void;
  // Returns true only when this tip is next in sequence and unseen.
  isNextTip: (id: TourTipId) => boolean;
}

export const useTourStore = create<TourState>()(
  persist(
    (set, get) => ({
      isTourActive: false,
      seenTips: [],
      startTour: () => set({ isTourActive: true, seenTips: [] }),
      markSeen: (id) =>
        set((s) => ({
          seenTips: s.seenTips.includes(id) ? s.seenTips : [...s.seenTips, id],
        })),
      isNextTip: (id) => {
        const { isTourActive, seenTips } = get();
        if (!isTourActive) return false;
        const idx = TOUR_TIP_IDS.indexOf(id);
        if (idx === -1 || seenTips.includes(id)) return false;
        return TOUR_TIP_IDS.slice(0, idx).every((prev) => seenTips.includes(prev));
      },
    }),
    {
      name: 'filetrail-tour-v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ isTourActive: s.isTourActive, seenTips: s.seenTips }),
    },
  ),
);
