/**
 * 国际化 Context - 提供全局语言状态管理
 */
import React, { useState, useEffect, useCallback } from 'react';
import { setLanguage, getCurrentLanguage, initializeLanguage, getTranslatedString } from '../utils/i18n';
import type { Language, I18nContextValue } from '@/types/i18n';
import { I18nContext } from './i18nContextDef';

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
