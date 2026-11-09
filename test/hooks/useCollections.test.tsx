import { act, useEffect } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { SWRConfig } from 'swr';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useCollections } from '@/hooks/useCollections';
import { endpoints } from '@/config/api';

vi.mock('@/hooks', () => ({
  useUserContext: () => ({ username: 'alice' }),
}));
vi.mock('react-toastify', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const chart = { chartId: '0f8fad5b-d9cb-469f-a165-70867728950e', songHash: 'd41d8cd98f00b204e9800998ecf8427e' };
let hook: ReturnType<typeof useCollections>;
function Probe() {
  const value = useCollections();
  useEffect(() => { hook = value; });
  return null;
}

describe('useCollections', () => {
  let container: HTMLDivElement;
  let root: Root;
  let fetchMock: ReturnType<typeof vi.fn<typeof fetch>>;
  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    fetchMock = vi.fn<typeof fetch>(async (input) => {
      const url = String(input);
      if (url === endpoints.collection.list(0, 100, 'alice')) {
        return Response.json([
          { id: 'with-song', name: 'A', createdBy: 'alice', description: null, count: 1 },
          { id: 'without-song', name: 'B', createdBy: 'alice', description: null, count: 1 },
        ]);
      }
      // hashlist 的响应不变：仍是谱面 hash；without-song 里放谱面 Id，确认不会按 Id 判断成员
      if (url === endpoints.collection.hashlist('with-song')) return Response.json({ songHashs: [chart.songHash] });
      if (url === endpoints.collection.hashlist('without-song')) return Response.json({ songHashs: [chart.chartId] });
      // songlist 给出谱面 Id 列表；with-song 里的 Id 用大写，确认移除时大小写不敏感
      if (url === endpoints.collection.songlist('with-song')) {
        return Response.json({ items: ['other-1', chart.chartId.toUpperCase(), 'other-2'], count: 3 });
      }
      if (url === endpoints.collection.songlist('without-song')) return Response.json({ items: ['other-1'], count: 1 });
      return new Response(null, { status: 200 });
    });
    vi.stubGlobal('fetch', fetchMock);
  });
  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  });

  function modifyBody(collectionId: string) {
    const call = fetchMock.mock.calls.find(([url]) => url === endpoints.collection.modify(collectionId));
    expect(call?.[1]?.method).toBe('PUT');
    return JSON.parse(String(call![1]!.body));
  }

  it('replaces the item list via modify and decides membership by hashlist hashes', async () => {
    await act(async () => root.render(
      <SWRConfig value={{ provider: () => new Map(), shouldRetryOnError: false }}><Probe /></SWRConfig>,
    ));
    expect(hook.isLoading).toBe(false);
    expect(hook.isSongInCollection('with-song', chart.songHash)).toBe(true);
    expect(hook.isSongInCollection('without-song', chart.songHash)).toBe(false);

    await act(async () => hook.toggleSongInCollection('with-song', chart));
    expect(modifyBody('with-song')).toEqual({ items: ['other-1', 'other-2'] });

    await act(async () => hook.toggleSongInCollection('without-song', chart));
    expect(modifyBody('without-song')).toEqual({ items: ['other-1', chart.chartId] });
  });
});
