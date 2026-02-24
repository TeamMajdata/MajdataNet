/**
 * I18n Context 定义
 * 单独文件存放以符合 React Fast Refresh 规范
 */
import { createContext } from 'react';
import type { I18nContextValue } from '@/types/i18n';

export const I18nContext = createContext<I18nContextValue | null>(null);
