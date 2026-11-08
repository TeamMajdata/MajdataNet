/**
 * 活动相关类型定义
 */

import type { UserBrief } from './user';

// 活动类别枚举常量
export const EventCategory = {
  All: 0,
  University: 1,
  Major: 2,
  PrivateProject: 3,
  PrivateContest: 4,
  Season: 5,
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
  'chart-events/eventsData.EventCategorySeason',
] as const;

export type EventType = 'outerLink' | 'eventTag' | 'space' | 'season';

// 活动接口
export interface Event {
  id: string;
  type: EventType;
  /** Raw target ID, or a complete URL for outerLink. */
  asset: string;
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

/** Song link resolved from the season collection. */
export type SeasonChart = string;

export interface PlayHistoryRankingRequest {
  /** 谱面 Id（MaiChart.Id），后端按 PlayHistory.ChartId 查询。 */
  songIds: string[];
  startTime: string;
  endTime: string;
  scoreType: 'best';
  sortBy: 'Acc.DX';
}

export interface PlayHistoryRankingEntry {
  playerId: string;
  username: string;
  totalDXScore: number;
  totalAccDX: number;
  totalAccClassic: number;
  /** 玩家资料；账号已删除时为 null，旧版后端不返回。 */
  player?: UserBrief | null;
}

export interface RankedSeasonEntry extends PlayHistoryRankingEntry {
  /** DX accuracy rounded to the four decimal places used for display and ties. */
  score: number;
  rank: number;
}
