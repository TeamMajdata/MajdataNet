import { useEffect, useMemo, useRef } from 'react';
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
  const { data, error, isLoading, isValidating, mutate } = useSWR<PlayHistoryRankingEntry[], Error>(
    status === 'upcoming' || !request ? null : [endpoints.playhistory.ranking, request],
    fetchSeasonRanking,
    {
      revalidateOnMount: true,
      revalidateOnFocus: false,
      revalidateOnReconnect: status === 'ongoing',
      refreshInterval: 0,
      shouldRetryOnError: false,
    },
  );

  const requestKey = JSON.stringify(request);
  const previousBoundary = useRef({ status, requestKey });
  const pendingBoundaryRefresh = useRef(false);
  useEffect(() => {
    // Opening the season changes the null key and fetches automatically. Closing it
    // leaves the key unchanged. Wait for an in-flight query to settle before the
    // final refresh, so its late failure cannot overwrite the final result.
    const previous = previousBoundary.current;
    if (previous.requestKey !== requestKey || status === 'upcoming' || !request) {
      pendingBoundaryRefresh.current = false;
    } else if (previous.status !== status && previous.status !== 'upcoming') {
      pendingBoundaryRefresh.current = true;
    }
    previousBoundary.current = { status, requestKey };
    if (pendingBoundaryRefresh.current && !isValidating) {
      pendingBoundaryRefresh.current = false;
      void mutate();
    }
  }, [status, requestKey, request, isValidating, mutate]);

  useEffect(() => {
    if (status !== 'ongoing' || isValidating || !request) return;
    // An explicit interval also recovers from temporary failures; SWR's built-in
    // polling stops after an error when automatic error retries are disabled.
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible' && navigator.onLine) void mutate();
    }, 60_000);
    return () => window.clearInterval(timer);
  }, [status, requestKey, request, isValidating, mutate]);

  const entries = useMemo(() => data ? rankSeasonEntries(data) : undefined, [data]);
  return { entries, error, isLoading, isValidating, refresh: mutate };
}
