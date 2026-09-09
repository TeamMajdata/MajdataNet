import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchSeasonCollection } from '@/hooks/useSeasonCharts';
import { getEventHref } from '@/utils/eventLink';

const id = '69f3ace2bb1f42b84457a4f9';
afterEach(() => vi.unstubAllGlobals());

describe('season collections', () => {
  it('loads chart IDs from the configured collection in collection order', async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ items: [{ id: 'second' }, { id: 'first' }] }) });
    vi.stubGlobal('fetch', fetcher);
    expect(await fetchSeasonCollection(id)).toEqual(['/song?id=second', '/song?id=first']);
    expect(fetcher).toHaveBeenCalledWith(`/api3/api/collection/${id}/songlist`, expect.objectContaining({ credentials: 'include' }));
    expect(getEventHref({ id: 'ffmc-re', type: 'season', asset: id })).toBe('/season?id=ffmc-re');
  });

  it.each([[], [{ id: 'same' }, { id: 'same' }], [{ hash: 'missing-id' }]])('rejects unusable chart pools: %j', async items => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ items }) }));
    await expect(fetchSeasonCollection(id)).rejects.toThrow();
  });

  it('rejects failed collection requests', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404 }));
    await expect(fetchSeasonCollection(id)).rejects.toThrow('Collection request failed (404)');
  });
});
