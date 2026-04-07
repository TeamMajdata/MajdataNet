import { useState } from 'react';
import useSWR from 'swr';
import { PageLayout, LoadingSpinner, CollectionCard, CollectionModal } from '@/components';
import { endpoints } from '@/config/api';
import { useLoc, useUser } from '@/hooks';
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
  const { user, isLoading: userLoading } = useUser();
  const [isManaging, setIsManaging] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [page, setPage] = useState(() => {
    const stored = localStorage.getItem('lastMyCollectionPage');
    return parseInt(stored || '0');
  });
  const pageSize = 30;

  const url = user
    ? endpoints.collection.list(page, pageSize, user.username)
    : null;

  const { data, error, isLoading, mutate } = useSWR<Collection[]>(url, fetcher, {
    revalidateOnFocus: false
  });

  const isLastPage = data && data.length < pageSize && data.length > 0;

  if (userLoading) {
    return <div className="flex justify-center items-center h-screen"><LoadingSpinner size="50px" /></div>;
  }

  if (!user) {
    return (
      <PageLayout title={loc('MyCollections')} showBackToHome={true}>
        <div className="py-16 text-white/70 text-center">
          {loc('PleaseLogin', '请先登录')}
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout title={loc('MyCollections', '我的歌单')} showBackToHome={false}>
      <div className="mx-auto px-4 py-8 w-full max-w-7xl min-h-screen">
        <motion.div
          className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8"
          initial="hidden"
          animate="visible"
          custom={0}
          variants={slideInUp}
        >
          <h1 className="font-bold text-white text-2xl md:text-3xl">{loc('MyCollections', '我的歌单')}</h1>
          <div className="flex items-center gap-3">
            {isManaging && (
              <button
                onClick={() => setIsModalOpen(true)}
                className="px-4 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer border bg-blue-500/80 text-white border-blue-500/80 hover:bg-blue-500"
              >
                + {loc('NewCollection', '新建歌单')}
              </button>
            )}
            <button
              onClick={() => setIsManaging((prev) => !prev)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer border ${
                isManaging
                  ? 'bg-red-500/80 text-white border-red-500/80'
                  : 'bg-white/10 text-white/80 border-white/20 hover:bg-white/15'
              }`}
            >
              {isManaging ? loc('ExitManage', '退出管理') : loc('Manage', '管理模式')}
            </button>
          </div>
        </motion.div>

        {/* Management mode hint bar */}
        {isManaging && (
          <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 px-4 py-2.5 rounded-xl mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-400 shrink-0"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            <span className="text-red-300/80 text-sm">{loc('ManageHint', '管理模式：点击歌单右上角按钮可删除歌单')}</span>
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center items-center py-20 w-full">
            <LoadingSpinner size="50px" />
          </div>
        ) : error ? (
          <div className="m-auto w-full text-[50px] text-white text-center">{loc('ServerError', '服务器错误')}</div>
        ) : !data || data.length === 0 ? (
          <div className="m-auto w-full text-[50px] text-white text-center">{loc('EmptyData', '暂无数据')}</div>
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

        {/* Paginator */}
        {data && data.length > 0 && (
          <div className="flex flex-col items-center gap-6 mx-auto mt-12 px-4 max-w-7xl">
            <div className="flex items-center gap-4 bg-[rgba(20,20,25,0.9)] shadow-[0_8px_32px_rgba(0,0,0,0.3),0_2px_8px_rgba(0,0,0,0.2)] backdrop-blur-xl p-6 border border-white/10 rounded-xl">
              <button
                className={`px-6 py-3 bg-blue-500/80 border-none rounded-lg text-white font-medium cursor-pointer min-w-20 ${page - 1 < 0 ? 'bg-gray-500/50 cursor-not-allowed opacity-60' : ''}`}
                disabled={page - 1 < 0}
                onClick={() => {
                  const newPage = page - 1;
                  setPage(newPage);
                  localStorage.setItem('lastMyCollectionPage', newPage.toString());
                  window.scrollTo(0, 200);
                }}
              >
                ←
              </button>

              <div className="flex items-center gap-2">
                <span className="text-[#ccc] text-sm">{loc('PageOf', '第')}</span>
                <input
                  type="number"
                  value={page}
                  className="bg-black/70 focus:shadow-[0_0_8px_rgba(59,130,246,0.3)] p-2 border border-white/20 focus:border-blue-500 rounded-md focus:outline-none w-15 font-medium text-white text-center"
                  onChange={(event) => {
                    if (event.target.value !== '') {
                      const newPage = parseInt(event.target.value);
                      if (newPage >= 0) {
                        setPage(newPage);
                        localStorage.setItem('lastMyCollectionPage', newPage.toString());
                      }
                    } else {
                      setPage(0);
                      localStorage.setItem('lastMyCollectionPage', '0');
                    }
                  }}
                  min="0"
                  step="1"
                />
                <span className="text-[#ccc] text-sm">{loc('Page', '页')}</span>
              </div>

              <button
                className={`px-6 py-3 bg-blue-500/80 border-none rounded-lg text-white font-medium cursor-pointer min-w-20 ${isLastPage ? 'bg-gray-500/50 cursor-not-allowed opacity-60' : ''}`}
                disabled={isLastPage}
                onClick={() => {
                  const newPage = page + 1;
                  setPage(newPage);
                  localStorage.setItem('lastMyCollectionPage', newPage.toString());
                  window.scrollTo(0, 200);
                }}
              >
                →
              </button>
              <button
                className="bg-white/10 px-6 py-2 border border-white/20 rounded-lg text-white cursor-pointer"
                onClick={() => {
                  setPage(0);
                  localStorage.setItem('lastMyCollectionPage', '0');
                  window.scrollTo(0, 200);
                }}
              >
                {loc('FrontPage', '首页')}
              </button>
            </div>
          </div>
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
