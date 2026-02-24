/**
 * 组件 Props 类型定义
 */

import type { useSingleton } from '@tippyjs/react';
import type { ReactNode } from 'react';
import type { Event, EventCategory } from './event';
import type { Comment } from './comment';

// ======================== 歌曲详情组件 ========================
export interface SongDetailsContainerProps {
  id: string;
  tippy: ReturnType<typeof useSingleton>[1];
}

export interface CoverPicProps {
  /** 谱面ID */
  id: string | number;
  /** 可选的显示文本（通常是ID） */
  display?: string;
}

export interface EnhancedDescriptionProps {
  text: string;
  className?: string;
}

// ======================== 活动组件 ========================
export interface EventBannerProps {
  event: Event | null;
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
  /** 是否为玩家页面 */
  isPlayer?: boolean;
}

export interface LevelProps {
  /** 等级数字，如 "13+", "14" */
  level: string;
  /** 难度等级，如 "Master", "Expert" */
  difficulty: string;
  /** 歌曲ID */
  songid: string;
  /** 是否为玩家页面 */
  isPlayer?: boolean;
}

export interface SongDifficultyLevelsProps {
  levels: (string | null)[];
  songid: string;
  isPlayer?: boolean;
}

// ======================== 交互计数组件 ========================
export interface InteractCountProps {
  /** 歌曲ID */
  songid: string | number;
}

// ======================== Majdata 组件 ========================
export interface MajdataProps {
  songid: string;
  apiroot: string;
  level: number;
}

// ======================== 页面布局组件 ========================
export interface PageLayoutProps {
  children: ReactNode;
  showAds?: boolean;
  showFooter?: boolean;
  showBackToHome?: boolean;
  title?: string | null;
  className?: string;
  useAmbientBackground?: boolean;
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
  scoresum: number;
  maxscore: number;
}

export interface ScoreListProps {
  songid: string;
}

// ======================== 歌曲列表组件 ========================
export interface SongListProps {
  url: string;
  setMax?: (page: number) => void;
  page?: number;
  isRanking?: boolean;
  isManage?: boolean;
}

// ======================== 评论组件 ========================
export interface MarkdownCommentContentProps {
  content: string;
  comment?: Comment;
}

export interface CommentCardProps {
  comment: Comment;
  currentUser: string | null;
  onReply?: (comment: Comment, parentComment?: Comment) => void;
  onDelete: (comment: Comment) => void;
  isPending: string | null;
  isReply?: boolean;
  onToggleReplies?: () => void;
  isRepliesExpanded?: boolean;
  replyCount?: number;
}

export interface CommentComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onCancel?: () => void;
  placeholder: string;
  autoFocus?: boolean;
  isReply?: boolean;
  isSubmitting?: boolean;
}

export interface CommentSenderProps {
  songid: string;
}

export interface CommentThreadProps {
  comment: Comment;
  currentUser: string | null;
  onReply: (comment: Comment, parentComment?: Comment) => void;
  onDelete: (comment: Comment) => void;
  isPending: string | null;
  isSubmittingReply: boolean;
  isExpanded: boolean;
  onToggleReplies: () => void;
  replyComposer?: React.ReactNode;
}

export interface CommentListProps {
  songid: string;
}

// ======================== 最近游玩组件 ========================
export interface RecentPlayedWidgetProps {
  /** 用户名 */
  username: string;
}

// ======================== 时间轴组件 ========================
export interface TimelineModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// ======================== 标签管理组件 ========================
export interface TagManageWidgetProps {
  songid: string;
  newClassName?: string;
}

export interface TagManageWidgetRef {
  toggleWindow: () => void;
  openWindow: () => void;
  closeWindow: () => void;
}

export interface TagManageTagLauncherProps {
  onClick: () => void;
}

export interface TagManageButtonProps {
  onClick: () => void;
  newClassName?: string;
}

export interface TagManageTagProps {
  onClick: () => void;
}

export interface TagManageWindowProps {
  onClose: () => void;
  buttonRef: React.RefObject<HTMLDivElement | null>;
  songid: string;
}

// ======================== 点赞组件 ========================
export interface LikeSenderProps {
  songid: string;
}
