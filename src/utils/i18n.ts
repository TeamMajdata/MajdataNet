/**
 * 国际化工具函数
 */
import type { Language, LanguageCache, TranslationDictionary } from '@/types/i18n';
import { DEFAULT_LANGUAGE, LANGUAGE_STORAGE_KEY, SUPPORTED_LANGUAGES } from '../config/i18n';

// 语言缓存
// eslint-disable-next-line prefer-const
let languageCache: LanguageCache = {};
let currentLanguage: Language = DEFAULT_LANGUAGE;
const warnedMissingKeys = new Set<string>();

/**
 * 设置当前语言
 * @param lang 语言代码
 */
export async function setLanguage(lang: string): Promise<void> {
  // 提取语言代码（前两个字符）
  const langCode = lang.slice(0, 2).toLowerCase() as Language;

  // 检查是否为支持的语言
  if (!SUPPORTED_LANGUAGES.includes(langCode)) {
    console.warn(`[i18n] Unsupported language: ${langCode}, falling back to ${DEFAULT_LANGUAGE}`);
    return setLanguage(DEFAULT_LANGUAGE);
  }

  // 如果已缓存，直接切换
  if (languageCache[langCode]) {
    currentLanguage = langCode;
    localStorage.setItem(LANGUAGE_STORAGE_KEY, langCode);
    return;
  }

  // 加载语言文件
  try {
    const response = await fetch(`/i18n/${langCode}.json`);
    if (!response.ok) {
      throw new Error('Language file not found');
    }

    const translations: TranslationDictionary = await response.json();
    languageCache[langCode] = translations;
    currentLanguage = langCode;
    localStorage.setItem(LANGUAGE_STORAGE_KEY, langCode);
  } catch (error) {
    console.error(`[i18n] Failed to load language: ${langCode}`, error);
    languageCache[langCode] = {}; // 降级到空字典
    currentLanguage = langCode;
  }
}

/**
 * 获取翻译字符串
 * @param key 翻译键
 * @param fallback 找不到时返回的默认值（可选）
 * @returns 翻译后的字符串
 */
export function getTranslatedString(key: string, fallback?: string): string {
  const translations = languageCache[currentLanguage] || {};

  if (!translations[key]) {
    if (!warnedMissingKeys.has(key)) {
      console.warn(`[i18n] Missing translation key: ${key} in ${currentLanguage}`);
      warnedMissingKeys.add(key);
    }
    return fallback || key;
  }

  return translations[key];
}

/**
 * 简短别名：获取翻译字符串
 */
export const loc = getTranslatedString;

/**
 * 获取当前语言
 */
export function getCurrentLanguage(): Language {
  return currentLanguage;
}

/**
 * 获取浏览器首选语言
 */
export function getBrowserLanguage(): Language {
  const browserLang = navigator.language.slice(0, 2).toLowerCase() as Language;
  return SUPPORTED_LANGUAGES.includes(browserLang) ? browserLang : DEFAULT_LANGUAGE;
}

/**
 * 初始化语言（从localStorage或浏览器语言）
 */
export async function initializeLanguage(): Promise<Language> {
  const savedLang = localStorage.getItem(LANGUAGE_STORAGE_KEY);
  const preferredLang = savedLang || navigator.language;

  await setLanguage(preferredLang);
  return currentLanguage;
}

/**
 * 预加载语言文件
 * @param lang 语言代码
 */
export async function preloadLanguage(lang: Language): Promise<void> {
  if (languageCache[lang]) {
    return; // 已加载
  }

  try {
    const response = await fetch(`/i18n/${lang}.json`);
    if (response.ok) {
      languageCache[lang] = await response.json();
      console.log(`[i18n] Preloaded ${lang}`);
    }
  } catch (error) {
    console.error(`[i18n] Failed to preload ${lang}`, error);
  }
}
