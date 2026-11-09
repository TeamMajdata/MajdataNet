import { endpoints } from '@/config/api';
import type { Song } from '@/types/song';
import { apiRequest, jsonRequest } from './apiClient';

/** One item of `POST /api/maichart/info`; only the fields the frontend reads are typed. */
export interface OnlineChartInfo {
  metadata: Omit<Song, 'levels'> & { levels: (string | null)[] };
  levelHashes: (string | null)[];
}

/**
 * Loads the metadata of several charts with one request, in the order of `ids`.
 * Charts that no longer exist are left out; an empty list sends no request.
 */
export async function fetchChartInfos(ids: readonly string[]): Promise<Song[]> {
  if (ids.length === 0) return [];
  const infos = await apiRequest<OnlineChartInfo[]>(endpoints.maichart.info, jsonRequest('POST', ids));
  const byId = new Map<string, Song>();
  for (const { metadata } of Array.isArray(infos) ? infos : []) {
    if (!metadata || typeof metadata.id !== 'string') continue;
    byId.set(metadata.id.toLowerCase(), {
      id: metadata.id,
      title: metadata.title,
      artist: metadata.artist,
      uploader: metadata.uploader,
      designer: metadata.designer,
      hash: metadata.hash,
      // Keep positions: their indices identify the difficulty.
      levels: (metadata.levels ?? []).map(level => level ?? ''),
    });
  }
  // GUIDs compare case-insensitively; follow the requested order rather than the response's.
  return ids.flatMap(id => byId.get(id.toLowerCase()) ?? []);
}
