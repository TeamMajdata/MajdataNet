import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { LoadingSpinner, PageLayout } from '@/components';
import { useLoc, useI18nContext } from '@/hooks';
import { flattenDocNodes, getDocPagination, normalizeDocSlug } from '@/config/docRoutes';
import { loadDocContent, loadDocStructure } from '@/utils/documentLoader';
import { useDocSearch } from '@/hooks/useDocSearch';
import {
  DocLayout,
  DocPagination,
  DocRenderer,
  DocSearchBar,
  DocSidebar,
  DocTableOfContents,
} from '@/components/Docs';
import type { DocStructure, TocHeading } from '@/types';

function toDocPath(slug: string): string {
  return slug === 'index' ? '/docs' : `/docs/${slug}`;
}

export default function DocsPage() {
  const loc = useLoc();
  const location = useLocation();
  const navigate = useNavigate();
  const { language } = useI18nContext();

  const [structure, setStructure] = useState<DocStructure | null>(null);
  const [content, setContent] = useState('');
  const [headings, setHeadings] = useState<TocHeading[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const currentSlug = useMemo(() => {
    const pathname = location.pathname.replace(/^\/docs\/?/, '');
    return normalizeDocSlug(pathname);
  }, [location.pathname]);

  useEffect(() => {
    let alive = true;

    async function loadStructure() {
      try {
        const data = await loadDocStructure(language);
        if (alive) {
          setStructure(data);
        }
      } catch {
        if (alive) {
          setStructure({ title: 'Docs', items: [] });
        }
      }
    }

    void loadStructure();

    return () => {
      alive = false;
    };
  }, [language]);

  useEffect(() => {
    let alive = true;

    async function loadContent() {
      setIsLoading(true);
      setNotFound(false);

      try {
        const markdown = await loadDocContent(language, currentSlug);
        if (alive) {
          setContent(markdown);
        }
      } catch {
        if (alive) {
          setNotFound(true);
          setContent('');
        }
      } finally {
        if (alive) {
          setIsLoading(false);
        }
      }
    }

    void loadContent();

    return () => {
      alive = false;
    };
  }, [language, currentSlug]);

  const flatDocs = useMemo(
    () => flattenDocNodes(structure?.items ?? []),
    [structure]
  );

  const pagination = useMemo(
    () => getDocPagination(flatDocs, currentSlug),
    [flatDocs, currentSlug]
  );

  const { query, setQuery, results, isIndexing } = useDocSearch(language, flatDocs);

  const handleNavigate = useCallback(
    (slug: string) => {
      navigate(toDocPath(slug));
    },
    [navigate]
  );

  const handleSearchSelect = useCallback(
    (item: { slug: string }) => {
      setQuery('');
      navigate(toDocPath(item.slug));
    },
    [navigate, setQuery]
  );

  return (
    <PageLayout title={loc('DocsTitle', '文档')} className="pb-8">
      <DocLayout
        topbar={
          <DocSearchBar
            query={query}
            onQueryChange={setQuery}
            results={results}
            isIndexing={isIndexing}
            onSelect={handleSearchSelect}
          />
        }
        sidebar={
          <DocSidebar
            items={structure?.items ?? []}
            currentSlug={currentSlug}
            onNavigate={handleNavigate}
          />
        }
        toc={<DocTableOfContents headings={headings} />}
        content={
          isLoading ? (
            <div className="flex justify-center items-center py-24">
              <LoadingSpinner size="50px" />
            </div>
          ) : notFound ? (
            <div className="bg-red-500/10 p-8 border border-red-400/30 rounded-2xl text-center">
              <h3 className="font-semibold text-red-200 text-xl">{loc('DocsNotFound', 'Document not found')}</h3>
              <p className="mt-2 text-red-100/80 text-sm">{loc('DocsNotFoundDesc', 'The requested document does not exist.')}</p>
            </div>
          ) : (
            <>
              <DocRenderer content={content} onHeadingsChange={setHeadings} />
              <DocPagination prev={pagination.prev} next={pagination.next} />
            </>
          )
        }
      />
    </PageLayout>
  );
}
