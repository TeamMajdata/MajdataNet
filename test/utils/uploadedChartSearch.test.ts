import { describe, expect, it, vi } from 'vitest';
import { buildUploadedChartSuggestions, collectAllPages, filterUploadedCharts } from '@/utils/uploadedChartSearch';

const songs = [
  { title: '<color=red>Glory</color> MAX', artist: 'TAK', designer: 'Richer', uploader: 'Richer', tags: [], publicTags: ['OTOGE'] },
  { title: 'Lament Rain', artist: 'Ashrount', designer: 'zzz', uploader: 'Richer', tags: ['glow'], publicTags: [] },
  { title: 'Nick of Time', artist: 'P4koo', designer: 'Richer', uploader: 'Richer' },
];

describe('buildUploadedChartSuggestions', () => {
  it('suggests titles, artists, designers and tags but never the uploader', () => {
    expect(buildUploadedChartSuggestions('ric', songs)).toEqual([
      { kind: 'designer', label: 'Richer', value: 'Richer' },
    ]);
    expect(buildUploadedChartSuggestions('glo', songs)).toEqual([
      { kind: 'title', label: 'Glory MAX', value: 'Glory MAX' },
      { kind: 'tag', label: 'glow', value: 'tag:glow' },
    ]);
  });

  it('returns nothing for empty or operator-only queries', () => {
    expect(buildUploadedChartSuggestions('', songs)).toEqual([]);
    expect(buildUploadedChartSuggestions('uploader:Ric', songs)).toEqual([]);
    expect(buildUploadedChartSuggestions('id:1', songs)).toEqual([]);
  });

  it('honours the limit', () => {
    expect(buildUploadedChartSuggestions('a', songs, 2)).toHaveLength(2);
  });
});

describe('filterUploadedCharts', () => {
  it('keeps everything for a blank query', () => {
    expect(filterUploadedCharts('  ', songs)).toEqual(songs);
  });

  it('matches title without rich-text tags, artist, designer and tags, case-insensitively', () => {
    expect(filterUploadedCharts('glory max', songs).map((s) => s.title)).toEqual(['<color=red>Glory</color> MAX']);
    expect(filterUploadedCharts('ASHROUNT', songs).map((s) => s.title)).toEqual(['Lament Rain']);
    expect(filterUploadedCharts('otoge', songs).map((s) => s.title)).toEqual(['<color=red>Glory</color> MAX']);
    expect(filterUploadedCharts('richer', songs)).toHaveLength(2);
  });

  it('requires every whitespace-separated term to match, across fields', () => {
    expect(filterUploadedCharts('richer p4koo', songs).map((s) => s.title)).toEqual(['Nick of Time']);
    expect(filterUploadedCharts('richer nope', songs)).toEqual([]);
  });

  it('does not match on the uploader alone', () => {
    expect(filterUploadedCharts('Ashrount Richer', songs)).toEqual([]);
  });

  it('limits tag: queries to tags', () => {
    expect(filterUploadedCharts('tag:glow', songs).map((s) => s.title)).toEqual(['Lament Rain']);
    expect(filterUploadedCharts('tag:Rain', songs)).toEqual([]);
    expect(filterUploadedCharts('tag:', songs)).toEqual(songs);
  });
});

describe('collectAllPages', () => {
  const page = (start: number, count: number) => Array.from({ length: count }, (_, i) => ({ id: String(start + i) }));

  it('requests pages until one comes back short and drops duplicates across pages', async () => {
    const pages = [page(0, 3), [...page(2, 1), ...page(3, 2)], page(5, 1)];
    const fetchPage = vi.fn(async (index: number) => pages[index] ?? []);
    const all = await collectAllPages(fetchPage, 3);
    expect(fetchPage).toHaveBeenCalledTimes(3);
    expect(all.map((item) => item.id)).toEqual(['0', '1', '2', '3', '4', '5']);
  });

  it('stops at maxPages and treats non-array responses as empty', async () => {
    const full = vi.fn(async (index: number) => page(index * 2, 2));
    expect(await collectAllPages(full, 2, 3)).toHaveLength(6);
    expect(full).toHaveBeenCalledTimes(3);
    const broken = vi.fn(async () => ({ error: true }) as unknown as { id: string }[]);
    expect(await collectAllPages(broken, 2)).toEqual([]);
    expect(broken).toHaveBeenCalledTimes(1);
  });
});
