import type { DocSearchItem } from '@/types';
import { useLoc } from '@/hooks';

interface DocSearchBarProps {
  query: string;
  onQueryChange: (value: string) => void;
  results: DocSearchItem[];
  isIndexing: boolean;
  onSelect: (item: DocSearchItem) => void;
}

export default function DocSearchBar({ query, onQueryChange, results, isIndexing, onSelect }: DocSearchBarProps) {
  const loc = useLoc();
  const showResults = query.trim().length > 0;

  return (
    <div className="relative">
      <input
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        placeholder={loc('DocsSearchPlaceholder', 'Search docs...')}
        className="bg-black/35 px-4 py-2.5 border border-white/14 focus:border-blue-400/60 rounded-xl outline-none w-full text-white placeholder:text-white/45 text-sm transition-colors"
      />

      {showResults && (
        <div className="z-20 absolute bg-[rgb(18_18_24/98%)] shadow-2xl mt-2 p-2 border border-white/12 rounded-xl w-full max-h-80 overflow-y-auto">
          {isIndexing && <div className="px-2 py-2 text-white/60 text-xs">{loc('DocsLoading', 'Loading...')}</div>}

          {!isIndexing && results.length === 0 && (
            <div className="px-2 py-2 text-white/60 text-xs">{loc('DocsNoResults', 'No matching documents')}</div>
          )}

          {!isIndexing && results.map((item) => (
            <button
              key={item.slug}
              onClick={() => onSelect(item)}
              className="block hover:bg-white/10 px-2 py-2 rounded-lg w-full text-left transition-colors"
            >
              <div className="font-medium text-white text-sm">{item.title}</div>
              <div className="mt-1 text-white/60 text-xs line-clamp-2">{item.excerpt}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
