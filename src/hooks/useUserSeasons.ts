import { useId, useMemo } from 'react';
import useSWR from 'swr';
import { endpoints } from '@/config/api';
import type { Event } from '@/types/event';
import type { PlayHistoryRankingRequest, RankedSeasonEntry } from '@/types/event';
import { getAllEvents } from '@/utils/eventsData';
import { buildSeasonRankingRequest, rankSeasonEntries, parseSeasonChart, getSeasonStatus, validateSeasonEvent, createSeasonRequestLimiter, type RequestLimiter } from '@/utils/season';
import { useEventClock } from './useEventClock';
import { fetchSeasonChart } from './useSeasonCharts';
import { fetchSeasonRanking } from './useSeasonRanking';

interface UserSeasonCandidate {
  event: Event;
  status: 'ongoing' | 'ended';
}

interface UserSeasonResult extends UserSeasonCandidate {
  entry: RankedSeasonEntry;
}

/** Future and malformed events cannot contribute a public season result. */
function getUserSeasonCandidates(events: readonly Event[], now: number): UserSeasonCandidate[] {
  return events.flatMap(event => {
    if (event.category !== 5 || validateSeasonEvent(event).length) return [];
    const status = getSeasonStatus(event, now);
    return status === 'upcoming' ? [] : [{ event, status }];
  }).sort((a, b) => Number(b.status === 'ongoing') - Number(a.status === 'ongoing')
    || Date.parse(b.event.createDate) - Date.parse(a.event.createDate)
    || a.event.id.localeCompare(b.event.id));
}

interface SeasonQuery {
  eventId: string;
  request: PlayHistoryRankingRequest;
}

interface PoolSnapshot {
  eventId: string;
  query?: SeasonQuery;
  error?: Error;
}

interface RankingSnapshot {
  eventId: string;
  entries?: RankedSeasonEntry[];
  error?: Error;
}

interface CachedRanking {
  revision: number;
  entries?: RankedSeasonEntry[];
}

const asError = (error: unknown) => error instanceof Error ? error : new Error('Season request failed');

async function resolvePools(events: Event[], limit: RequestLimiter): Promise<PoolSnapshot[]> {
  return Promise.all(events.map(async event => {
    try {
      const items = await Promise.all(event.season!.charts.map(chart => limit(() => fetchSeasonChart(chart))));
      const failure = items.find(item => item.error)?.error;
      if (failure) throw failure;
      const hashes = items.map(item => parseSeasonChart(item.chart).hash ?? item.song!.hash);
      // No partial pool is ever submitted, including duplicate resolved hashes.
      return { eventId: event.id, query: { eventId: event.id, request: buildSeasonRankingRequest(event, hashes) } };
    } catch (error) {
      return { eventId: event.id, error: asError(error) };
    }
  }));
}

function useRankingGroup(
  queries: SeasonQuery[],
  status: 'ongoing' | 'ended',
  limit: RequestLimiter,
  successful: Map<string, CachedRanking>,
) {
  return useSWR<RankingSnapshot[], Error>(
    queries.length ? ['user-season-rankings', status, queries] : null,
    ([, , configured]: [string, string, SeasonQuery[]]) => Promise.all(configured.map(async query => {
      // Both the cache and SWR key include the complete resolved scoring request.
      const key = JSON.stringify([endpoints.playhistory.ranking, query.request]);
      const previous = successful.get(key);
      const revision = (previous?.revision ?? 0) + 1;
      successful.set(key, { revision, entries: previous?.entries });
      try {
        const rows = await limit(() => fetchSeasonRanking([endpoints.playhistory.ranking, query.request]));
        const entries = rankSeasonEntries(rows);
        // A query that started before closing may complete after the final one.
        // It must not overwrite that newer snapshot used for failure recovery.
        if (successful.get(key)?.revision === revision) successful.set(key, { revision, entries });
        return { eventId: query.eventId, entries };
      } catch (error) {
        return { eventId: query.eventId, entries: successful.get(key)?.entries, error: asError(error) };
      }
    })),
    {
      revalidateOnMount: true,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      refreshInterval: 0,
      shouldRetryOnError: false,
    },
  );
}

/** Query complete seasonal standings, then select the current profile's entries. */
export function useUserSeasons(username: string) {
  const events = getAllEvents();
  const now = useEventClock(events);
  const candidates = useMemo(() => getUserSeasonCandidates(events, now), [events, now]);
  const snapshotId = useId();
  const limit = useMemo(() => createSeasonRequestLimiter(), []);
  const successful = useMemo(() => new Map<string, CachedRanking>(), []);
  // Status changes must not resolve unchanged song versions again. A new page
  // visit does resolve them, before it can reuse rankings from a previous visit.
  const configured = useMemo(() => candidates.map(item => item.event)
    .sort((a, b) => a.id.localeCompare(b.id)), [candidates]);
  const hasSeasons = Boolean(username) && configured.length > 0;
  const pools = useSWR<PoolSnapshot[], Error>(
    hasSeasons ? ['user-season-pools', snapshotId, configured] : null,
    ([, , all]: [string, string, Event[]]) => resolvePools(all, limit),
    { revalidateOnMount: true, revalidateOnFocus: false, revalidateOnReconnect: false, shouldRetryOnError: false },
  );
  const queries = (status: 'ongoing' | 'ended') => username ? candidates
    .filter(candidate => candidate.status === status)
    .flatMap(candidate => pools.data?.find(item => item.eventId === candidate.event.id)?.query ?? []) : [];
  // Moving into the ended group queries once at the closing boundary.
  const ongoing = useRankingGroup(queries('ongoing'), 'ongoing', limit, successful);
  const ended = useRankingGroup(queries('ended'), 'ended', limit, successful);
  const results: UserSeasonResult[] = candidates.flatMap(candidate => {
    const group = candidate.status === 'ongoing' ? ongoing : ended;
    const entry = group.data?.find(item => item.eventId === candidate.event.id)
      ?.entries?.find(row => row.username === username);
    return entry ? [{ ...candidate, entry }] : [];
  });
  const poolFailed = Boolean(pools.error || pools.data?.some(item => item.error));
  const hasErrors = poolFailed || Boolean(ongoing.error || ended.error
    || ongoing.data?.some(item => item.error) || ended.data?.some(item => item.error));

  async function refresh() {
    if (poolFailed) await pools.mutate();
    await Promise.all([ongoing.mutate(), ended.mutate()]);
  }

  return {
    results,
    hasSeasons,
    isLoading: hasSeasons && (pools.isLoading || ongoing.isLoading || ended.isLoading),
    hasErrors: hasSeasons && hasErrors,
    refresh,
  };
}
