import { useState } from 'react';
import useSWR from 'swr';
import { PageLayout, LoadingSpinner, CollectionCard, CollectionModal } from '@/components';
import { endpoints } from '@/config/api';
import { useI18n, useUserContext, useFavorites } from '@/hooks';
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
  const { i18n } = useI18n();
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
    { key: 'favorites' as const, label: i18n("user/collections/CollectionPage.MyFavCollections", '订阅的歌单') },
    { key: 'mine' as const, label: i18n("user/collections/CollectionPage.MyCollections", '我的歌单') },
  ];

  return (
    <PageLayout>
      <div className="mx-auto px-4 py-8 w-full max-w-7xl min-h-screen">
        <motion.div
          className="flex sm:flex-row flex-col justify-between items-start sm:items-center gap-4 mb-8"
          initial="hidden"
          animate="visible"
          custom={0}
          variants={slideInUp}
        >
          <h1 className="font-bold text-white text-2xl md:text-3xl">
            {activeTab === 'mine' ? i18n("user/collections/CollectionPage.MyCollections", '我的歌单') : i18n("user/collections/CollectionPage.MyFavCollections", '订阅的歌单')}
          </h1>
          <div className="flex items-center gap-3">
            {isManaging && (
              <button
                onClick={() => setIsModalOpen(true)}
                className="bg-blue-500/80 hover:bg-blue-500 px-4 py-2 border border-blue-500/80 rounded-xl font-medium text-white text-sm transition-all cursor-pointer"
              >
                + {i18n("user/collections/CollectionPage.NewCollection", '新建歌单')}
              </button>
            )}
            {activeTab === 'mine' && (
              <button
                onClick={() => setIsManaging((prev) => !prev)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer border ${isManaging
                  ? 'bg-red-500/80 text-white border-red-500/80'
                  : 'bg-white/10 text-white/80 border-white/20 hover:bg-white/15'
                  }`}
              >
                {isManaging ? i18n("user/collections/CollectionPage.ExitManage", '退出管理') : i18n("user/collections/CollectionPage.Manage", '管理模式')}
              </button>
            )}
          </div>
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white/5 mb-6 p-1 border border-white/10 rounded-xl">
          {tabItems.map((tab) => (
            <button
              key={tab.key}
              onClick={() => {
                setActiveTab(tab.key);
                setIsManaging(false);
              }}
              className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer border-none ${activeTab === tab.key
                ? 'bg-white/15 text-white shadow-sm'
                : 'bg-transparent text-white/60 hover:text-white/80 hover:bg-white/5'
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Management mode hint bar */}
        {activeTab === 'mine' && isManaging && (
          <div className="flex items-center gap-2 bg-red-500/10 mb-6 px-4 py-2.5 border border-red-500/20 rounded-xl">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-400 shrink-0"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
            <span className="text-red-300/80 text-sm">{i18n("user/collections/CollectionPage.ManageHint", '管理模式：点击歌单右上角按钮可删除歌单')}</span>
          </div>
        )}

        {activeTab === 'mine' ? (
          <>
            {isLoading ? (
              <div className="flex justify-center items-center py-20 w-full">
                <LoadingSpinner size="50px" />
              </div>
            ) : error ? (
    <div className="m-auto w-full text-2xl sm:text-[50px] text-white text-center">{i18n("user/collections/CollectionPage.ServerError", '服务器错误')}</div>
            ) : !data || data.length === 0 ? (
    <div className="m-auto w-full text-2xl sm:text-[50px] text-white text-center">{i18n("user/collections/CollectionPage.EmptyData", '暂无数据')}</div>
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
                i18n={i18n}
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
    <div className="m-auto w-full text-2xl sm:text-[50px] text-white text-center">{i18n("user/collections/CollectionPage.EmptyFavorites", '暂无收藏')}</div>
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
                i18n={i18n}
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

function Paginator({ page, setPage, storageKey, isLastPage, i18n }: {
  page: number;
  setPage: (p: number) => void;
  storageKey: string;
  isLastPage: boolean;
  i18n: (key: string, fallback?: string) => string;
}) {
  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    localStorage.setItem(storageKey, newPage.toString());
    window.scrollTo(0, 200);
  };

  return (
      <div className="flex flex-col items-center gap-5 sm:gap-6 mx-auto mt-8 sm:mt-12 px-0 sm:px-4 max-w-7xl">
        <div className="gap-2 sm:gap-4 grid grid-cols-[2.75rem_minmax(0,1fr)_2.75rem] sm:flex items-center bg-[rgba(20,20,25,0.9)] shadow-[0_8px_32px_rgba(0,0,0,0.3),0_2px_8px_rgba(0,0,0,0.2)] backdrop-blur-xl p-2.5 sm:p-6 border border-white/10 rounded-xl w-full sm:w-auto max-w-md">
        <button
          className={`flex justify-center items-center bg-blue-500/80 px-0 sm:px-6 py-3 border-none rounded-lg min-w-11 sm:min-w-20 min-h-11 font-medium text-white cursor-pointer ${page - 1 < 0 ? 'bg-gray-500/50 cursor-not-allowed opacity-60' : ''}`}
          disabled={page - 1 < 0}
          onClick={() => handlePageChange(page - 1)}
        >
          &larr;
        </button>

        <div className="flex justify-center items-center gap-1.5 sm:gap-2 min-w-0">
          <span className="text-[#ccc] text-sm">{i18n("user/collections/CollectionPage.PageOf", '第')}</span>
          <input
            type="number"
            value={page}
            className="bg-black/70 focus:shadow-[0_0_8px_rgba(59,130,246,0.3)] p-2 border border-white/20 focus:border-blue-500 rounded-md focus:outline-none w-15 font-medium text-white text-center"
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
          <span className="text-[#ccc] text-sm">{i18n("user/collections/CollectionPage.Page", '页')}</span>
        </div>

        <button
          className={`flex justify-center items-center bg-blue-500/80 px-0 sm:px-6 py-3 border-none rounded-lg min-w-11 sm:min-w-20 min-h-11 font-medium text-white cursor-pointer ${isLastPage ? 'bg-gray-500/50 cursor-not-allowed opacity-60' : ''}`}
          disabled={isLastPage}
          onClick={() => handlePageChange(page + 1)}
        >
          &rarr;
        </button>
        <button
          className="bg-white/10 px-6 py-2 border border-white/20 rounded-lg text-white cursor-pointer"
          onClick={() => handlePageChange(0)}
        >
          {i18n("user/collections/CollectionPage.FrontPage", '首页')}
        </button>
      </div>
    </div>
  );
}
