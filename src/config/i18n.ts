/**
 * 国际化配置
 */

import { SUPPORTED_LANGUAGES, type Language } from '@/types/i18n';

// 语言配置
export const LANGUAGE_CONFIG = {
  en: { name: 'English', nativeName: 'English' },
  zh: { name: 'Chinese', nativeName: '简体中文' },
  ja: { name: 'Japanese', nativeName: '日本語' },
  ko: { name: 'Korean', nativeName: '한국어' },
} as const;

// 默认语言
export const DEFAULT_LANGUAGE: Language = 'en';

// 本地存储键
export const LANGUAGE_STORAGE_KEY = 'language';

// 重新导出类型供其他模块使用
export { SUPPORTED_LANGUAGES, type Language };
