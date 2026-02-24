/**
 * 时间轴相关类型定义
 */

import type { Event } from './event';

// 时间轴片段接口
export interface TimelineSegment {
  start: Date;
  end: Date;
  startPosition: number;
  endPosition: number;
  compressed: boolean;
  density: number;
  days: number;
}

// 时间轴事件接口
export interface TimelineEvent extends Event {
  startOffset: number;
  width: number;
  duration: number;
  isOngoing: boolean;
  isUpcoming: boolean;
  row: number;
}

// 时间刻度接口
export interface TimeScale {
  date: Date;
  position: number;
  isMonth: boolean;
  isWeek: boolean;
  compressed: boolean;
}

// 时间轴数据接口
export interface TimelineData {
  startDate: Date | null;
  endDate: Date | null;
  totalDays: number;
  events: TimelineEvent[];
  timeScale: TimeScale[];
  segments?: TimelineSegment[];
  isCompressed?: boolean;
}
