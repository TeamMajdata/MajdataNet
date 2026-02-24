/**
 * 国际化 Context - 提供全局语言状态管理
 */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { setLanguage, getCurrentLanguage, initializeLanguage, getTranslatedString } from '../utils/i18n';
import type { Language } from '../config/i18n';

interface I18nContextValue {
  language: Language;
  changeLanguage: (lang: string) => Promise<void>;
  t: (key: string, fallback?: string) => string;
  isReady: boolean;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(getCurrentLanguage());
  const [isReady, setIsReady] = useState(false);
  const [, forceUpdate] = useState({});

  // 初始化语言
  useEffect(() => {
    initializeLanguage().then((lang) => {
      setLanguageState(lang);
      setIsReady(true);
    });
  }, []);

  // 监听语言变化事件
  useEffect(() => {
    const handleLanguageChange = (event: Event) => {
      const customEvent = event as CustomEvent<Language>;
      setLanguageState(customEvent.detail);
      forceUpdate({}); // 强制更新所有使用该 Context 的组件
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
    
    // 触发全局语言变化事件
    window.dispatchEvent(new CustomEvent('languageChange', { detail: newLang }));
  }, []);

  // 翻译函数
  const t = useCallback((key: string, fallback?: string) => {
    return getTranslatedString(key, fallback);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language]); // 依赖 language 以触发重新渲染

  const value: I18nContextValue = {
    language,
    changeLanguage,
    t,
    isReady,
  };

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

/**
 * 使用 i18n Context 的 Hook
 */
export function useI18nContext() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18nContext must be used within I18nProvider');
  }
  return context;
}
