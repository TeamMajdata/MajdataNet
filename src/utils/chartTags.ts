import { endpoints } from '@/config/api';
import { ApiError, apiRequest, jsonRequest } from './apiClient';

/** `private`: the uploader's own tags; `public`: player tags that any logged-in user may edit. */
export type ChartTagScope = 'private' | 'public';

/** The backend keeps at most this many tags of each kind per chart, counted after normalization. */
export const MAX_CHART_TAGS = 32;

/** How often a PATCH that lost to concurrent edits (409) is sent again before giving up. */
const PATCH_CONFLICT_RETRIES = 1;

export interface ChartTagPatch {
  add: string[];
  remove: string[];
}

/**
 * Changes from the tags last read from the server to the edited ones.
 * A tag is in at most one list: one that was removed and added back is unchanged.
 */
export function diffChartTags(before: readonly string[], after: readonly string[]): ChartTagPatch {
  const beforeSet = new Set(before);
  const afterSet = new Set(after);
  return {
    add: [...afterSet].filter((tag) => !beforeSet.has(tag)),
    remove: [...beforeSet].filter((tag) => !afterSet.has(tag)),
  };
}

/**
 * Saves the edited tags and resolves to the tags the server holds afterwards.
 *
 * Private tags have a single editor (the uploader), so the whole list replaces them with PUT.
 * Public tags are edited by many players, so only this editor's additions and removals are sent
 * with PATCH; a replacing PUT would drop tags that others added since the window was opened.
 * PATCH is idempotent, so a 409 (the server lost to concurrent edits several times) is retried.
 *
 * Rejects with an ApiError; `code` is CODE_TOO_MANY_ELEMENTS when the result would exceed
 * MAX_CHART_TAGS, and the status is 409 when the conflict outlasted the retries.
 */
export async function saveChartTags(
  chartId: string,
  scope: ChartTagScope,
  before: readonly string[],
  after: readonly string[],
): Promise<string[]> {
  if (scope === 'private') {
    return apiRequest<string[]>(endpoints.maichart.tags(chartId), jsonRequest('PUT', [...after]));
  }
  const patch = jsonRequest('PATCH', diffChartTags(before, after));
  for (let attempt = 0; ; attempt++) {
    try {
      return await apiRequest<string[]>(endpoints.maichart.publictags(chartId), patch);
    } catch (error) {
      if (!(error instanceof ApiError && error.status === 409 && attempt < PATCH_CONFLICT_RETRIES)) throw error;
    }
  }
}
