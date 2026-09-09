import { DEFAULT_LANGUAGE, LANGUAGE_STORAGE_KEY, SUPPORTED_LANGUAGES } from '@/config/i18n';
import type { Language, TranslationDictionary } from '@/types/i18n';

type TranslationIndex = Map<string, string>;

const languageCache: Partial<Record<Language, TranslationIndex>> = {};
const pendingLoads = new Map<Language, Promise<TranslationIndex>>();
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

  return Object.values(value).every((namespace) => (
    namespace !== null
    && typeof namespace === 'object'
    && !Array.isArray(namespace)
    && Object.values(namespace).every((translation) => typeof translation === 'string')
  ));
}

async function loadLanguage(language: Language): Promise<TranslationIndex> {
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

      // Build once per language so render-time lookups need no key parsing.
      const index: TranslationIndex = new Map();
      for (const [namespace, translations] of Object.entries(dictionary)) {
        for (const [key, value] of Object.entries(translations)) {
          const fullKey = `${namespace}.${key}`;
          const parts = splitTranslationKey(fullKey);
          if (parts?.[0] === namespace && parts[1] === key) {
            index.set(fullKey, value);
          }
        }
      }
      languageCache[language] = index;
      return index;
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
  const currentDictionary = languageCache[currentLanguage];
  const translated = currentDictionary?.get(key)
    ?? (currentDictionary ? languageCache[DEFAULT_LANGUAGE]?.get(key) : undefined);
  if (translated !== undefined) return translated;

  if (!splitTranslationKey(key)) {
    const warningKey = `invalid:${key}`;
    if (!warnedKeys.has(warningKey)) {
      console.warn(`[i18n] Invalid key format: ${key}; expected route/component.key`);
      warnedKeys.add(warningKey);
    }
    return fallback ?? key;
  }

  if (!currentDictionary) return fallback ?? key;

  const warningKey = `${currentLanguage}:${key}`;
  if (!warnedKeys.has(warningKey)) {
    console.warn(`[i18n] Missing translation: ${warningKey}`);
    warnedKeys.add(warningKey);
  }
  return fallback ?? key;
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
