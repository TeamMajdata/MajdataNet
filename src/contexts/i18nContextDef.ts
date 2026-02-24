/**
 * I18n Context 定义
 * 单独文件存放以符合 React Fast Refresh 规范
 */
import { createContext } from 'react';
import type { Language } from '../config/i18n';

export interface I18nContextValue {
  language: Language;
  changeLanguage: (lang: string) => Promise<void>;
  t: (key: string, fallback?: string) => string;
  isReady: boolean;
}

export const I18nContext = createContext<I18nContextValue | null>(null);
