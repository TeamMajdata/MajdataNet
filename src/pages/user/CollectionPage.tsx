import { useState } from 'react';
import useSWR from 'swr';
import { PageLayout, LoadingSpinner, CollectionCard, CollectionModal } from '@/components';
import { endpoints } from '@/config/api';
import { useLoc, useUserContext, useFavorites } from '@/hooks';
import { motion, type Variants } from 'framer-motion';
import type { Collection } from '@/types';

const fetcher = (url: string) => fetch(url, { mode: 'cors', credentials: 'include' }).then((res) => res.json());

const slideInUp: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: (delay: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: [0.4, 0, 0.2, 1] as const,
      delay,
    },
  }),
};

export default function UserCollectionPage() {
  const loc = useLoc();
  const { user } = useUserContext();
  const [activeTab, setActiveTab] = useState<'mine' | 'favorites'>('mine');
  const [isManaging, setIsManaging] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [page, setPage] = useState(() => {
    const stored = localStorage.getItem('lastMyCollectionPage');
    return parseInt(stored || '0');
  });
  const [favPage, setFavPage] = useState(0);
  const pageSize = 30;

  const url = user
    ? endpoints.collection.list(page, pageSize, user.username)
    : null;

  const { data, error, isLoading, mutate } = useSWR<Collection[]>(url, fetcher, {
    revalidateOnFocus: false
  });

  const { favorites, isLoadingFavorites: favLoading } = useFavorites();
  const isLastPage = Boolean(data && data.length < pageSize && data.length > 0);
  const isFavLastPage = Boolean(favorites && favorites.length < pageSize && favorites.length > 0);

  if (!user) return null;

  const tabItems = [
    { key: 'favorites' as const, label: loc('MyFavCollections', '订阅的歌单') },
    { key: 'mine' as const, label: loc('MyCollections', '我的歌单') },
  ];

  return (
    <PageLayout>
      <div className="px-4 py-8 w-full min-h-screen">
        <motion.div
          className="flex sm:flex-row flex-col justify-between items-start sm:items-center gap-4 mb-8"
          initial="hidden"
          animate="visible"
          custom={0}
          variants={slideInUp}
        >
          <h1 className="font-bold text-ink text-2xl md:text-3xl">
            {activeTab === 'mine' ? loc('MyCollections', '我的歌单') : loc('MyFavCollections', '订阅的歌单')}
          </h1>
          <div className="flex items-center gap-3">
            {isManaging && (
              <button
                onClick={() => setIsModalOpen(true)}
                className="bg-primary hover:bg-primary-hover px-4 py-2 border border-primary rounded-md font-medium text-white text-sm transition-all cursor-pointer"
              >
                + {loc('NewCollection', '新建歌单')}
              </button>
            )}
            {activeTab === 'mine' && (
              <button
                onClick={() => setIsManaging((prev) => !prev)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all cursor-pointer border ${isManaging
                  ? 'bg-danger text-white border-danger'
                  : 'bg-surface text-ink-2 border-line hover:text-primary hover:border-primary/40'
                  }`}
              >
                {isManaging ? loc('ExitManage', '退出管理') : loc('Manage', '管理模式')}
              </button>
            )}
          </div>
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-1 bg-surface-2 mb-6 p-1 border border-line rounded-lg">
          {tabItems.map((tab) => (
            <button
              key={tab.key}
              onClick={() => {
                setActiveTab(tab.key);
                setIsManaging(false);
              }}
              className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all cursor-pointer border-none ${activeTab === tab.key
                ? 'bg-surface text-ink shadow-card'
                : 'bg-transparent text-ink-3 hover:text-ink hover:bg-surface'
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Management mode hint bar */}
        {activeTab === 'mine' && isManaging && (
          <div className="flex items-center gap-2 bg-danger/10 mb-6 px-4 py-2.5 border border-danger/30 rounded-lg">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-danger shrink-0"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
            <span className="text-danger text-sm">{loc('ManageHint', '管理模式：点击歌单右上角按钮可删除歌单')}</span>
          </div>
        )}

        {activeTab === 'mine' ? (
          <>
            {isLoading ? (
              <div className="flex justify-center items-center py-20 w-full">
                <LoadingSpinner size="50px" />
              </div>
            ) : error ? (
              <div className="m-auto w-full text-[50px] text-ink-3 text-center">{loc('ServerError', '服务器错误')}</div>
            ) : !data || data.length === 0 ? (
              <div className="m-auto w-full text-[50px] text-ink-3 text-center">{loc('EmptyData', '暂无数据')}</div>
            ) : (
              <div className="gap-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                {data.map((collection) => (
                  <CollectionCard
                    key={collection.id}
                    collection={collection}
                    isManaging={isManaging}
                    onDelete={() => mutate()}
                  />
                ))}
              </div>
            )}

            {/* Paginator - My Collections */}
            {data && data.length > 0 && (
              <Paginator
                page={page}
                setPage={setPage}
                storageKey="lastMyCollectionPage"
                isLastPage={isLastPage}
                loc={loc}
              />
            )}
          </>
        ) : (
          <>
            {favLoading ? (
              <div className="flex justify-center items-center py-20 w-full">
                <LoadingSpinner size="50px" />
              </div>
            ) : !favorites || favorites.length === 0 ? (
              <div className="m-auto w-full text-[50px] text-ink-3 text-center">{loc('EmptyFavorites', '暂无收藏')}</div>
            ) : (
              <div className="gap-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                {favorites.map((collection) => (
                  <CollectionCard
                    key={collection.id}
                    collection={collection}
                  />
                ))}
              </div>
            )}

            {/* Paginator - Favorites */}
            {favorites && favorites.length > 0 && (
              <Paginator
                page={favPage}
                setPage={setFavPage}
                storageKey="lastMyFavoritePage"
                isLastPage={isFavLastPage}
                loc={loc}
              />
            )}
          </>
        )}

        {/* Create Collection Modal */}
        <CollectionModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onCreate={() => mutate()}
        />
      </div>
    </PageLayout>
  );
}

function Paginator({ page, setPage, storageKey, isLastPage, loc }: {
  page: number;
  setPage: (p: number) => void;
  storageKey: string;
  isLastPage: boolean;
  loc: (key: string, fallback?: string) => string;
}) {
  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    localStorage.setItem(storageKey, newPage.toString());
    window.scrollTo(0, 200);
  };

  return (
    <div className="flex flex-col items-center gap-6 mt-12 px-4">
      <div className="flex items-center gap-4 p-5 rounded-xl">
        <button
          className={`px-6 py-3 border-none rounded-md font-medium cursor-pointer min-w-20 ${page - 1 < 0
            ? 'bg-surface-2 text-ink-3 cursor-not-allowed opacity-60'
            : 'bg-primary hover:bg-primary-hover text-white'
            }`}
          disabled={page - 1 < 0}
          onClick={() => handlePageChange(page - 1)}
        >
          &larr;
        </button>

        <div className="flex items-center gap-2">
          <span className="text-ink-2 text-sm">{loc('PageOf', '第')}</span>
          <input
            type="number"
            value={page}
            className="bg-surface border border-line focus:border-primary p-2 rounded-md focus:outline-none w-15 font-medium text-ink text-center"
            onChange={(event) => {
              if (event.target.value !== '') {
                const newPage = parseInt(event.target.value);
                if (newPage >= 0) handlePageChange(newPage);
              } else {
                handlePageChange(0);
              }
            }}
            min="0"
            step="1"
          />
          <span className="text-ink-2 text-sm">{loc('Page', '页')}</span>
        </div>

        <button
          className={`px-6 py-3 border-none rounded-md font-medium cursor-pointer min-w-20 ${isLastPage
            ? 'bg-surface-2 text-ink-3 cursor-not-allowed opacity-60'
            : 'bg-primary hover:bg-primary-hover text-white'
            }`}
          disabled={isLastPage}
          onClick={() => handlePageChange(page + 1)}
        >
          &rarr;
        </button>
        <button
          className="bg-surface px-6 py-2 border border-line hover:border-primary/40 rounded-md text-ink-2 hover:text-primary cursor-pointer"
          onClick={() => handlePageChange(0)}
        >
          {loc('FrontPage', '首页')}
        </button>
      </div>
    </div>
  );
}
