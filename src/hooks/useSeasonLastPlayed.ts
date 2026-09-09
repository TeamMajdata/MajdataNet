import { useMemo } from 'react';
import useSWR from 'swr';
import { endpoints } from '@/config/api';
import type { Event } from '@/types/event';
import type { SeasonChartsState } from './useSeasonCharts';
import { buildSeasonRankingRequest, createSeasonRequestLimiter, parseSeasonChart } from '@/utils/season';

type SeasonStatus = 'upcoming' | 'ongoing' | 'ended';
interface RecentQuery {
  chartIds: string[];
  songhashes: string[];
  startTime: string;
  endTime: string;
}
interface RecentResult { timestamp?: string }
type RecentKey = [string, string, string, RecentQuery, SeasonStatus];

// A page can contain 50 players. Bound these secondary requests independently of
// the leaderboard so loading timestamps cannot hold up the scores themselves.
const limitRecentRequests = createSeasonRequestLimiter(4);

function fetchLastPlayed([, url, , query]: RecentKey): Promise<RecentResult> {
  return limitRecentRequests(async () => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      controller.abort(new DOMException('Recent plays request timed out', 'TimeoutError'));
    }, 15_000);
    try {
      const response = await fetch(url, { credentials: 'include', signal: controller.signal });
      if (!response.ok) throw new Error(`Recent plays request failed (${response.status})`);
      return { timestamp: findSeasonLastPlayed(await response.json(), query.chartIds, query.startTime, query.endTime) };
    } finally {
      window.clearTimeout(timeout);
    }
  });
}

/** Mount only for players on the current leaderboard page. */
export function useSeasonLastPlayed(username: string, event: Event, chartState: SeasonChartsState, status: SeasonStatus) {
  const { songhashes, isLoading: chartsLoading, error: chartsError } = chartState;
  const query = useMemo<RecentQuery | undefined>(() => {
    if (chartsLoading || chartsError || !songhashes || !event.season) return undefined;
    try {
      const { startTime, endTime } = buildSeasonRankingRequest(event, songhashes);
      return { chartIds: event.season.charts.map(parseSeasonChart), songhashes, startTime, endTime };
    } catch {
      return undefined;
    }
  }, [event, songhashes, chartsLoading, chartsError]);
  const key: RecentKey | null = status !== 'upcoming' && query && username
    ? ['season-last-played', endpoints.account.recent(encodeURIComponent(username)), event.id, query, status]
    : null;
  const { data, error, isLoading } = useSWR<RecentResult, Error>(key, fetchLastPlayed, {
    revalidateOnMount: true,
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    refreshInterval: 0,
    shouldRetryOnError: false,
  });

  return {
    timestamp: data?.timestamp,
    error,
    isLoading: chartsLoading || isLoading,
    unavailable: !chartsLoading && (!query || !username),
  };
}

/** Recent returns UTC timestamps; never interpret an unzoned value in the browser's timezone. */
function parseSeasonRecentTime(value: unknown): number | undefined {
  if (typeof value !== 'string') return undefined;
  const parts = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,7})?(?:Z|[+-]\d{2}:\d{2})$/.exec(value);
  if (!parts) return undefined;
  const [, year, month, day, hour, minute, second] = parts.map(Number);
  const calendarDay = new Date(`${parts[1]}-${parts[2]}-${parts[3]}T00:00:00Z`);
  if (calendarDay.getUTCFullYear() !== year || calendarDay.getUTCMonth() + 1 !== month
    || calendarDay.getUTCDate() !== day || hour > 23 || minute > 59 || second > 59) return undefined;
  const time = Date.parse(value);
  return Number.isFinite(time) ? time : undefined;
}

/** Every play counts, including a retry that did not improve the player's score. */
function findSeasonLastPlayed(
  records: unknown,
  chartIds: readonly string[],
  startTime: string,
  endTime: string,
): string | undefined {
  const start = parseSeasonRecentTime(startTime);
  const end = parseSeasonRecentTime(endTime);
  if (start === undefined || end === undefined || start > end) throw new Error('Invalid season time range');
  if (!Array.isArray(records)) throw new Error('Unexpected recent plays response');
  const pool = new Set(chartIds);
  let latest: number | undefined;
  for (const record of records) {
    if (!record || typeof record !== 'object' || typeof record.chartId !== 'string') {
      throw new Error('Unexpected recent play record');
    }
    if (!pool.has(record.chartId)) continue;
    const time = parseSeasonRecentTime(record.timestamp);
    if (time === undefined) throw new Error('Recent play has an invalid timestamp');
    if (time >= start && time <= end && (latest === undefined || time > latest)) latest = time;
  }
  return latest === undefined ? undefined : new Date(latest).toISOString();
}
