import { useTranslation } from 'react-i18next';
import SectionLoading from '@/components/ui/SectionLoading';
import { useState } from 'react';
import useSWR from 'swr';
import { motion, AnimatePresence } from 'framer-motion';
import { PageLayout, CollectionCard, Tooltip } from '@/components';
import { LuInfo, LuSearch, LuX } from 'react-icons/lu';
import Pager from '@/components/ui/Pager';
import { endpoints } from '@/config/api';
import { useDebouncedCallback } from 'use-debounce';
import type { Collection } from '@/types';

const fetcher = (url: string) => fetch(url, { mode: 'cors', credentials: 'include' }).then((res) => res.json());

const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.04, duration: 0.3, ease: 'easeOut' as const },
  }),
};

export default function CollectionsHirobaPage() {
  const { t } = useTranslation();
  const [keyword, setKeyword] = useState('');
  const [currentValue, setCurrentValue] = useState('');
  const [page, setPage] = useState(() => {
    const stored = localStorage.getItem('lastCollectionPage');
    return parseInt(stored || '0');
  });
  const isSearching = keyword !== currentValue;
  const pageSize = 30;

  const debounced = useDebouncedCallback(
    (value: string) => {
      setKeyword(value);
      setPage(0);
      localStorage.setItem('lastCollectionPage', '0');
    },
    500
  );

  const url = endpoints.collection.list(page, pageSize, '', keyword);

  const { data, error, isLoading } = useSWR<Collection[]>(url, fetcher, {
    revalidateOnFocus: false,
  });

  const isLastPage = !!data && data.length < pageSize;
  const hasData = !!data && data.length > 0;
  const shouldShowPaginator = !isLoading && !isSearching && !error && (hasData || page > 0);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCurrentValue(e.target.value);
    debounced(e.target.value);
  };

  const handleClearSearch = () => {
    setCurrentValue('');
    debounced('');
  };

  const goToPage = (newPage: number) => {
    if (newPage < 0) return;
    setPage(newPage);
    localStorage.setItem('lastCollectionPage', newPage.toString());
    window.scrollTo({ top: 200, behavior: 'smooth' });
  };

  return (
    <PageLayout>
      <div className="mx-auto py-5 sm:py-8 w-full max-w-320 min-w-0">
        {/* Header：标题居左，搜索框在同一行右侧（移动端换行） */}
        <header className="flex sm:flex-row flex-col justify-between sm:items-center gap-4 mb-5 sm:mb-6">
          <h1 className="m-0 font-semibold text-white! text-2xl! sm:text-3xl! text-left! tracking-tight">
            {t("collection/hiroba/HirobaPage.CollectionsHiroba")}
          </h1>
          <div className="relative flex items-center w-full sm:max-w-sm">
            <LuSearch aria-hidden="true" className="left-3.5 absolute w-4 h-4 text-white/40 pointer-events-none" />
            <input
              type="text"
              className="bg-white/[0.04] focus:bg-white/[0.06] pr-17 pl-10 border border-white/10 focus:border-blue-400/60 rounded-xl outline-none focus:ring-2 focus:ring-blue-400/20 w-full h-11 text-white placeholder:text-white/40 text-sm transition-colors"
              placeholder={t("collection/hiroba/HirobaPage.SearchCollectionsPlaceholder")}
              value={currentValue}
              onChange={handleInputChange}
              aria-label={t("collection/hiroba/HirobaPage.SearchCollectionsPlaceholder")}
            />

            {/* Clear button */}
            <AnimatePresence>
              {currentValue && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.15 }}
                  className="top-1/2 right-9 z-10 absolute flex justify-center items-center hover:bg-white/10 border-none rounded-md w-7 h-7 text-white/50 hover:text-white transition-colors -translate-y-1/2 cursor-pointer"
                  onClick={handleClearSearch}
                  aria-label={t("collection/hiroba/HirobaPage.ClearSearch")}
                >
                  <LuX aria-hidden="true" className="w-3.5 h-3.5" />
                </motion.button>
              )}
            </AnimatePresence>

            {/* Help tooltip */}
            <Tooltip content={t("collection/hiroba/HirobaPage.SearchCollectionHint")} side="top">
              <span
                className="top-1/2 right-2 z-10 absolute flex justify-center items-center hover:bg-white/10 rounded-md w-7 h-7 text-white/40 hover:text-white transition-colors -translate-y-1/2 cursor-help"
                role="img"
                aria-label={t("collection/hiroba/HirobaPage.SearchCollectionHint")}
              >
                <LuInfo aria-hidden="true" className="w-3.5 h-3.5" />
              </span>
            </Tooltip>
          </div>
        </header>

        {/* Content */}
        <AnimatePresence mode="wait">
          {isLoading || isSearching ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex justify-center items-center py-20 w-full"
            >
              <SectionLoading />
            </motion.div>
          ) : error ? (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex flex-col justify-center items-center gap-4 py-20"
            >
              <svg className="w-12 h-12 text-red-400/60" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="m15 9-6 6" /><path d="m9 9 6 6" />
              </svg>
              <p className="m-0 text-white/50 text-base">{t("collection/hiroba/HirobaPage.ServerError")}</p>
            </motion.div>
          ) : !data || data.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex flex-col justify-center items-center gap-4 py-20"
            >
              <svg className="w-12 h-12 text-white/20" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="9" y1="15" x2="15" y2="15" />
              </svg>
              <p className="m-0 text-white/40 text-base">
                {keyword ? t("collection/hiroba/HirobaPage.NoSearchResults") : t("collection/hiroba/HirobaPage.EmptyData")}
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="grid"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="gap-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
            >
              {data.map((collection, i) => (
                <motion.div
                  key={collection.id}
                  custom={i}
                  variants={cardVariants}
                  initial="hidden"
                  animate="visible"
                >
                  <CollectionCard collection={collection} />
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Paginator */}
        {shouldShowPaginator && (
          <div className="flex justify-center mt-8 sm:mt-10">
            <Pager page={page} hasNext={!isLastPage} onPageChange={goToPage} />
          </div>
        )}
      </div>
    </PageLayout>
  );
}
