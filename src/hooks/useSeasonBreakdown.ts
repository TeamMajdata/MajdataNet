import { useMemo } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import { endpoints } from '@/config/api';
import type { Event } from '@/types/event';
import type { PlayHistoryRankingEntry, PlayHistoryRankingRequest } from '@/types/event';
import type { Song } from '@/types/song';
import { buildSeasonRankingRequest, createSeasonRequestLimiter } from '@/utils/season';
import type { SeasonChartsState } from './useSeasonCharts';
import { fetchSeasonRanking } from './useSeasonRanking';

export interface SeasonBreakdownItem {
  id: string;
  song?: Song;
  /** Sum of this file's difficulty bests; undefined means no recorded play. */
  score?: number;
  error?: Error;
  isLoading: boolean;
}

type SeasonStatus = 'upcoming' | 'ongoing' | 'ended';
type ChartState = Pick<SeasonChartsState, 'items' | 'songhashes' | 'error' | 'isLoading'>;
const clients = new WeakMap<object, ReturnType<typeof createSeasonBreakdownCache>>();

/** Only an opened card queries exact-period per-file contributions. */
export function useSeasonBreakdown(
  event: Event,
  chartState: ChartState,
  playerId: string,
  active: boolean,
  status: SeasonStatus,
) {
  const { cache } = useSWRConfig();
  const client = useMemo(() => {
    let shared = clients.get(cache);
    if (!shared) {
      shared = createSeasonBreakdownCache(request => fetchSeasonRanking([endpoints.playhistory.ranking, request]));
      clients.set(cache, shared);
    }
    return shared;
  }, [cache]);
  const configuration = useMemo(() => {
    if (!chartState.songhashes || chartState.error) return { error: chartState.error };
    try {
      const request = buildSeasonRankingRequest(event, chartState.songhashes);
      return { requests: request.songhashes.map(hash => ({ ...request, songhashes: [hash] })) };
    } catch (error) {
      return { error: error instanceof Error ? error : new Error('Invalid season configuration') };
    }
  }, [event, chartState.songhashes, chartState.error]);
  const enabled = active && Boolean(playerId) && status !== 'upcoming' && Boolean(configuration.requests);
  const { data, error, isLoading, mutate } = useSWR<SeasonBreakdownSnapshot[], Error>(
    enabled ? ['season-breakdown', status, configuration.requests] : null,
    ([, currentStatus, requests]: [string, 'ongoing' | 'ended', PlayHistoryRankingRequest[]]) => Promise.all(
      requests.map(request => client.get(request, currentStatus)),
    ),
    {
      revalidateOnMount: true,
      revalidateOnFocus: false,
      revalidateOnReconnect: enabled && status === 'ongoing',
      dedupingInterval: 30_000,
      refreshInterval: enabled && status === 'ongoing' ? 60_000 : 0,
      refreshWhenHidden: false,
      refreshWhenOffline: false,
      shouldRetryOnError: false,
    },
  );
  const commonError = configuration.error ?? error;
  const items: SeasonBreakdownItem[] = chartState.items.map((chart, index) => {
    const snapshot = data?.[index];
    const row = snapshot?.rows?.find(entry => entry.playerId === playerId);
    return {
      id: chart.id,
      song: chart.song,
      score: row ? Number(row.totalAccDX.toFixed(4)) : undefined,
      error: snapshot?.error ?? commonError,
      isLoading: active && (chartState.isLoading || (enabled && isLoading && !snapshot)),
    };
  });

  async function refresh() {
    if (!enabled || !configuration.requests) return;
    client.invalidate(configuration.requests);
    await mutate();
  }

  return {
    items,
    isLoading: active && (chartState.isLoading || (enabled && isLoading)),
    hasErrors: Boolean(commonError || data?.some(item => item.error)),
    refresh,
  };
}

interface SeasonBreakdownSnapshot {
  rows?: PlayHistoryRankingEntry[];
  error?: Error;
}

type BreakdownCacheStatus = 'ongoing' | 'ended';
interface CachedSnapshot {
  status: BreakdownCacheStatus;
  checkedAt: number;
  result?: SeasonBreakdownSnapshot;
  pending?: Promise<SeasonBreakdownSnapshot>;
}

/** Cache complete single-file standings, shared by every player's open card. */
function createSeasonBreakdownCache(fetcher: (request: PlayHistoryRankingRequest) => Promise<PlayHistoryRankingEntry[]>) {
  const snapshots = new Map<string, CachedSnapshot>();
  const limit = createSeasonRequestLimiter(3);
  const requestKey = (request: PlayHistoryRankingRequest) => JSON.stringify([endpoints.playhistory.ranking, request]);

  function get(request: PlayHistoryRankingRequest, status: BreakdownCacheStatus): Promise<SeasonBreakdownSnapshot> {
    const key = requestKey(request);
    const previous = snapshots.get(key);
    if (previous?.status === status) {
      if (previous.pending) return previous.pending;
      if (previous.result && Date.now() - previous.checkedAt < 60_000) return Promise.resolve(previous.result);
    }
    const current: CachedSnapshot = { status, checkedAt: 0, result: previous?.result };
    snapshots.set(key, current);
    current.pending = limit(() => fetcher(request)).then(
      rows => ({ rows }),
      error => ({ rows: previous?.result?.rows, error: error instanceof Error || error instanceof DOMException ? error : new Error('Season breakdown request failed') }),
    ).then(result => {
      current.checkedAt = Date.now();
      current.result = result;
      current.pending = undefined;
      // A late pre-closing request only writes its own entry, which has already
      // been replaced in the cache by the final request for the ended season.
      return result;
    });
    return current.pending;
  }

  function invalidate(requests: readonly PlayHistoryRankingRequest[]) {
    for (const request of requests) {
      const entry = snapshots.get(requestKey(request));
      if (entry) entry.checkedAt = Number.NEGATIVE_INFINITY;
    }
  }

  return { get, invalidate };
}
