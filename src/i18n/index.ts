/**
 * i18next 初始化。
 *
 * - 文案位于 src/locales/<lang>.json，按 `路由/组件` 分组：`t('song/SongPage.Download')`。
 * - 语言包由 Vite 按需拆包（带 hash 的独立 chunk），切换语言时才下载，部署后不会命中旧缓存。
 * - 语言检测顺序：localStorage → 浏览器语言，结果写回 localStorage。
 * - 当前语言缺失的文案回退到 DEFAULT_LANGUAGE，组件里不要再写行内 fallback。
 * - 动态内容用插值 `{{name}}`，数量用复数后缀 `_one` / `_other` 并传 `count`，不要拼接字符串。
 * - 修改语言包后运行 `pnpm i18n:fix`：key 按字母排序以减少合并冲突，CI 会拒绝未排序的文件。
 */
import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import resourcesToBackend from 'i18next-resources-to-backend';
import { initReactI18next, useTranslation } from 'react-i18next';
import {
  DEFAULT_LANGUAGE,
  LANGUAGE_CONFIG,
  LANGUAGE_STORAGE_KEY,
  SUPPORTED_LANGUAGES,
  type Language,
} from '@/config/i18n';

export type { ParseKeys as TranslationKey } from 'i18next';

function toLanguage(language: string | undefined): Language {
  return SUPPORTED_LANGUAGES.find((supported) => supported === language) ?? DEFAULT_LANGUAGE;
}

function syncDocumentLanguage(): void {
  if (typeof document !== 'undefined') {
    document.documentElement.lang = getCurrentLanguage();
  }
}

i18n.on('languageChanged', syncDocumentLanguage);

void i18n
  .use(resourcesToBackend((language: string) => import(`../locales/${language}.json`)))
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    supportedLngs: SUPPORTED_LANGUAGES,
    fallbackLng: DEFAULT_LANGUAGE,
    load: 'languageOnly',
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: LANGUAGE_STORAGE_KEY,
      caches: ['localStorage'],
      // zh-CN / zh-TW / en-US → zh / en，与语言包文件名一致
      convertDetectedLanguage: (language) => language.split('-')[0].toLowerCase(),
    },
    interpolation: {
      // React 已经负责转义
      escapeValue: false,
    },
  });

/** 当前生效的语言（非 React 代码使用；组件内请用 useLanguage 以便随语言切换重新渲染）。 */
export function getCurrentLanguage(): Language {
  return toLanguage(i18n.resolvedLanguage);
}

/** 当前语言对应的 BCP 47 locale，用于 Intl / toLocale*String。 */
export function getLocale(language: Language = getCurrentLanguage()): string {
  return LANGUAGE_CONFIG[language].locale;
}

/** 当前生效的语言，语言切换时触发重新渲染。 */
export function useLanguage(): Language {
  const { i18n: instance } = useTranslation();
  return toLanguage(instance.resolvedLanguage);
}

export default i18n;
