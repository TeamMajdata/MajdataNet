/**
 * 国际化配置和类型
 */

// 支持的语言列表
export const SUPPORTED_LANGUAGES = ['en', 'zh', 'ja', 'ko'] as const;

export type Language = (typeof SUPPORTED_LANGUAGES)[number];

// 语言缓存接口
export interface LanguageCache {
  [key: string]: TranslationDictionary;
}

// 翻译字典接口
export interface TranslationDictionary {
  [key: string]: string;
}

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
