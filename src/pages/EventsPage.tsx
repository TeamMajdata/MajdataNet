/**
 * 活动页面 - 从 legacy/src/app/events/page.jsx 迁移
 * 使用 TailwindCSS 重现原样式
 * v5：活动以主页同款马赛克网格展示（每 7 张一组：前 3 张随机宽度、后 4 张等宽）
 */

import { useEffect, useState, useMemo } from 'react';
import { setLanguage } from '@/utils/i18n';
import { useLoc } from '@/hooks';
import { PageLayout, LoadingSpinner, EventsFilter, TimelineModal } from '@/components';
import {
  getEventStatusClass,
  getEventStatusText,
  getEventsWithTimeAgo,
  getCategoryTranslation,
} from '@/utils/eventsData';
import { EventCategory } from '@/types';
import type { EventWithTimeInfo } from '@/types';

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

// Tailwind 需要静态类名
const COL_CLASS: Record<number, string> = {
  3: 'col-span-12 md:col-span-3',
  4: 'col-span-12 md:col-span-4',
  5: 'col-span-12 md:col-span-5',
  6: 'col-span-12 md:col-span-6',
};

/** 按索引确定每张卡的列跨度（确定性伪随机） */
function spanOf(index: number): number {
  const group = Math.floor(index / 7);
  const pos = index % 7;
  if (pos < 3) {
    const combo = THREE_CARD_ROWS[group % THREE_CARD_ROWS.length];
    return combo[pos];
  }
  return 3; // 4 卡行：3/3/3/3 等宽
}

/** 活动状态徽章（纯色块） */
function EventStatusBadge({ event }: { event: EventWithTimeInfo }) {
  const cls = getEventStatusClass(event);
  const base =
    'inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium whitespace-nowrap';
  return (
    <span
      className={`${base} ${
        cls === 'status-upcoming'
          ? 'bg-primary text-white'
          : cls === 'status-ongoing'
            ? 'bg-ok text-white'
            : 'bg-surface-2 text-ink-3'
      }`}
    >
      {getEventStatusText(event)}
    </span>
  );
}

/** 活动马赛克卡（与主页同款：直角大图 + hover 符号 + 状态徽章） */
function EventMosaicCard({ event, index }: { event: EventWithTimeInfo; index: number }) {
  const colClass = COL_CLASS[spanOf(index)];

  return (
    <div className={colClass}>
      <a
        href={event.href}
        target={event.href.startsWith('http') ? '_blank' : undefined}
        rel="noopener noreferrer"
        className="group block no-underline"
      >
        <div className="relative overflow-hidden aspect-[8/3]">
          <img
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.05]"
            src={event.src}
            alt={event.alt}
            loading="lazy"
            decoding="async"
          />
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <span className="text-5xl md:text-6xl font-light text-white mix-blend-difference select-none">
              +
            </span>
          </div>
          <div className="absolute top-2 right-2">
            <EventStatusBadge event={event} />
          </div>
        </div>
        <div className="flex items-start justify-between gap-3 mt-3">
          <h3 className="m-0 font-semibold text-ink text-base md:text-lg truncate leading-snug">
            {event.title}
          </h3>
          <span className="shrink-0 w-0 h-0.5 mt-2 bg-primary transition-all duration-300 group-hover:w-8" />
        </div>
        <p className="m-0 mt-1 text-xs text-ink-3 truncate">
          <span className="font-medium text-primary whitespace-nowrap">
            {getCategoryTranslation(event.category)}
          </span>
          {' · '}
          <span
            className="whitespace-nowrap"
            title={`${'创建于'} ${event.createDateFormatted}`}
          >
            {event.timeAgo}
          </span>
        </p>
        <div className="mt-2">
          <p className="m-0 text-xs text-ink-3 leading-relaxed line-clamp-2">
            {event.description}
          </p>
        </div>
      </a>
    </div>
  );
}

export default function EventsPage() {
  const loc = useLoc();
  const [ready, setReady] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<EventCategory>(EventCategory.All);

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

  if (!ready) return <div className="flex justify-center items-center h-screen"><LoadingSpinner size="50px" /></div>;

  return (
    <PageLayout className="py-8 min-h-screen mt-(--content-top-spacing)">
      <div className="mx-auto my-0 px-4 w-full">
        {/* 活动时间轴（页面最上方，直接展示） */}
        <div className="mb-10">
          <TimelineModal isOpen={true} onClose={() => {}} inline />
        </div>

        <header className="mb-10 text-center">
          <p className="m-0 mx-auto max-w-150 text-ink-2 text-lg leading-relaxed">
            {loc('EventsPageSubtitle', '浏览所有活动')}
          </p>
        </header>

        <EventsFilter
          selectedCategory={selectedCategory}
          onCategoryChange={handleCategoryChange}
          categories={categories as EventCategory[]}
        />

        <div className="gap-x-6 gap-y-12 grid grid-cols-12 w-full mt-8">
          {filteredEvents.map((event, index) => (
            <EventMosaicCard key={event.id} event={event} index={index} />
          ))}
        </div>
      </div>
    </PageLayout>
  );
}
