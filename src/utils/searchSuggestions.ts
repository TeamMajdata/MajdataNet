import type { SongSummary } from '@/types';
import { stripTmpTags } from './richTextUtils';

export type SuggestionKind = 'title' | 'artist' | 'designer' | 'uploader' | 'tag';

export interface SearchSuggestion {
  kind: SuggestionKind;
  /** 下拉里显示的文字 */
  label: string;
  /** 选中后填进搜索框的完整内容 */
  value: string;
}

/** 搜索框支持的前缀操作符；空输入时作为提示列出 */
export const SEARCH_OPERATORS = ['id:', 'hash:', 'tag:', 'uploader:'] as const;

/** 列表接口返回的谱面字段（标签可能缺失） */
export type SuggestionSource = Pick<SongSummary, 'title' | 'artist' | 'designer' | 'uploader'> & Partial<Pick<SongSummary, 'tags' | 'publicTags'>>;

const KIND_ORDER: SuggestionKind[] = ['title', 'artist', 'designer', 'uploader', 'tag'];

/**
 * 从一次搜索返回的谱面里提取联想词。
 * 普通输入在曲名、曲师、谱师、上传者、标签里匹配；`uploader:` / `tag:` 前缀只匹配对应字段。
 * 前缀匹配排在包含匹配之前，同类同名只保留一条。
 */
export function buildSuggestions(query: string, songs: readonly SuggestionSource[], limit = 8): SearchSuggestion[] {
  const trimmed = query.trim();
  const operator = /^(uploader|tag):/i.exec(trimmed)?.[1]?.toLowerCase() as 'uploader' | 'tag' | undefined;
  const needle = (operator ? trimmed.slice(operator.length + 1) : trimmed).trim().toLowerCase();
  if (!needle) return [];
  if (!operator && /^(id|hash):/i.test(trimmed)) return [];

  const kinds: SuggestionKind[] = operator ? [operator] : KIND_ORDER;
  const seen = new Set<string>();
  const prefix: (SearchSuggestion & { order: number })[] = [];
  const contains: (SearchSuggestion & { order: number })[] = [];

  const add = (kind: SuggestionKind, raw: string | null | undefined) => {
    if (!kinds.includes(kind) || !raw) return;
    const label = (kind === 'title' ? stripTmpTags(raw) : raw).trim();
    const lower = label.toLowerCase();
    const index = lower.indexOf(needle);
    if (index < 0) return;
    const key = `${kind}:${lower}`;
    if (seen.has(key)) return;
    seen.add(key);
    const value = kind === 'uploader' ? `uploader:${label}` : kind === 'tag' ? `tag:${label}` : label;
    (index === 0 ? prefix : contains).push({ kind, label, value, order: KIND_ORDER.indexOf(kind) });
  };

  for (const song of songs) {
    add('title', song.title);
    add('artist', song.artist);
    add('designer', song.designer);
    add('uploader', song.uploader);
    for (const tag of [...(song.publicTags ?? []), ...(song.tags ?? [])]) add('tag', tag);
  }

  const byKind = (a: { order: number }, b: { order: number }) => a.order - b.order;
  return [...prefix.sort(byKind), ...contains.sort(byKind)]
    .slice(0, limit)
    .map(({ kind, label, value }) => ({ kind, label, value }));
}
