/**
 * 曝光作用域 Context 定义
 * 单独文件存放以符合 React Fast Refresh 规范
 */
import { createContext } from 'react';
import type { ImpressionTracker } from '@/utils/impressionTracker';

// 与后端 ImpressionSources 保持一致
export type ImpressionSource = 'feed' | 'related';

// 为 null 表示不在任何曝光作用域内，卡片不做曝光检查
export const ImpressionContext = createContext<ImpressionTracker | null>(null);
