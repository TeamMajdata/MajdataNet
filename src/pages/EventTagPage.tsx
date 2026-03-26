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
import { apiroot3 } from '@/config/api';
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
        <div className="mx-auto mt-4 sm:mt-6 md:mt-8 px-2 sm:px-3 md:px-4 max-w-300">
          <div className="mb-8">
            <h2 className="m-0 mb-3 sm:mb-4 md:mb-6 font-bold text-white text-xl sm:text-2xl md:text-3xl text-center" style={{ textShadow: '0 2px 4px rgba(0, 0, 0, 0.5)' }}>
              {loc('RelatedCharts')}
            </h2>

            {/* 渐变分割线 */}
            <div className="relative mx-auto my-8 w-[70%] h-px" style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.2) 15%, rgba(255, 255, 255, 0.4) 30%, rgba(255, 255, 255, 0.6) 50%, rgba(255, 255, 255, 0.4) 70%, rgba(255, 255, 255, 0.2) 85%, transparent 100%)' }}></div>

            <SongList
              url={`${apiroot3}/maichart/list?sort=&search=${encodeURIComponent(searchKeyword)}`}
              page={0}
              setMax={() => { }}
            />
          </div>
        </div>
      )}
    </PageLayout>
  );
}
