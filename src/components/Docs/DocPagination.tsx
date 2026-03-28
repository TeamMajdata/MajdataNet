import { Link } from 'react-router-dom';
import { useLoc } from '@/hooks';
import type { FlatDocItem } from '@/types';

interface DocPaginationProps {
  prev: FlatDocItem | null;
  next: FlatDocItem | null;
}

function toDocPath(slug: string): string {
  return slug === 'index' ? '/docs' : `/docs/${slug}`;
}

export default function DocPagination({ prev, next }: DocPaginationProps) {
  const loc = useLoc();

  if (!prev && !next) {
    return null;
  }

  return (
    <nav className="gap-3 grid md:grid-cols-2 mt-8">
      {prev ? (
        <Link
          to={toDocPath(prev.slug)}
          className="bg-black/30 hover:bg-black/45 p-4 border border-white/12 hover:border-white/25 rounded-xl transition-colors"
        >
          <div className="text-white/60 text-xs">{loc('DocsPrev', 'Previous')}</div>
          <div className="mt-1 font-medium text-white text-sm">{prev.title}</div>
        </Link>
      ) : (
        <div />
      )}

      {next ? (
        <Link
          to={toDocPath(next.slug)}
          className="bg-black/30 hover:bg-black/45 p-4 border border-white/12 hover:border-white/25 rounded-xl text-right transition-colors"
        >
          <div className="text-white/60 text-xs">{loc('DocsNext', 'Next')}</div>
          <div className="mt-1 font-medium text-white text-sm">{next.title}</div>
        </Link>
      ) : (
        <div />
      )}
    </nav>
  );
}
