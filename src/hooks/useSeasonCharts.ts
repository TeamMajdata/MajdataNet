import { useId, useMemo } from 'react';
import useSWR from 'swr';
import { endpoints } from '@/config/api';
import type { SeasonChart } from '@/types/event';
import type { Song } from '@/types/song';
import { createSeasonRequestLimiter, parseSeasonChart } from '@/utils/season';

export interface SeasonChartSummary {
  id: string;
  chart: SeasonChart;
  song?: Song;
  error?: Error;
  invalidDifficulty?: boolean;
}

const limit = createSeasonRequestLimiter();

async function fetchSeasonChart(chart: SeasonChart): Promise<SeasonChartSummary> {
  const id = parseSeasonChart(chart);
  const item: SeasonChartSummary = { id, chart };
  const controller = new AbortController();
  const timeout = window.setTimeout(() => {
    controller.abort(new DOMException('Chart request timed out', 'TimeoutError'));
  }, 15_000);
  try {
    const response = await fetch(endpoints.maichart.summary(id), {
      credentials: 'include', signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Chart request failed (${response.status})`);
    const value: unknown = await response.json();
    if (!value || typeof value !== 'object') throw new Error('Unexpected chart response');
    const song = value as Record<string, unknown>;
    if (!['id', 'title', 'hash'].every(field => typeof song[field] === 'string')
      || !Array.isArray(song.levels)
      || !song.levels.every(level => level === null || typeof level === 'string')
      || song.id !== id || !(song.hash as string).trim() || song.hash !== (song.hash as string).trim()) {
      throw new Error('Unexpected chart response');
    }
    item.song = {
      id: song.id as string,
      title: song.title as string,
      hash: song.hash as string,
      artist: typeof song.artist === 'string' ? song.artist : '',
      uploader: typeof song.uploader === 'string' ? song.uploader : '',
      designer: typeof song.designer === 'string' ? song.designer : '',
      // Keep positions: their indices identify the difficulty in SongCard.
      levels: (song.levels as (string | null)[]).map(level => level ?? ''),
    };
    item.invalidDifficulty = item.song.levels.filter(level => level.trim() !== '').length === 0;
    if (item.invalidDifficulty) item.error = new Error('Chart must contain at least one non-empty difficulty');
  } catch (error) {
    item.error = error instanceof Error || error instanceof DOMException ? error : new Error('Chart request failed');
  } finally {
    window.clearTimeout(timeout);
  }
  return item;
}

/** One metadata snapshot supplies both the visible pool and the ranking hashes. */
export function useSeasonCharts(charts: SeasonChart[]) {
  // Resolve current versions on every visit before reusing cached standings.
  const snapshotId = useId();
  const { data, error: requestError, isLoading, isValidating, mutate } = useSWR<SeasonChartSummary[], Error>(
    ['season-chart-summaries', snapshotId, charts],
    ([, , configured]: [string, string, SeasonChart[]]) => Promise.all(configured.map(chart => limit(() => fetchSeasonChart(chart)))),
    {
      revalidateOnMount: true,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      shouldRetryOnError: false,
    },
  );
  const items = useMemo<SeasonChartSummary[]>(() => data ?? charts.map(chart => ({ id: parseSeasonChart(chart), chart })), [data, charts]);
  const resolved = useMemo(() => {
    if (requestError) return { error: requestError };
    if (isLoading || isValidating || !data) return {};
    const error = data.find(item => item.error)?.error;
    if (error) return { error };
    const songhashes = data.map(item => item.song!.hash);
    if (new Set(songhashes).size !== songhashes.length) {
      return { error: new Error('Multiple season charts resolve to the same hash') };
    }
    return { songhashes };
  }, [data, requestError, isLoading, isValidating]);

  async function retry(id?: string) {
    if (!id) return void await mutate();
    const chart = charts.find(value => parseSeasonChart(value) === id);
    if (!chart) return;
    const replacement = await limit(() => fetchSeasonChart(chart));
    // Merge into the latest result so independent retries cannot overwrite each other.
    await mutate(current => current?.map(item => item.id === id ? replacement : item), { revalidate: false });
  }

  return { items, ...resolved, isLoading: isLoading || isValidating, retry };
}

export type SeasonChartsState = ReturnType<typeof useSeasonCharts>;
