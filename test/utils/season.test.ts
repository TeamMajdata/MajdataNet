import { describe, expect, it } from 'vitest';
import { buildSeasonRankingRequest } from '@/utils/season';
import type { Event } from '@/types/event';

const event: Event = {
  id: 'test-season', type: 'season', asset: '69f3ace2bb1f42b84457a4f9', src: '/season.jpg',
  alt: 'Season', title: 'Season', description: 'Season', category: 5,
  createDate: '2026-09-01T00:00:00+08:00', endDate: '2026-09-30T23:59:59.999+08:00',
};
const first = '3f2504e0-4f89-11d3-9a0c-0305e82c3301';
const second = '9b2e6c1a-0d4f-4e6b-8a7c-5f1e2d3c4b5a';

describe('buildSeasonRankingRequest', () => {
  it('queries the period leaderboard by chart ID in pool order', () => {
    const ids = [second, first];
    const request = buildSeasonRankingRequest(event, ids);
    expect(request).toEqual({
      songIds: [second, first], startTime: '2026-08-31T16:00:00.000Z',
      endTime: '2026-09-30T15:59:59.999Z', scoreType: 'best', sortBy: 'Acc.DX',
    });
    expect(request).not.toHaveProperty('songhashes');
    // 复制一份，调用方之后改动自己的数组不会影响已经组装好的请求
    expect(request.songIds).not.toBe(ids);
  });

  it.each([
    ['an empty pool', []],
    ['an empty ID', [first, '']],
    ['a blank ID', [first, '   ']],
    ['surrounding whitespace', [` ${first}`]],
    ['a trailing newline', [`${first}\n`]],
    ['a non-string ID', [first, null as unknown as string]],
  ])('rejects %s', (_, ids) => {
    expect(() => buildSeasonRankingRequest(event, ids)).toThrow('valid chart ID');
  });

  it('rejects duplicated chart IDs', () => {
    expect(() => buildSeasonRankingRequest(event, [first, second, first])).toThrow('Season chart IDs must not be duplicated');
  });

  it('rejects events that are not valid seasons', () => {
    expect(() => buildSeasonRankingRequest({ ...event, type: 'eventTag' }, [first])).toThrow('A valid season event is required');
    expect(() => buildSeasonRankingRequest({ ...event, endDate: event.createDate }, [first])).toThrow('createDate must be earlier than endDate');
  });
});
