import { normalizeDocSlug } from '@/config/docRoutes';
import type { DocStructure, Language } from '@/types';

const DEFAULT_LANGUAGE: Language = 'zh';

function sanitizePath(path: string): string {
  return path
    .split('/')
    .map((part) => encodeURIComponent(part))
    .join('/');
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch JSON: ${url}`);
  }
  return (await res.json()) as T;
}

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch Markdown: ${url}`);
  }
  return res.text();
}

export async function loadDocStructure(language: Language): Promise<DocStructure> {
  const lang = language || DEFAULT_LANGUAGE;
  try {
    return await fetchJson<DocStructure>(`/docs/${lang}/_structure.json`);
  } catch {
    if (lang !== DEFAULT_LANGUAGE) {
      return fetchJson<DocStructure>(`/docs/${DEFAULT_LANGUAGE}/_structure.json`);
    }
    throw new Error('Failed to load docs structure');
  }
}

export async function loadDocContent(language: Language, slug: string): Promise<string> {
  const lang = language || DEFAULT_LANGUAGE;
  const normalizedSlug = normalizeDocSlug(slug);
  const filePath = normalizedSlug === 'index' ? 'index' : normalizedSlug;
  const encoded = sanitizePath(filePath);

  try {
    return await fetchText(`/docs/${lang}/${encoded}.md`);
  } catch {
    if (lang !== DEFAULT_LANGUAGE) {
      return fetchText(`/docs/${DEFAULT_LANGUAGE}/${encoded}.md`);
    }
    throw new Error('Failed to load doc content');
  }
}
