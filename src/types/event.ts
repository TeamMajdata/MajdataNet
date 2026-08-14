/**
 * 活动相关类型定义
 */

// 活动类别枚举常量
export const EventCategory = {
  All: 0,
  University: 1,
  Major: 2,
  PrivateProject: 3,
  PrivateContest: 4,
} as const;

// 活动类别类型（从值中提取类型）
export type EventCategory = typeof EventCategory[keyof typeof EventCategory];

// 活动类别国际化 key 映射数组
export const EVENT_CATEGORY_I18N_KEYS = [
  'chart-events/eventsData.FilterAll',
  'chart-events/eventsData.EventCategoryUniversity',
  'chart-events/eventsData.EventCategoryMajor',
  'chart-events/eventsData.EventCategoryPrivateProject',
  'chart-events/eventsData.EventCategoryPrivateContest',
] as const;

// 活动接口
export interface Event {
  id: string;
  href: string;
  src: string;
  alt: string;
  title: string;
  category: EventCategory;
  createDate: string; // ISO日期字符串
  endDate: string; // ISO日期字符串
  description: string;
}

// 带时间信息的活动接口
export interface EventWithTimeInfo extends Event {
  timeAgo: string;
  createDateFormatted: string;
}

// 轮播活动返回结果
export interface CarouselEventsResult {
  events: EventWithTimeInfo[];
  shouldRotate: boolean;
}

// MMFC参与者数据接口
export interface MMFCParticipantsData {
  participants: string[];
  description: string;
}
