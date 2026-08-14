/**
 * EventTagPage - 活动标签页面
 * 迁移自 legacy/src/app/eventTag/page.jsx
 * 
 * 根据URL参数id显示特定活动的相关谱面
 */

import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { setLanguage } from '@/utils/i18n';
import { useLoc } from '@/hooks';
import { PageLayout, SongList, EventBanner, LoadingSpinner } from '@/components';
import { endpoints } from '@/config/api';
import { getEventBySearchKeyword } from '@/utils/eventsData';
import { type Event } from '@/types';
import { EventCategory } from '@/types/event';

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

  useEffect(() => {
    setLanguage(localStorage.getItem('language') || navigator.language).then(() => {
      setReady(true);
    });
  }, []);

  if (!ready) return <div className="flex justify-center items-center h-screen"><LoadingSpinner size="50px" /></div>;

  return (
    <PageLayout className="py-4 sm:py-6 md:py-8 min-h-screen">
      {/* 活动横幅 */}
      {currentEvent && <EventBanner event={currentEvent} />}

      {/* 活动相关谱面列表 */}
      {searchKeyword && (
        <div className="mt-4 sm:mt-6 md:mt-8 px-2 sm:px-3 md:px-4">
          <div className="mb-8">
            <h2 className="m-0 mb-3 sm:mb-4 md:mb-6 font-bold text-ink text-xl sm:text-2xl md:text-3xl text-center">
              {loc('RelatedCharts')}
            </h2>

            {/* 分割线 */}
            <div className="relative my-8 w-[70%] h-px bg-line"></div>

            <SongList
              url={endpoints.maichart.listSearch(searchKeyword)}
              page={0}
              setMax={() => { }}
            />
          </div>
        </div>
      )}
    </PageLayout>
  );
}
