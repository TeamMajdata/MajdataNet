/** 支持的语言。 */
export const SUPPORTED_LANGUAGES = ['en', 'zh', 'ja', 'ko'] as const;

export type Language = (typeof SUPPORTED_LANGUAGES)[number];

/** 语言包以“路由/组件”为命名空间，命名空间内保存具体文案。 */
export type TranslationDictionary = Record<string, Record<string, string>>;

export type LanguageCache = Partial<Record<Language, TranslationDictionary>>;

export type I18nFunction = (key: string, fallback?: string) => string;

export interface I18nContextValue {
  language: Language;
  changeLanguage: (language: string) => Promise<void>;
  i18n: I18nFunction;
  isReady: boolean;
}
