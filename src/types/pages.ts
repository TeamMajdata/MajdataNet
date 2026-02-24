/**
 * 页面相关类型定义
 */

import type React from 'react';

// ======================== 个人空间页面 ========================
export interface IntroductionData {
  username: string;
  joinDate: string;
  introduction?: string;
}

// ======================== 排行榜页面 ========================
export interface RankingSectionProps {
  title: string;
  subtitle: string;
  sortType: string;
  delay?: string;
}

// ======================== 主页 ========================
export interface SearchBarProps {
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  initS: string;
  sortType: number;
  onSortChange: (val: number) => void;
}
