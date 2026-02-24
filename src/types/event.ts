/**
 * 活动相关类型定义
 */

// 活动类别类型
export type EventCategory = '高校赛事' | '大型赛事' | '私立企划' | '私立赛事';

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
