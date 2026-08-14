import { DEFAULT_LANGUAGE, LANGUAGE_STORAGE_KEY, SUPPORTED_LANGUAGES } from '@/config/i18n';
import type { Language, LanguageCache, TranslationDictionary } from '@/types/i18n';

const languageCache: LanguageCache = {};
const pendingLoads = new Map<Language, Promise<TranslationDictionary>>();
const warnedKeys = new Set<string>();

let currentLanguage: Language = DEFAULT_LANGUAGE;
let latestLanguageRequest = 0;

function normalizeLanguage(language: string): Language {
  const languageCode = language.slice(0, 2).toLowerCase() as Language;
  if (SUPPORTED_LANGUAGES.includes(languageCode)) return languageCode;

  console.warn(`[i18n] Unsupported language: ${languageCode}; using ${DEFAULT_LANGUAGE}`);
  return DEFAULT_LANGUAGE;
}

function isTranslationDictionary(value: unknown): value is TranslationDictionary {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;

  const entries = Object.values(value);

  // 扁平结构：{ Key: "文案" }（当前语言包实际使用，loc/getTranslatedString 消费）
  if (entries.every((entry) => typeof entry === 'string')) return true;

  // 命名空间结构：{ "路由/组件": { Key: "文案" } }（新约定，i18n() 消费）
  return entries.every((namespace) => (
    namespace !== null
    && typeof namespace === 'object'
    && !Array.isArray(namespace)
    && Object.values(namespace).every((translation) => typeof translation === 'string')
  ));
}

async function loadLanguage(language: Language): Promise<TranslationDictionary> {
  const cached = languageCache[language];
  if (cached) return cached;

  const pending = pendingLoads.get(language);
  if (pending) return pending;

  const request = fetch(`/i18n/${language}.json`)
    .then(async (response) => {
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const dictionary: unknown = await response.json();
      if (!isTranslationDictionary(dictionary)) {
        throw new Error('invalid language file structure');
      }

      languageCache[language] = dictionary;
      return dictionary;
    })
    .finally(() => pendingLoads.delete(language));

  pendingLoads.set(language, request);
  return request;
}

function saveLanguage(language: Language): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  }
}

/** 加载并切换语言；相同语言的并发请求会自动合并。 */
export async function setLanguage(language: string): Promise<Language> {
  const requestId = ++latestLanguageRequest;
  const nextLanguage = normalizeLanguage(language);
  let resolvedLanguage = nextLanguage;

  try {
    await loadLanguage(nextLanguage);
  } catch (error) {
    console.error(`[i18n] Failed to load ${nextLanguage}`, error);

    if (nextLanguage !== DEFAULT_LANGUAGE) {
      try {
        await loadLanguage(DEFAULT_LANGUAGE);
      } catch (fallbackError) {
        console.error(`[i18n] Failed to load fallback ${DEFAULT_LANGUAGE}`, fallbackError);
      }
    }
    resolvedLanguage = DEFAULT_LANGUAGE;
  }

  // A slower, older request must not overwrite a newer language selection.
  if (requestId !== latestLanguageRequest) return currentLanguage;

  currentLanguage = resolvedLanguage;
  saveLanguage(currentLanguage);
  return currentLanguage;
}

function splitTranslationKey(key: string): [namespace: string, translationKey: string] | null {
  const separatorIndex = key.lastIndexOf('.');
  if (separatorIndex <= 0 || separatorIndex === key.length - 1) return null;

  const namespace = key.slice(0, separatorIndex);
  const translationKey = key.slice(separatorIndex + 1);
  if (!namespace.includes('/')) return null;
  return [namespace, translationKey];
}

/**
 * 获取文案。key 必须使用 `路由/组件.key`，例如：
 * `i18n('song/SongPage.Download')`。
 */
export function i18n(key: string, fallback?: string): string {
  const keyParts = splitTranslationKey(key);
  if (!keyParts) {
    const warningKey = `invalid:${key}`;
    if (!warnedKeys.has(warningKey)) {
      console.warn(`[i18n] Invalid key format: ${key}; expected route/component.key`);
      warnedKeys.add(warningKey);
    }
    return fallback ?? key;
  }

  const [namespace, translationKey] = keyParts;
  const currentDictionary = languageCache[currentLanguage];
  if (!currentDictionary) return fallback ?? key;

  const translated = currentDictionary[namespace]?.[translationKey]
    ?? languageCache[DEFAULT_LANGUAGE]?.[namespace]?.[translationKey];

  if (translated === undefined) {
    // 兼容扁平结构语言包：命名空间 key 的末段作为扁平 key 再查一次
    const flatValue = getTranslatedString(translationKey, '');
    if (flatValue !== '') return flatValue;

    const warningKey = `${currentLanguage}:${key}`;
    if (!warnedKeys.has(warningKey)) {
      console.warn(`[i18n] Missing translation: ${warningKey}`);
      warnedKeys.add(warningKey);
    }
    return fallback ?? key;
  }

  return translated;
}

export function getCurrentLanguage(): Language {
  return currentLanguage;
}

export function getBrowserLanguage(): Language {
  if (typeof navigator === 'undefined') return DEFAULT_LANGUAGE;
  return normalizeLanguage(navigator.language);
}

export async function initializeLanguage(): Promise<Language> {
  const savedLanguage = typeof localStorage === 'undefined'
    ? null
    : localStorage.getItem(LANGUAGE_STORAGE_KEY);
  return setLanguage(savedLanguage ?? getBrowserLanguage());
}

export async function preloadLanguage(language: Language): Promise<void> {
  try {
    await loadLanguage(language);
  } catch (error) {
    console.error(`[i18n] Failed to preload ${language}`, error);
  }
}

/**
 * —— 兼容层：旧扁平 key ——
 * 我们的 UI 大量使用 loc(key, fallback)（扁平 key + 扁平 JSON）。
 * 扁平 key 直接查当前语言字典顶层；找不到时回退默认语言 / fallback / key。
 */
export function getTranslatedString(key: string, fallback?: string): string {
  const currentDictionary = languageCache[currentLanguage] as Record<string, unknown> | undefined;
  if (currentDictionary) {
    const v = currentDictionary[key];
    if (typeof v === 'string') return v;
  }
  const defaultDictionary = languageCache[DEFAULT_LANGUAGE] as Record<string, unknown> | undefined;
  const dv = defaultDictionary?.[key];
  if (typeof dv === 'string') return dv;
  return fallback ?? key;
}

/** 旧版翻译函数简写别名（扁平 key） */
export const loc = getTranslatedString;
