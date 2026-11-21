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

// 本地存储键：只在用户从语言菜单里选过语言时写入，没选过就每次按浏览器语言来。
// 旧 key 'language' 不再读：以前第一次访问就把检测结果（或默认语言）写进去，之后再也不跟随浏览器
export const LANGUAGE_STORAGE_KEY = 'languageChoice';
