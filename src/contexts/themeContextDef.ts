/**
 * Theme Context 定义
 * 单独文件存放以符合 React Fast Refresh 规范
 */
import { createContext } from 'react';

export type ThemeMode = 'light' | 'dark';

export interface ThemeContextValue {
  /** 当前主题模式 */
  theme: ThemeMode;
  /** 切换主题（light / dark，或 'toggle'） */
  toggleTheme: () => void;
  /** 是否跟随系统 */
  followSystem: boolean;
  /** 设置是否跟随系统 */
  setFollowSystem: (follow: boolean) => void;
}

export const ThemeContext = createContext<ThemeContextValue | null>(null);
