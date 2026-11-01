/**
 * 国际化配置
 */

/** 支持的语言。新增语言时在此处和 src/locales 下同时添加。 */
export const SUPPORTED_LANGUAGES = ['en', 'zh', 'ja', 'ko'] as const;

export type Language = (typeof SUPPORTED_LANGUAGES)[number];

// 语言配置；locale 供 Intl / toLocale*String 格式化日期和数字使用
export const LANGUAGE_CONFIG: Record<Language, { name: string; nativeName: string; locale: string }> = {
  en: { name: 'English', nativeName: 'English', locale: 'en-US' },
  zh: { name: 'Chinese', nativeName: '简体中文', locale: 'zh-CN' },
  ja: { name: 'Japanese', nativeName: '日本語', locale: 'ja-JP' },
  ko: { name: 'Korean', nativeName: '한국어', locale: 'ko-KR' },
};

// 默认语言，同时作为缺失文案时的回退语言
export const DEFAULT_LANGUAGE: Language = 'en';

// 本地存储键（沿用旧 key，用户已保存的语言选择不会丢失）
export const LANGUAGE_STORAGE_KEY = 'language';
