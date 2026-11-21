/**
 * EventTagPage - 活动标签页面
 * 
 * 根据URL参数id显示特定活动的相关谱面
 */

import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { PageLayout, SongList, EventBanner } from '@/components';
import { apiPagesForView } from '@/components/song/songGrid';
import { endpoints } from '@/config/api';
import { getEventBySearchKeyword } from '@/utils/eventsData';
import { type Event } from '@/types';
import { EventCategory } from '@/types/event';

export default function EventTagPage() {
  const { t } = useTranslation();
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
        type: 'eventTag',
        asset: 'Original',
        src: '/events/original.png',
        alt: 'Original Songs',
        title: t("eventTag/EventTagPage.OriginalSongs"),
        category: EventCategory.PrivateProject,
        createDate: new Date().toISOString().split('T')[0],
        endDate: '2099-12-31',
        description: t("eventTag/EventTagPage.OriginalSongsDesc"),
      }
      : getEventBySearchKeyword(eventId)
    : null;

  return (
    <PageLayout>
      <div className="mx-auto py-5 sm:py-8 w-full max-w-320 min-w-0">
        {/* 活动横幅：和页面同宽 */}
        {currentEvent && <EventBanner event={currentEvent} containerClassName="mb-8 sm:mb-10" />}

        {/* 活动相关谱面：横幅下面直接接谱面列表 */}
        {searchKeyword && (
          <section aria-label={t("eventTag/EventTagPage.RelatedCharts")}>
            <SongList
              url={apiPagesForView(0).map((apiPage) => endpoints.maichart.listSearchAndSort(searchKeyword, '', apiPage))}
              page={0}
              setMax={() => { }}
            />
          </section>
        )}
      </div>
    </PageLayout>
  );
}
