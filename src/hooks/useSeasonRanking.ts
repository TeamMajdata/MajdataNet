import { useMemo } from 'react';
import useSWR from 'swr';
import { endpoints } from '@/config/api';
import type { Event } from '@/types/event';
import type { PlayHistoryRankingEntry } from '@/types/event';
import { buildSeasonRankingRequest, rankSeasonEntries } from '@/utils/season';

type SeasonStatus = 'upcoming' | 'ongoing' | 'ended';
type RankingRequest = ReturnType<typeof buildSeasonRankingRequest>;

function isRankingEntry(value: unknown): value is PlayHistoryRankingEntry {
  if (!value || typeof value !== 'object') return false;
  const row = value as Record<string, unknown>;
  return typeof row.playerId === 'string' && row.playerId.length > 0
    && typeof row.username === 'string'
    && ['totalDXScore', 'totalAccDX', 'totalAccClassic'].every(
      field => typeof row[field] === 'number' && Number.isFinite(row[field]),
    );
}

export async function fetchSeasonRanking([url, request]: [string, RankingRequest]): Promise<PlayHistoryRankingEntry[]> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => {
    controller.abort(new DOMException('Ranking request timed out', 'TimeoutError'));
  }, 15_000);
  try {
    const response = await fetch(url, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Ranking request failed (${response.status})`);
    const rows: unknown = await response.json();
    if (!Array.isArray(rows) || !rows.every(isRankingEntry)) {
      throw new Error('Unexpected ranking response');
    }
    return rows;
  } finally {
    window.clearTimeout(timeout);
  }
}

/** The full payload is part of the SWR key, keeping fixed chart versions and seasons isolated. */
export function useSeasonRanking(event: Event, status: SeasonStatus, songhashes?: string[] | null) {
  // null means the shared metadata snapshot has not resolved the complete pool.
  const request = useMemo(() => songhashes === null ? null : buildSeasonRankingRequest(event, songhashes), [event, songhashes]);
  // A status change queries once at the boundary; there is no periodic polling.
  const { data, error, isLoading } = useSWR<PlayHistoryRankingEntry[], Error>(
    status === 'upcoming' || !request ? null : [endpoints.playhistory.ranking, request, status],
    ([url, payload]: [string, RankingRequest, SeasonStatus]) => fetchSeasonRanking([url, payload]),
    {
      revalidateOnMount: true,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      refreshInterval: 0,
      shouldRetryOnError: false,
    },
  );

  const entries = useMemo(() => data ? rankSeasonEntries(data) : undefined, [data]);
  return { entries, error, isLoading };
}
