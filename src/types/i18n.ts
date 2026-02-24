/**
 * 国际化相关类型定义
 */

// 支持的语言列表
export const SUPPORTED_LANGUAGES = ['en', 'zh', 'ja', 'ko'] as const;

// 语言类型
export type Language = (typeof SUPPORTED_LANGUAGES)[number];

// 语言缓存接口
export interface LanguageCache {
  [key: string]: TranslationDictionary;
}

// 翻译字典接口
export interface TranslationDictionary {
  [key: string]: string;
}

// I18n Context 值接口
export interface I18nContextValue {
  language: Language;
  changeLanguage: (lang: string) => Promise<void>;
  t: (key: string, fallback?: string) => string;
  isReady: boolean;
}
