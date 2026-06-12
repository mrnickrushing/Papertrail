import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTourStore, TOUR_TIP_IDS, type TourTipId } from '@/store/tourStore';

/**
 * Returns { visible, dismiss } for a single tour tip.
 *
 * The tip shows only when the tour is active, all earlier tips have been
 * dismissed (strict sequential order), and this tip hasn't been seen yet.
 * A 600 ms delay prevents it from flashing before the screen finishes rendering.
 */
export function useTourTip(id: TourTipId): { visible: boolean; dismiss: () => void } {
  const isTourActive = useTourStore((s) => s.isTourActive);
  const seenTips = useTourStore((s) => s.seenTips);
  const markSeen = useTourStore((s) => s.markSeen);
  const [visible, setVisible] = useState(false);

  const ready = useMemo(() => {
    if (!isTourActive) return false;
    const idx = TOUR_TIP_IDS.indexOf(id);
    if (idx === -1 || seenTips.includes(id)) return false;
    return TOUR_TIP_IDS.slice(0, idx).every((prev) => seenTips.includes(prev));
  }, [isTourActive, seenTips, id]);

  useEffect(() => {
    if (!ready) { setVisible(false); return; }
    const t = setTimeout(() => setVisible(true), 600);
    return () => clearTimeout(t);
  }, [ready]);

  const dismiss = useCallback(() => {
    setVisible(false);
    markSeen(id);
  }, [id, markSeen]);

  return { visible, dismiss };
}
