/**
 * 国际化 React Hook
 */
import { useState, useEffect, useCallback } from 'react';
import { setLanguage, getCurrentLanguage, initializeLanguage, getTranslatedString, loc } from '../utils/i18n';
import type { Language } from '../config/i18n';

/**
 * 使用国际化的Hook
 */
export function useI18n() {
  const [language, setLanguageState] = useState<Language>(getCurrentLanguage());
  const [isReady, setIsReady] = useState(false);

  // 初始化语言
  useEffect(() => {
    initializeLanguage().then((lang) => {
      setLanguageState(lang);
      setIsReady(true);
    });
  }, []);

  // 监听语言变化事件，确保所有使用该 hook 的组件都能更新
  useEffect(() => {
    const handleLanguageChange = (event: Event) => {
      const customEvent = event as CustomEvent<Language>;
      setLanguageState(customEvent.detail);
    };

    window.addEventListener('languageChange', handleLanguageChange);
    return () => {
      window.removeEventListener('languageChange', handleLanguageChange);
    };
  }, []);

  // 切换语言
  const changeLanguage = useCallback(async (lang: string) => {
    await setLanguage(lang);
    const newLang = getCurrentLanguage();
    setLanguageState(newLang);
    
    // 触发页面重新渲染
    window.dispatchEvent(new CustomEvent('languageChange', { detail: newLang }));
  }, []);

  // 翻译函数
  const t = useCallback((key: string, fallback?: string) => {
    return getTranslatedString(key, fallback);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language]); // 依赖language以触发重新渲染

  return {
    language,
    changeLanguage,
    t,
    loc: t, // 别名
    isReady,
  };
}

/**
 * 监听语言变化的Hook
 */
export function useLanguageChange(callback: (language: Language) => void) {
  useEffect(() => {
    const handleLanguageChange = (event: Event) => {
      const customEvent = event as CustomEvent<Language>;
      callback(customEvent.detail);
    };

    window.addEventListener('languageChange', handleLanguageChange);
    return () => {
      window.removeEventListener('languageChange', handleLanguageChange);
    };
  }, [callback]);
}

/**
 * 简单的翻译Hook（只提供翻译函数）
 */
export function useTranslation() {
  const [, forceUpdate] = useState({});

  // 监听语言变化以触发重新渲染
  useLanguageChange(() => {
    forceUpdate({});
  });

  return {
    t: (key: string, fallback?: string) => getTranslatedString(key, fallback),
    loc,
  };
}

/**
 * 提供响应式的 loc 函数
 * 当语言变化时，使用此 hook 的组件会自动重新渲染
 */
export function useLoc() {
  const [, forceUpdate] = useState({});

  // 监听语言变化以触发重新渲染
  useLanguageChange(() => {
    forceUpdate({});
  });

  // 返回 loc 函数
  return (key: string, fallback?: string) => getTranslatedString(key, fallback);
}
