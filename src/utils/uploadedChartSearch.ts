import { buildSuggestions, type SearchSuggestion, type SuggestionSource } from './searchSuggestions';
import { stripTmpTags } from './richTextUtils';

/**
 * 个人空间“上传的谱面”的页内搜索。
 * 后端的列表搜索不能把 `uploader:` 和关键词组合起来，所以拉回这个用户的全部上传后在前端联想和过滤。
 */

/** 联想只给曲名、曲师、谱师和标签：列表里的谱面都是同一个上传者，联想上传者没有意义 */
export function buildUploadedChartSuggestions(query: string, songs: readonly SuggestionSource[], limit = 8): SearchSuggestion[] {
  if (/^(uploader|id|hash):/i.test(query.trim())) return [];
  return buildSuggestions(query, songs.map((song) => ({ ...song, uploader: '' })), limit);
}

/**
 * 按搜索词过滤谱面：空白分隔的每个词都要在曲名（去掉富文本标签）、曲师、谱师或标签里出现，不区分大小写。
 * `tag:xxx` 只在标签里找（选中标签联想时填进来的就是这种形式）。
 */
export function filterUploadedCharts<T extends SuggestionSource>(query: string, songs: readonly T[]): T[] {
  const trimmed = query.trim();
  if (!trimmed) return [...songs];

  const tagOnly = /^tag:/i.exec(trimmed);
  if (tagOnly) {
    const needle = trimmed.slice(tagOnly[0].length).trim().toLowerCase();
    if (!needle) return [...songs];
    return songs.filter((song) => tagsOf(song).some((tag) => tag.toLowerCase().includes(needle)));
  }

  const terms = trimmed.toLowerCase().split(/\s+/);
  return songs.filter((song) => {
    const haystack = [stripTmpTags(song.title ?? ''), song.artist, song.designer, ...tagsOf(song)]
      .filter(Boolean)
      .join('\n')
      .toLowerCase();
    return terms.every((term) => haystack.includes(term));
  });
}

function tagsOf(song: SuggestionSource): string[] {
  return [...(song.publicTags ?? []), ...(song.tags ?? [])];
}

/**
 * 依次请求列表接口的每一页并合并（按 id 去重），直到某页不足 `pageSize` 条或达到 `maxPages`。
 */
export async function collectAllPages<T extends { id: string }>(
  fetchPage: (page: number) => Promise<T[]>,
  pageSize: number,
  maxPages = 50,
): Promise<T[]> {
  const seen = new Set<string>();
  const all: T[] = [];
  for (let page = 0; page < maxPages; page++) {
    const items = await fetchPage(page);
    const list = Array.isArray(items) ? items : [];
    for (const item of list) {
      if (!seen.has(item.id)) {
        seen.add(item.id);
        all.push(item);
      }
    }
    if (list.length < pageSize) break;
  }
  return all;
}
