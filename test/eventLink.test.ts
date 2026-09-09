import { describe, expect, it } from 'vitest';
import { getEventHref } from '@/utils/eventLink';
import { validateSeasonEvent } from '@/utils/season';
import events from '../public/events.json';
import type { Event } from '@/types/event';

describe('event targets', () => {
  it('encodes raw IDs without treating special characters as URL syntax', () => {
    for (const type of ['space', 'eventTag', 'season'] as const) {
      const asset = '中文 & name/#%';
      const url = new URL(getEventHref({ type, asset, id: asset }), 'https://majdata.net');
      expect(url.pathname).toBe(`/${type}`);
      expect(url.searchParams.get('id')).toBe(asset);
      expect(url.searchParams.size).toBe(1);
      expect(url.hash).toBe('');
    }
  });

  it('preserves complete external URLs', () => {
    const asset = 'https://example.com/event?a=1&b=2#results';
    expect(getEventHref({ type: 'outerLink', asset, id: 'external' })).toBe(asset);
  });

  it('keeps every published event in the unified schema with valid seasons', () => {
    for (const event of events) {
      expect(['outerLink', 'eventTag', 'space', 'season']).toContain(event.type);
      expect(event.asset.length).toBeGreaterThan(0);
      expect(event).not.toHaveProperty('href');
      expect(validateSeasonEvent(event)).toEqual([]);
      const url = new URL(getEventHref(event as Event), 'https://majdata.net');
      if (event.type !== 'outerLink') expect(url.searchParams.get('id')).toBe(event.type === 'season' ? event.id : event.asset);
    }
  });
});
