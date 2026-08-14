/**
 * EventTagPage - 活动标签页面
 * 迁移自 legacy/src/app/eventTag/page.jsx
 *
 * 根据URL参数id显示特定活动的相关谱面
 * v5：谱面以主页同款马赛克网格展示（每 7 张一组：前 3 张随机宽度、后 4 张等宽）
 */

import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import useSWR from 'swr';
import { setLanguage } from '@/utils/i18n';
import { useLoc } from '@/hooks';
import { PageLayout, SongMosaicCard, EventBanner, LoadingSpinner } from '@/components';
import { endpoints } from '@/config/api';
import { getEventBySearchKeyword } from '@/utils/eventsData';
import { type Event, type Song } from '@/types';
import { EventCategory } from '@/types/event';

const fetcher = (url: string) =>
  fetch(url, { mode: 'cors', credentials: 'include' }).then((res) => res.json());

// 3 卡行的随机宽度组合（每行和 = 12 列）
const THREE_CARD_ROWS: number[][] = [
  [4, 4, 4],
  [5, 4, 3],
  [6, 3, 3],
  [3, 5, 4],
  [4, 3, 5],
  [3, 6, 3],
  [5, 3, 4],
  [3, 4, 5],
];

/** 按索引确定每张卡的列跨度（确定性伪随机，与主页一致） */
function spanOf(index: number): number {
  const group = Math.floor(index / 7);
  const pos = index % 7;
  if (pos < 3) {
    const combo = THREE_CARD_ROWS[group % THREE_CARD_ROWS.length];
    return combo[pos];
  }
  return 3; // 4 卡行：3/3/3/3 等宽
}

// Tailwind 需要静态类名
const COL_CLASS: Record<number, string> = {
  3: 'col-span-12 md:col-span-3',
  4: 'col-span-12 md:col-span-4',
  5: 'col-span-12 md:col-span-5',
  6: 'col-span-12 md:col-span-6',
};

export default function EventTagPage() {
  const loc = useLoc();
  const [ready, setReady] = useState(false);
  const [searchParams] = useSearchParams();

  // 获取URL中的id参数
  const eventId = searchParams.get('id');

  // 构造搜索关键词，格式为 tag:eventId（这是传给后端API的参数）
  const searchKeyword = eventId ? `tag:${eventId}` : '';

  // 特殊处理：Original 原创曲
  const currentEvent: Event | null = eventId
    ? eventId === 'Original'
      ? {
        id: 'original',
        href: '/eventTag?id=Original',
        src: '/events/original.png',
        alt: 'Original Songs',
        title: loc('OriginalSongs'),
        category: EventCategory.PrivateProject,
        createDate: new Date().toISOString().split('T')[0],
        endDate: '2099-12-31',
        description: loc('OriginalSongsDesc'),
      }
      : getEventBySearchKeyword(eventId)
    : null;

  // 活动相关谱面（与主页 SongList 相同接口）
  const { data: songs, error, isLoading } = useSWR<Song[]>(
    searchKeyword ? endpoints.maichart.listSearch(searchKeyword) : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  useEffect(() => {
    setLanguage(localStorage.getItem('language') || navigator.language).then(() => {
      setReady(true);
    });
  }, []);

  if (!ready) return <div className="flex justify-center items-center h-screen"><LoadingSpinner size="50px" /></div>;

  return (
    <PageLayout className="py-4 sm:py-6 md:py-8 min-h-screen">
      <div className="mx-auto my-0 w-full max-w-(--container-max-width)">
        {/* 活动横幅 */}
        {currentEvent && <EventBanner event={currentEvent} />}

        {/* 活动相关谱面 */}
        {searchKeyword && (
          <div className="mt-4 sm:mt-6 md:mt-8 px-2 sm:px-3 md:px-4">
            <h2 className="m-0 mb-6 font-bold text-ink text-xl sm:text-2xl md:text-3xl text-center">
              {loc('RelatedCharts')}
            </h2>

            {isLoading ? (
              <div className="flex justify-center items-center py-20 w-full">
                <LoadingSpinner size="50px" />
              </div>
            ) : error ? (
              <div className="m-auto w-full text-[50px] text-center">
                {loc('ServerError', '服务器错误')}
              </div>
            ) : !songs || songs.length === 0 ? (
              <div className="m-auto w-full text-[50px] text-center">
                {loc('EmptyData', '暂无数据')}
              </div>
            ) : (
              <div className="gap-x-6 gap-y-12 grid grid-cols-12 w-full">
                {songs.map((song, index) => (
                  <SongMosaicCard
                    key={song.id}
                    song={song}
                    index={index}
                    page={0}
                    className={COL_CLASS[spanOf(index)]}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </PageLayout>
  );
}
