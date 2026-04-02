import { useState } from 'react';
import useSWR from 'swr';
import { PageLayout, LoadingSpinner } from '@/components';
import { endpoints } from '@/config/api';
import { useLoc } from '@/hooks';
import type { Collection } from '@/types';
import CollectionCard from '@/components/CollectionCard';

const fetcher = (url: string) => fetch(url, { mode: 'cors', credentials: 'include' }).then((res) => res.json());

export default function CollectionsHirobaPage() {
  const loc = useLoc();
  const [page, setPage] = useState(() => {
    const stored = localStorage.getItem('lastCollectionPage');
    return parseInt(stored || '0');
  });
  const pageSize = 30;

  const url = `${endpoints.collection.list}?page=${page}&pageSize=${pageSize}`;

  const { data, error, isLoading } = useSWR<Collection[]>(url, fetcher, {
    revalidateOnFocus: false
  });

  const isLastPage = data && data.length < pageSize && data.length > 0;

  return (
    <PageLayout showBackToHome={false}>
      <div className="mx-auto px-4 py-8 w-full max-w-7xl min-h-screen">
        <h1 className="mb-8 font-bold text-white text-3xl text-center">{loc('CollectionsHiroba', '歌单广场')}</h1>

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
              <CollectionCard key={collection.id} collection={collection} />
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
                  localStorage.setItem('lastCollectionPage', newPage.toString());
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
                        localStorage.setItem('lastCollectionPage', newPage.toString());
                      }
                    } else {
                      setPage(0);
                      localStorage.setItem('lastCollectionPage', '0');
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
                  localStorage.setItem('lastCollectionPage', newPage.toString());
                  window.scrollTo(0, 200);
                }}
              >
                →
              </button>
              <button
                className="bg-white/10 px-6 py-2 border border-white/20 rounded-lg text-white cursor-pointer"
                onClick={() => {
                  setPage(0);
                  localStorage.setItem('lastCollectionPage', '0');
                  window.scrollTo(0, 200);
                }}
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
