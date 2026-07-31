import { useState, useRef } from 'react';
import useSWR from 'swr';
import { motion, AnimatePresence } from 'framer-motion';
import { PageLayout, LoadingSpinner, CollectionCard, Tooltip } from '@/components';
import { endpoints } from '@/config/api';
import { useLoc } from '@/hooks';
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
  const loc = useLoc();
  const [keyword, setKeyword] = useState('');
  const [currentValue, setCurrentValue] = useState('');
  const [page, setPage] = useState(() => {
    const stored = localStorage.getItem('lastCollectionPage');
    return parseInt(stored || '0');
  });
  const isSearching = keyword !== currentValue;
  const pageSize = 30;
  const pageInputRef = useRef<HTMLInputElement>(null);

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
    <PageLayout showBackToHome={false}>
      <div className="mx-auto px-0 sm:px-4 py-5 sm:py-8 w-full max-w-7xl min-h-screen min-w-0">
        {/* Header */}
        <div className="flex flex-col gap-2 mb-8">
          <h1 className="text-left">{loc('CollectionsHiroba', '歌单广场')}</h1>
        </div>

        {/* Search Bar */}
        <div className="mb-8 w-full">
          <div className="relative flex items-center mx-auto w-full max-w-lg">
            <input
              type="text"
              className="bg-[rgba(20,20,25,0.8)] backdrop-blur-[15px] backdrop-saturate-150 py-3 pr-10 pl-11 border-2 border-white/15 focus:border-blue-500/50 rounded-[30px] outline-none w-full h-11 text-white placeholder:text-white/40 text-sm transition-colors"
              placeholder={loc('SearchCollectionsPlaceholder', '搜索歌单...')}
              value={currentValue}
              onChange={handleInputChange}
              aria-label={loc('SearchCollectionsPlaceholder', '搜索歌单...')}
            />

            {/* Clear button */}
            <AnimatePresence>
              {currentValue && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.15 }}
                  className="top-1/2 right-10 z-10 absolute flex justify-center items-center bg-white/10 hover:bg-white/20 border-none rounded-full w-5 h-5 text-white/60 hover:text-white text-xs leading-none transition-colors -translate-y-1/2 cursor-pointer"
                  onClick={handleClearSearch}
                  aria-label={loc('ClearSearch', '清空搜索')}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 6 6 18" /><path d="m6 6 12 12" />
                  </svg>
                </motion.button>
              )}
            </AnimatePresence>

            {/* Help tooltip */}
            <Tooltip
              content={
                <div className="bg-linear-to-br from-[rgba(30,30,40,0.98)] to-[rgba(20,20,30,0.98)] shadow-[0_12px_40px_rgba(0,0,0,0.5),0_4px_12px_rgba(0,0,0,0.3)] backdrop-blur-[20px] backdrop-saturate-150 px-5 py-4 border border-white/20 rounded-2xl w-70 md:w-[320px]">
                  <p className="m-0 text-[0.85rem] text-white/90 md:text-[0.9rem] leading-normal">
                    {loc('SearchCollectionHint', '按歌单名称或描述搜索')}
                  </p>
                </div>
              }
              side="top"
              sideOffset={20}
              plain={true}
            >
              <div
                className="top-1/2 right-3 z-10 absolute flex justify-center items-center bg-white/5 hover:bg-white/15 active:bg-white/20 shadow-[0_2px_8px_rgba(0,0,0,0.2)] border border-white/25 hover:border-white/40 rounded-full w-5 h-5 font-bold text-[10px] text-white/60 hover:text-white leading-none transition-all -translate-y-1/2 duration-200 cursor-pointer"
                role="button"
                aria-label={loc('SearchCollectionHint', '按歌单名称或描述搜索')}
              >
                ?
              </div>
            </Tooltip>
          </div>
        </div>

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
              <LoadingSpinner size="50px" />
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
              <p className="m-0 text-white/50 text-base">{loc('ServerError', '服务器错误')}</p>
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
                {keyword ? loc('NoSearchResults', '未找到相关歌单') : loc('EmptyData', '暂无数据')}
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="grid"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="gap-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
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
          <div className="flex flex-col items-center gap-4 mx-auto mt-8 sm:mt-12 px-0 sm:px-4 max-w-7xl">
            <div className="flex flex-wrap justify-center items-center gap-2 sm:gap-3 bg-[rgba(20,20,25,0.9)] shadow-[0_8px_32px_rgba(0,0,0,0.3),0_2px_8px_rgba(0,0,0,0.2)] backdrop-blur-xl p-3 sm:p-4 border border-white/10 rounded-xl w-full sm:w-auto">
              {/* Prev */}
              <button
                className={`flex justify-center items-center px-4 py-2.5 bg-blue-500/80 border-none rounded-lg text-white cursor-pointer min-w-10 h-9 transition-colors ${page <= 0 ? 'bg-gray-500/50 cursor-not-allowed opacity-50' : 'hover:bg-blue-500'}`}
                disabled={page <= 0}
                onClick={() => goToPage(page - 1)}
                aria-label={loc('PreviousPage', '上一页')}
              >
                <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m15 18-6-6 6-6" />
                </svg>
              </button>

              {/* Page input */}
              <div className="flex items-center gap-2">
                <span className="text-white/60 text-sm">{loc('PageOf', '第')}</span>
                <input
                  ref={pageInputRef}
                  type="number"
                  value={page}
                  className="bg-black/70 focus:shadow-[0_0_8px_rgba(59,130,246,0.3)] p-1.5 border border-white/20 focus:border-blue-500 rounded-md focus:outline-none w-14 h-9 font-medium text-white text-sm text-center"
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val !== '') {
                      const num = parseInt(val);
                      if (!isNaN(num) && num >= 0) {
                        setPage(num);
                        localStorage.setItem('lastCollectionPage', num.toString());
                      }
                    } else {
                      setPage(0);
                      localStorage.setItem('lastCollectionPage', '0');
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      pageInputRef.current?.blur();
                      goToPage(page);
                    }
                  }}
                  min="0"
                  step="1"
                  aria-label={loc('Page', '页码')}
                />
                <span className="text-white/60 text-sm">{loc('Page', '页')}</span>
              </div>

              {/* Next */}
              <button
                className={`flex justify-center items-center px-4 py-2.5 bg-blue-500/80 border-none rounded-lg text-white cursor-pointer min-w-10 h-9 transition-colors ${isLastPage ? 'bg-gray-500/50 cursor-not-allowed opacity-50' : 'hover:bg-blue-500'}`}
                disabled={!!isLastPage}
                onClick={() => goToPage(page + 1)}
                aria-label={loc('NextPage', '下一页')}
              >
                <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m9 18 6-6-6-6" />
                </svg>
              </button>

              {/* Divider */}
              <div className="hidden sm:block bg-white/10 mx-1 w-px h-6" />

              {/* Front page */}
              <button
                className="bg-white/10 hover:bg-white/20 px-4 py-2 border border-white/20 rounded-lg w-full sm:w-auto h-10 sm:h-9 text-white text-sm transition-colors cursor-pointer"
                onClick={() => goToPage(0)}
              >
                {loc('FrontPage', '首页')}
              </button>
            </div>
          </div>
        )}
      </div>
    </PageLayout>
  );
}
