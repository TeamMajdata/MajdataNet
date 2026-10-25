import { useEffect, useState } from 'react';
import type { Event } from '@/types/event';

/** Update at event boundaries or when returning to the page, without minute polling. */
export function useEventClock(events: readonly Pick<Event, 'createDate' | 'endDate'>[]): number {
  const [now, setNow] = useState(Date.now);
  const boundaryKey = events
    .flatMap(event => [Date.parse(event.createDate), Date.parse(event.endDate) + 1])
    .filter(Number.isFinite)
    .sort((a, b) => a - b)
    .join(',');

  useEffect(() => {
    const boundaries = boundaryKey.split(',').filter(Boolean).map(Number);
    let timer: ReturnType<typeof setTimeout>;

    const schedule = () => {
      const current = Date.now();
      const next = boundaries.find(boundary => boundary > current);
      if (next === undefined) return;
      timer = setTimeout(() => {
        if (document.visibilityState !== 'hidden' && Date.now() >= next) setNow(Date.now());
        schedule();
      }, Math.min(2_147_483_647, next - current));
    };

    const onVisible = () => {
      if (document.visibilityState === 'hidden') return;
      clearTimeout(timer);
      setNow(Date.now());
      schedule();
    };

    schedule();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [boundaryKey]);

  return now;
}
