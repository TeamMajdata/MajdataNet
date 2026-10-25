import { afterEach, expect, it, vi } from 'vitest';
import { fetchFavoriteCollections } from '@/hooks/useFavorites';
import { endpoints } from '@/config/api';

afterEach(() => vi.unstubAllGlobals());
it('derives favorite collection counts from songHashs', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json([{ id: 'collection', name: 'Favorites', createdBy: 'player', description: '', songHashs: ['hash1', 'hash2'], isPlayList: true, isForceGameover: false }])));
  const result = await fetchFavoriteCollections(endpoints.favorite.list);
  expect(result[0]).toMatchObject({ id: 'collection', count: 2 });
});
it('does not convert an unauthorized response into favorite collection data', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ code: -1 }, { status: 401 })));
  await expect(fetchFavoriteCollections(endpoints.favorite.list)).rejects.toMatchObject({ status: 401 });
});
