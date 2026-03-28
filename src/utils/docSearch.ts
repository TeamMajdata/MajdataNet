import Fuse from 'fuse.js';
import type { IFuseOptions } from 'fuse.js';
import type { DocSearchItem, FlatDocItem, Language } from '@/types';
import { loadDocContent } from './documentLoader';

const SEARCH_OPTIONS: IFuseOptions<DocSearchItem> = {
  keys: [
    { name: 'title', weight: 0.6 },
    { name: 'content', weight: 0.4 },
  ],
  threshold: 0.35,
  ignoreLocation: true,
  includeScore: true,
};

function stripMarkdown(content: string): string {
  return content
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[>#*_~\-|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function excerpt(content: string, maxLength = 160): string {
  const plain = stripMarkdown(content);
  if (plain.length <= maxLength) return plain;
  return `${plain.slice(0, maxLength).trimEnd()}...`;
}

export async function buildDocSearchIndex(language: Language, docs: FlatDocItem[]): Promise<Fuse<DocSearchItem>> {
  const items = await Promise.all(
    docs.map(async (doc) => {
      try {
        const content = await loadDocContent(language, doc.slug);
        return {
          title: doc.title,
          slug: doc.slug,
          content: stripMarkdown(content),
          excerpt: excerpt(content),
        };
      } catch {
        return {
          title: doc.title,
          slug: doc.slug,
          content: '',
          excerpt: '',
        };
      }
    })
  );

  return new Fuse(items, SEARCH_OPTIONS);
}

export function searchDocs(index: Fuse<DocSearchItem> | null, query: string, limit = 8): DocSearchItem[] {
  const trimmed = query.trim();
  if (!index || !trimmed) return [];
  return index
    .search(trimmed, { limit })
    .map((item) => item.item)
    .filter((item) => item.content || item.title);
}
