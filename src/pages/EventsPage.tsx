/**
 * 活动页面 - 从 legacy/src/app/events/page.jsx 迁移
 * 使用 TailwindCSS 重现原样式
 */

import { useEffect, useState, useMemo } from 'react';
import { setLanguage } from '@/utils/i18n';
import { useLoc } from '@/hooks';
import { PageLayout, EnhancedDescription } from '@/components';
import EventsFilter from '@/components/EventsFilter';
import TimelineModal from '@/components/TimelineModal';
import {
  getEventStatusClass,
  getEventStatusText,
  getEventsWithTimeAgo,
  getCategoryTranslation,
} from '@/utils/eventsData';
import { EventCategory } from '@/types';

export default function EventsPage() {
  const loc = useLoc();
  const [ready, setReady] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<EventCategory>(EventCategory.All);
  const [isTimelineModalOpen, setIsTimelineModalOpen] = useState(false);

  useEffect(() => {
    setLanguage(localStorage.getItem('language') || navigator.language).then(() => {
      setReady(true);
    });
  }, []);

  const allEvents = useMemo(() => {
    return getEventsWithTimeAgo()
      .sort((a, b) => new Date(b.createDate).getTime() - new Date(a.createDate).getTime());
  }, []);

  const categories = useMemo(() => {
    return Object.values(EventCategory);
  }, []);

  const filteredEvents = useMemo(() => {
    return selectedCategory === EventCategory.All
      ? allEvents
      : allEvents.filter(event => event.category === selectedCategory);
  }, [allEvents, selectedCategory]);

  const handleCategoryChange = (category: EventCategory) => {
    setSelectedCategory(category);
  };

  // 处理时间轴点击
  const handleTimelineClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsTimelineModalOpen(true);
  };

  // 关闭时间轴弹窗
  const handleCloseTimelineModal = () => {
    setIsTimelineModalOpen(false);
  };

  if (!ready) return <div className="loading"></div>;

  return (
    <PageLayout className="py-8 min-h-screen mt-(--content-top-spacing)">
      <div className="mx-auto my-0 px-4 max-w-(--container-max-width)">
        <header className="mb-12 text-center">
          <p className="m-0 mx-auto max-w-150 text-white/80 text-lg leading-relaxed">
            {loc('EventsPageSubtitle', '浏览所有活动')}
            <span 
              className="inline-block ml-2 font-medium text-blue-400 hover:text-blue-300 decoration-blue-400/50 hover:decoration-blue-300/80 underline underline-offset-2 transition-all hover:-translate-y-px duration-200 cursor-pointer"
              onClick={handleTimelineClick}
              title={loc('ViewTimeline', '查看时间轴')}
            >
              {loc('Timeline', '时间轴')}
            </span>
          </p>
        </header>

        <EventsFilter
          selectedCategory={selectedCategory}
          onCategoryChange={handleCategoryChange}
          categories={categories as EventCategory[]}
        />

        <div className="gap-8 grid grid-cols-1 lg:grid-cols-2 mt-8">
          {filteredEvents.map((event) => (
            <div 
              key={event.id} 
              className="relative bg-[rgb(20,20,25)]/90 shadow-[0_8px_24px_rgba(0,0,0,0.4)] hover:shadow-[0_16px_48px_rgba(0,0,0,0.6)] border border-white/10 hover:border-white/30 rounded-2xl h-auto aspect-1279/372 overflow-hidden hover:scale-[1.03] transition-all hover:-translate-y-3 duration-[0.4s] ease-[cubic-bezier(0.25,0.46,0.45,0.94)] will-change-transform"
            >
              <a 
                href={event.href} 
                className="block w-full h-full text-inherit no-underline"
              >
                <div className="relative w-full h-full overflow-hidden">
                  <img
                    className="block w-full h-full object-cover hover:scale-105 transition-transform duration-500 ease-[cubic-bezier(0.25,0.46,0.45,0.94)] will-change-transform"
                    src={event.src}
                    alt={event.alt}
                    loading="lazy"
                    decoding="async"
                  />
                  <div className="absolute inset-0 flex flex-col justify-center bg-linear-to-b from-black/40 via-black/20 to-black/80 opacity-0 hover:opacity-100 px-6 py-2 transition-all translate-y-2.5 hover:translate-y-0 duration-500 ease-[cubic-bezier(0.25,0.46,0.45,0.94)] will-change-[opacity,transform]">
                    <div className="text-left">
                      <h3 className="drop-shadow-[0_2px_8px_rgba(0,0,0,0.7)] m-0 mb-3 font-bold text-white text-2xl leading-tight">
                        {event.title}
                      </h3>
                      <EnhancedDescription 
                        text={event.description} 
                        className="drop-shadow-[0_1px_3px_rgba(0,0,0,0.5)] m-0 mb-4 text-white/90 text-base leading-relaxed"
                      />
                      <div className="flex flex-wrap items-center gap-3 drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)] text-white/80 text-sm">
                        <span className="whitespace-nowrap">
                          {getCategoryTranslation(event.category)}
                        </span>
                        <span
                          className={`font-semibold text-sm px-2 py-0.5 rounded-md inline-block mr-2 ${
                            getEventStatusClass(event) === 'status-upcoming'
                              ? 'text-amber-400 bg-amber-400/20 border border-amber-400/40 shadow-[0_0_8px_rgba(251,191,36,0.2)]'
                              : getEventStatusClass(event) === 'status-ongoing'
                              ? 'text-emerald-400 bg-emerald-400/20 border border-emerald-400/40 shadow-[0_0_8px_rgba(16,185,129,0.2)]'
                              : 'text-gray-400 bg-gray-400/20 border border-gray-400/40'
                          }`}
                        >
                          • {getEventStatusText(event)}
                        </span>
                        <span
                          className="whitespace-nowrap"
                          title={`${loc('EventCreatedPrefix', '创建于')} ${event.createDateFormatted}`}
                        >
                          • {event.timeAgo}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
            </div>
          ))}
        </div>
      </div>

      {/* 时间轴弹窗 */}
      <TimelineModal 
        isOpen={isTimelineModalOpen}
        onClose={handleCloseTimelineModal}
      />
    </PageLayout>
  );
}
