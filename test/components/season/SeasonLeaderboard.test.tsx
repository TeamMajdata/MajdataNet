import { act, useEffect, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { SWRConfig } from 'swr';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import SeasonLeaderboard from '@/components/season/SeasonLeaderboard';
import { useSeasonRanking } from '@/hooks/useSeasonRanking';
import type { SeasonChartsState } from '@/hooks/useSeasonCharts';
import type { Event } from '@/types/event';

vi.mock('@/hooks/useI18n', () => ({
  useI18n: () => ({ i18n: (key: string, fallback?: string) => fallback ?? key, language: 'zh' }),
}));
vi.mock('@/hooks', () => ({
  useI18n: () => ({ i18n: (key: string, fallback?: string) => fallback ?? key }),
}));
vi.mock('@/components', () => ({ LoadingSpinner: () => null }));
vi.mock('@/components/season/SeasonScoreDetails', () => ({
  default: ({ children }: { children: ReactNode }) => children,
}));
vi.mock('@/hooks/useSeasonLastPlayed', () => ({
  useSeasonLastPlayed: () => ({ unavailable: true }),
}));

const testGlobals = globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean };
testGlobals.IS_REACT_ACT_ENVIRONMENT = true;

const event: Event = {
  id: 'test-season', type: 'season', asset: '69f3ace2bb1f42b84457a4f9', src: '/season.jpg',
  alt: 'Season', title: 'Season', description: 'Season', category: 5,
  createDate: '2026-09-01T00:00:00+08:00', endDate: '2026-09-30T23:59:59.999+08:00',
};
const rows = [{ playerId: 'player-one', username: 'Player & One', totalDXScore: 1200, totalAccDX: 100.1234, totalAccClassic: 100 }];
const response = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status });

describe('season leaderboard recovery', () => {
  let container: HTMLDivElement;
  let root: Root;
  let charts: SeasonChartsState;
  let ranking: ReturnType<typeof useSeasonRanking>;
  let fetchMock: ReturnType<typeof vi.fn<typeof fetch>>;

  function RankingProbe() {
    const state = useSeasonRanking(event, 'ongoing', charts.songhashes ?? null);
    useEffect(() => { ranking = state; }, [state]);
    return null;
  }

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    charts = { items: [], songhashes: ['current-hash'], isLoading: false, retry: vi.fn().mockResolvedValue(undefined) };
    fetchMock = vi.fn<typeof fetch>();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  });

  async function render(status: 'ongoing' | 'upcoming' = 'ongoing', probe = false) {
    await act(async () => root.render(
      <SWRConfig value={{ provider: () => new Map() }}>
        <MemoryRouter>
          <SeasonLeaderboard event={event} status={status} chartState={charts} />
          {probe && <RankingProbe />}
        </MemoryRouter>
      </SWRConfig>,
    ));
  }

  function retryButton() {
    return Array.from(container.querySelectorAll('button')).find(button => button.textContent === '重试');
  }

  it('recovers from a failed ranking request without reloading the page', async () => {
    fetchMock.mockResolvedValueOnce(response({}, 503)).mockResolvedValueOnce(response(rows));
    await render();
    expect(container.querySelector('[role="alert"]')).not.toBeNull();
    expect(retryButton()).toBeDefined();

    await act(async () => retryButton()!.click());

    expect(container.querySelector('[role="alert"]')).toBeNull();
    expect(container.textContent).toContain('100.1234%');
    expect(container.querySelector('a')?.getAttribute('href')).toBe('/space?id=Player%20%26%20One');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [url, options] = fetchMock.mock.calls[1];
    expect(url).toBe('/api3/api/playhistory/ranking');
    expect(options?.method).toBe('POST');
    expect(JSON.parse(options?.body as string)).toEqual({
      songhashes: ['current-hash'], startTime: '2026-08-31T16:00:00.000Z',
      endTime: '2026-09-30T15:59:59.999Z', scoreType: 'best', sortBy: 'Acc.DX',
    });
  });

  it('retains the last scores and handles another failed retry without rejecting', async () => {
    fetchMock.mockResolvedValueOnce(response(rows)).mockResolvedValue(response({}, 503));
    await render('ongoing', true);
    expect(container.textContent).toContain('100.1234%');

    await act(async () => {
      await expect(ranking.retry()).resolves.toEqual(rows);
    });
    expect(container.textContent).toContain('100.1234%');
    expect(container.querySelector('[role="alert"]')?.textContent).toContain('保留上次');
    expect(retryButton()?.disabled).toBe(false);

    await act(async () => retryButton()!.click());
    expect(container.textContent).toContain('100.1234%');
    expect(retryButton()?.disabled).toBe(false);
  });

  it('retries metadata first when the chart pool failed to resolve', async () => {
    charts = { ...charts, songhashes: undefined, error: new Error('Chart request failed') };
    await render();
    await act(async () => retryButton()!.click());
    expect(charts.retry).toHaveBeenCalledOnce();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('does not request standings or offer a ranking retry before the season starts', async () => {
    charts = { ...charts, error: new Error('Chart request failed') };
    await render('upcoming');
    expect(container.textContent).toContain('开赛后');
    expect(retryButton()).toBeUndefined();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
