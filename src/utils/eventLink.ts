import type { Event } from '@/types/event';

/** Encode target IDs once, at the routing boundary. */
export function getEventHref(event: Pick<Event, 'type' | 'asset' | 'id'>): string {
  return event.type === 'outerLink'
    ? event.asset
    : `/${event.type}?id=${encodeURIComponent(event.type === 'season' ? event.id : event.asset)}`;
}
