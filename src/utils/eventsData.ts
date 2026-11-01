/**
 * 活动数据处理工具函数。活动列表由 useEvents() 提供，这里的函数只做计算。
 */

import i18n, { getLocale } from '@/i18n';
import type { Event, EventWithTimeInfo, EventCategory } from '@/types';
import { EVENT_CATEGORY_I18N_KEYS } from '@/types/event';

/**
 * 获取其他活动数量（除了主页轮播显示的）
 */
export function getNonFeaturedEventsCount(events: Event[]): number {
  const activeEvents = getActiveEvents(events);
  const displayedCount = Math.min(activeEvents.length, 2);
  return Math.max(0, events.length - displayedCount);
}

/**
 * 根据ID获取单个活动
 */
export function getEventById(events: Event[], id: string): Event | undefined {
  return events.find((event) => event.id === id);
}

/**
 * 智能计算时间差距（多少天前/后）
 */
export function getTimeAgo(createDate: string): string {
  const eventDate = new Date(createDate);
  const currentDate = new Date();
  const diffTime = eventDate.getTime() - currentDate.getTime(); // 不使用 Math.abs，保留正负号
  const diffDays = Math.floor(Math.abs(diffTime) / (1000 * 60 * 60 * 24));
  const sign = diffTime > 0 ? 1 : -1; // 判断是否为未来时间
  const format = new Intl.RelativeTimeFormat(getLocale(), { numeric: 'auto' });

  if (diffDays < 30) return format.format(sign * diffDays, 'day');
  if (diffDays < 365) return format.format(sign * Math.floor(diffDays / 30), 'month');
  return format.format(sign * Math.floor(diffDays / 365), 'year');
}

/**
 * 获取带智能时间显示的活动数据
 */
export function getEventsWithTimeAgo(events: Event[]): EventWithTimeInfo[] {
  return events.map((event) => ({
    ...event,
    timeAgo: getTimeAgo(event.createDate),
    createDateFormatted: new Date(event.createDate).toLocaleDateString(
      getLocale(),
      {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }
    ),
  }));
}

/**
 * 检查活动是否即将开始（createDate在未来）
 */
export function isEventUpcoming(event: Event): boolean {
  const currentDate = new Date();
  const createDate = new Date(event.createDate);
  return currentDate < createDate;
}

/**
 * 检查活动是否正在进行中（基于当前日期、创建日期和结束日期）
 */
export function isEventOngoing(event: Event): boolean {
  const currentDate = new Date();
  const createDate = new Date(event.createDate);
  const endDate = new Date(event.endDate);
  return currentDate >= createDate && currentDate <= endDate;
}

/**
 * 获取所有活跃的活动（进行中 + 即将开始的活动）
 */
export function getActiveEvents(events: Event[]): Event[] {
  return events.filter((event) => isEventOngoing(event) || isEventUpcoming(event));
}

/**
 * 获取活动状态的显示文本（支持多语言）
 */
export function getEventStatusText(event: Event): string {
  if (isEventUpcoming(event)) {
    return i18n.t("chart-events/eventsData.EventStatusUpcoming");
  }
  if (isEventOngoing(event)) {
    return i18n.t("chart-events/eventsData.EventStatusOngoing");
  }
  return i18n.t("chart-events/eventsData.EventStatusEnded");
}

/**
 * 获取活动状态的样式类名
 */
export function getEventStatusClass(event: Event): string {
  if (isEventUpcoming(event)) {
    return 'status-upcoming';
  }
  if (isEventOngoing(event)) {
    return 'status-ongoing';
  }
  return 'status-ended';
}

/**
 * 获取活动类型的翻译（支持多语言）
 */
export function getCategoryTranslation(category: EventCategory): string {
  const i18nKey = EVENT_CATEGORY_I18N_KEYS[category];
  if (!i18nKey) return '';
  
  return i18n.t(i18nKey);
}

/**
 * 根据搜索关键词获取对应的 eventTag 活动
 */
export function getEventBySearchKeyword(events: Event[], searchKeyword: string): Event | null {
  if (!searchKeyword) return null;
  return events.find((event) => event.type === 'eventTag' && event.asset === searchKeyword) ?? null;
}
