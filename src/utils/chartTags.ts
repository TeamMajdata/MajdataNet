import { endpoints } from '@/config/api';
import { apiRequest, jsonRequest } from './apiClient';

/** `private`: the uploader's own tags; `public`: player tags that any logged-in user may edit. */
export type ChartTagScope = 'private' | 'public';

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
 */
export function saveChartTags(
  chartId: string,
  scope: ChartTagScope,
  before: readonly string[],
  after: readonly string[],
): Promise<string[]> {
  if (scope === 'private') {
    return apiRequest<string[]>(endpoints.maichart.tags(chartId), jsonRequest('PUT', [...after]));
  }
  return apiRequest<string[]>(endpoints.maichart.publictags(chartId), jsonRequest('PATCH', diffChartTags(before, after)));
}
