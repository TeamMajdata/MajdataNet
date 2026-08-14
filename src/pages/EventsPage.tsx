/**
 * 活动页面 - 从 legacy/src/app/events/page.jsx 迁移
 * 使用 TailwindCSS 重现原样式
 */

import { useEffect, useState, useMemo } from 'react';
import { setLanguage } from '@/utils/i18n';
import { useLoc } from '@/hooks';
import { PageLayout, EnhancedDescription, LoadingSpinner, EventsFilter, TimelineModal } from '@/components';
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

  if (!ready) return <div className="flex justify-center items-center h-screen"><LoadingSpinner size="50px" /></div>;

  return (
    <PageLayout className="py-8 min-h-screen mt-(--content-top-spacing)">
      <div className="mx-auto my-0 px-4 max-w-(--container-max-width)">
        <header className="mb-12 text-center">
          <p className="m-0 mx-auto max-w-150 text-ink-2 text-lg leading-relaxed">
            {loc('EventsPageSubtitle', '浏览所有活动')}
            <span
              className="inline-block ml-2 font-medium text-primary hover:text-primary-hover underline underline-offset-2 transition-colors duration-200 cursor-pointer"
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
              className="group rounded-xl overflow-hidden cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-card-hover"
              onClick={() => window.location.href = event.href}
            >
              <div className="overflow-hidden">
                <img
                  className="block w-full aspect-[1279/372] object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                  src={event.src}
                  alt={event.alt}
                  loading="lazy"
                  decoding="async"
                />
              </div>
              <div className="p-5 md:p-6 text-left">
                <div className="flex items-start justify-between gap-4">
                  <h3 className="m-0 font-bold text-ink text-xl md:text-2xl leading-tight">
                    {event.title}
                  </h3>
                  <span
                    className={`inline-block px-2.5 py-1 rounded-md font-semibold text-xs whitespace-nowrap shrink-0 ${getEventStatusClass(event) === 'status-upcoming'
                      ? 'bg-primary text-white'
                      : getEventStatusClass(event) === 'status-ongoing'
                        ? 'bg-ok text-white'
                        : 'bg-surface-2 text-ink-3'
                      }`}
                  >
                    {getEventStatusText(event)}
                  </span>
                </div>
                <EnhancedDescription
                  text={event.description}
                  className="m-0 mt-3 mb-4 text-ink-2 text-base leading-relaxed"
                />
                <div className="flex flex-wrap items-center gap-3 text-xs text-ink-3">
                  <span className="font-medium text-primary whitespace-nowrap">
                    {getCategoryTranslation(event.category)}
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
