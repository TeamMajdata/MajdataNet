/**
 * 组件 Props 类型定义
 */

import type { ReactNode } from 'react';
import type { Event, EventCategory } from './event';

export interface CoverPicProps {
  /** 谱面ID */
  id: string | number;
  /** 可选的显示文本（通常是ID） */
  display?: string;
  /** 点击封面跳转的地址 */
  to?: string;
  /** 封面圆角（Tailwind rounded-* 类），默认 rounded-[10px] */
  radiusClassName?: string;
}

export interface EnhancedDescriptionProps {
  text: string;
  className?: string;
}

// ======================== 活动组件 ========================
export interface EventBannerProps {
  event: Event | null;
  containerClassName?: string;
}

export interface EventsFilterProps {
  selectedCategory: EventCategory;
  onCategoryChange: (category: EventCategory) => void;
  categories: EventCategory[];
}

// ======================== 难度等级组件 ========================
export interface LevelsProps {
  /** 难度等级数组，索引对应：[Easy, Basic, Advanced, Expert, Master, ReMaster, Utage] */
  levels: (string | null | undefined)[];
  /** 歌曲ID */
  songid: string;
  /** 点击标签跳到谱面页并选中该难度（列表卡片里使用） */
  linkToSong?: boolean;
}

export interface LevelProps {
  /** 等级数字，如 "13+", "14" */
  level: string;
  /** 难度等级，如 "Master", "Expert" */
  difficulty: string;
  /** 歌曲ID */
  songid: string;
}

export interface SongDifficultyLevelsProps {
  levels: (string | null)[];
  selected?: number;
  onSelect?: (level: number) => void;
  /** vertical：电脑侧栏里的纵向列表（难度名在左、定数在右）；默认是一行分段页签 */
  orientation?: 'horizontal' | 'vertical';
}

// ======================== 交互计数组件 ========================
export interface InteractCountProps {
  /** 歌曲ID */
  songid: string;
}

// ======================== Majdata 组件 ========================
export interface MajdataProps {
  songid: string;
  chartRoot: string;
  level: string;
}

// ======================== 页面布局组件 ========================
export interface PageLayoutProps {
  children: ReactNode;
  showFooter?: boolean;
  className?: string;
  useAmbientBackground?: boolean;
  /** 内容很少的页面（404、提示页）：在页头和页脚之间上下居中 */
  centered?: boolean;
}

// ======================== 成绩组件 ========================
export interface ScoreCountProps {
  /** 上传者用户名 */
  uploader: string;
  /** 页码（从0开始） */
  page?: number;
  /** 每页数量 */
  pageSize?: number;
}

export interface ScoreCardProps {
  rank: number;
  username: string;
  /** 数据里附带的头像 ID；没有时按用户名查资料 */
  avatarId?: string | null;
  scoresum: number;
  maxscore: number;
  footer?: ReactNode;
}

export interface ScoreListProps {
  songid: string;
  chartLevel?: number;
}

// ======================== 歌曲列表组件 ========================
export interface SongListProps {
  /** 一个或多个接口地址；多个时按顺序合并成一屏（见 apiPagesForView） */
  url: string | string[];
  setMax?: (page: number) => void;
  page?: number;
  isRanking?: boolean;
  isManage?: boolean;
  onDataLoaded?: (hasData: boolean) => void;
  /** 替换默认的谱面网格类名（例如 SONG_GRID_CONTAINER_CLASS） */
  gridClassName?: string;
}

// ======================== 最近游玩组件 ========================
export interface RecentPlayedWidgetProps {
  /** 用户名 */
  username: string;
  /** 数据加载完成后的回调，参数表示是否有数据 */
  onDataLoaded?: (hasData: boolean) => void;
  /** 替换默认的谱面网格类名（例如 SONG_GRID_CONTAINER_CLASS） */
  gridClassName?: string;
}

// ======================== 时间轴组件 ========================
export interface TimelineModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// ======================== 标签管理组件 ========================
export interface TagManageWidgetProps {
  songid: string;
}

export interface TagManageWidgetRef {
  toggleWindow: () => void;
  openWindow: () => void;
  closeWindow: () => void;
}

export interface TagManageWindowProps {
  onClose: () => void;
  songid: string;
}
