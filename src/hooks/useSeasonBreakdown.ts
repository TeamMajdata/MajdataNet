import { useMemo } from 'react';
import useSWR from 'swr';
import { endpoints } from '@/config/api';
import type { Event } from '@/types/event';
import type { PlayHistoryRankingEntry, PlayHistoryRankingRequest } from '@/types/event';
import type { Song } from '@/types/song';
import { buildSeasonRankingRequest } from '@/utils/season';
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

interface SeasonBreakdownSnapshot {
  rows?: PlayHistoryRankingEntry[];
  error?: Error;
}

/** Only an opened card queries exact-period per-file contributions. */
export function useSeasonBreakdown(
  event: Event,
  chartState: ChartState,
  playerId: string,
  active: boolean,
  status: SeasonStatus,
) {
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
  // Every player uses the same complete per-song standings. SWR handles cache
  // sharing and in-flight deduplication; playerId only selects rows below.
  const { data, error, isLoading } = useSWR<SeasonBreakdownSnapshot[], Error>(
    enabled ? ['season-breakdown', status, configuration.requests] : null,
    ([, , requests]: [string, SeasonStatus, PlayHistoryRankingRequest[]]) => Promise.all(
      requests.map(async request => {
        try {
          return { rows: await fetchSeasonRanking([endpoints.playhistory.ranking, request]) };
        } catch (error) {
          return { error: error instanceof Error ? error : new Error('Season breakdown request failed') };
        }
      }),
    ),
    {
      revalidateOnMount: true,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 60_000,
      refreshInterval: 0,
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

  return {
    items,
    isLoading: active && (chartState.isLoading || (enabled && isLoading)),
    hasErrors: Boolean(commonError || data?.some(item => item.error)),
  };
}
