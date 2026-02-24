/**
 * 类型定义文件
 */

// 难度等级枚举
export enum DifficultyLevel {
  Easy = 0,
  Basic = 1,
  Advanced = 2,
  Expert = 3,
  Master = 4,
  ReMaster = 5,
  Utage = 6,
}

// Combo状态枚举
export enum ComboState {
  None = 0,
  FC = 1,
  FCPlus = 2,
  AP = 3,
  APPlus = 4,
}

// 用户信息接口
export interface UserInfo {
  username: string;
  email?: string;
  // 根据实际API返回添加更多字段
}

// API响应基础接口
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

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
