import { useEffect, useMemo, useState } from 'react';
import type Fuse from 'fuse.js';
import type { DocSearchItem, FlatDocItem, Language } from '@/types';
import { buildDocSearchIndex, searchDocs } from '@/utils/docSearch';

interface UseDocSearchResult {
  query: string;
  setQuery: (value: string) => void;
  results: DocSearchItem[];
  isIndexing: boolean;
}

export function useDocSearch(language: Language, docs: FlatDocItem[]): UseDocSearchResult {
  const [query, setQuery] = useState('');
  const [index, setIndex] = useState<Fuse<DocSearchItem> | null>(null);
  const [isIndexing, setIsIndexing] = useState(false);

  useEffect(() => {
    let alive = true;

    async function rebuild() {
      setIsIndexing(true);
      try {
        const nextIndex = await buildDocSearchIndex(language, docs);
        if (alive) {
          setIndex(nextIndex);
        }
      } finally {
        if (alive) {
          setIsIndexing(false);
        }
      }
    }

    if (docs.length > 0) {
      void rebuild();
    } else {
      setIndex(null);
      setIsIndexing(false);
    }

    return () => {
      alive = false;
    };
  }, [language, docs]);

  const results = useMemo(() => searchDocs(index, query), [index, query]);

  return {
    query,
    setQuery,
    results,
    isIndexing,
  };
}
