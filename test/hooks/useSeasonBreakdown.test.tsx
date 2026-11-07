import { act, useEffect } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { SWRConfig } from 'swr';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useSeasonBreakdown } from '@/hooks/useSeasonBreakdown';
import type { SeasonChartsState } from '@/hooks/useSeasonCharts';
import type { Event, PlayHistoryRankingRequest } from '@/types/event';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const event: Event = {
  id: 'test-season', type: 'season', asset: '69f3ace2bb1f42b84457a4f9', src: '/season.jpg',
  alt: 'Season', title: 'Season', description: 'Season', category: 5,
  createDate: '2026-09-01T00:00:00+08:00', endDate: '2026-09-30T23:59:59.999+08:00',
};
const first = '3f2504e0-4f89-11d3-9a0c-0305e82c3301';
const second = '9b2e6c1a-0d4f-4e6b-8a7c-5f1e2d3c4b5a';
const row = (playerId: string, totalAccDX: number) => ({ playerId, username: playerId, totalDXScore: 1000, totalAccDX, totalAccClassic: 100 });
const chart = (id: string) => ({
  id, chart: `/song?id=${id}`,
  song: { id, title: `Song ${id}`, artist: '', uploader: '', designer: '', levels: ['', '7'], hash: 'same-hash' },
});

describe('useSeasonBreakdown', () => {
  let container: HTMLDivElement;
  let root: Root;
  let breakdown: ReturnType<typeof useSeasonBreakdown> | undefined;
  let fetchMock: ReturnType<typeof vi.fn<typeof fetch>>;
  // 谱单顺序与 Id 字母序相反，结果必须按下标对齐 items
  const chartState: Pick<SeasonChartsState, 'items' | 'songIds' | 'error' | 'isLoading'> = {
    items: [chart(second), chart(first)], songIds: [second, first], isLoading: false,
  };

  function Probe() {
    const state = useSeasonBreakdown(event, chartState, 'player-one', true, 'ongoing');
    useEffect(() => { breakdown = state; }, [state]);
    return null;
  }

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    breakdown = undefined;
    fetchMock = vi.fn<typeof fetch>();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  });

  async function render() {
    await act(async () => root.render(
      <SWRConfig value={{ provider: () => new Map() }}><Probe /></SWRConfig>,
    ));
    for (let i = 0; i < 3; i += 1) {
      await act(async () => { await new Promise(resolve => setTimeout(resolve, 0)); });
    }
  }

  const requestBodies = () => fetchMock.mock.calls.map(([, options]) => JSON.parse(options?.body as string) as PlayHistoryRankingRequest);

  it('queries each chart by its own ID and aligns the results with the pool', async () => {
    fetchMock.mockImplementation(async (_, options) => {
      const [id] = (JSON.parse(options?.body as string) as PlayHistoryRankingRequest).songIds;
      return Response.json(id === first ? [row('player-one', 50.5), row('player-two', 60)] : [row('player-two', 70)]);
    });
    await render();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls.every(([url]) => url === '/api3/api/maiscore/leaderboard/period')).toBe(true);
    expect(requestBodies()).toEqual(expect.arrayContaining([second, first].map(id => ({
      songIds: [id], startTime: '2026-08-31T16:00:00.000Z',
      endTime: '2026-09-30T15:59:59.999Z', scoreType: 'best', sortBy: 'Acc.DX',
    }))));
    expect(breakdown?.items.map(({ id, score, error }) => ({ id, score, error }))).toEqual([
      { id: second, score: undefined, error: undefined },
      { id: first, score: 50.5, error: undefined },
    ]);
    expect(breakdown?.hasErrors).toBe(false);
  });

  it('marks only the chart whose request failed', async () => {
    fetchMock.mockImplementation(async (_, options) => {
      const [id] = (JSON.parse(options?.body as string) as PlayHistoryRankingRequest).songIds;
      return id === second ? new Response('', { status: 503 }) : Response.json([row('player-one', 50.5)]);
    });
    await render();

    expect(breakdown?.items[0].error?.message).toBe('Ranking request failed (503)');
    expect(breakdown?.items[1]).toMatchObject({ id: first, score: 50.5, error: undefined });
    expect(breakdown?.hasErrors).toBe(true);
  });
});
