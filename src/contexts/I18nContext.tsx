import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  getCurrentLanguage,
  i18n as translate,
  initializeLanguage,
  setLanguage,
} from '@/utils/i18n';
import type { I18nContextValue, Language } from '@/types/i18n';
import { I18nContext } from './i18nContextDef';

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setCurrentLanguage] = useState<Language>(getCurrentLanguage());
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let active = true;
    initializeLanguage().then((initializedLanguage) => {
      if (!active) return;
      setCurrentLanguage(initializedLanguage);
      setIsReady(true);
    });
    return () => {
      active = false;
    };
  }, []);

  const changeLanguage = useCallback(async (nextLanguage: string) => {
    const loadedLanguage = await setLanguage(nextLanguage);
    setCurrentLanguage(loadedLanguage);
  }, []);

  const i18n = useCallback(
    (key: string, fallback?: string) => translate(key, fallback),
    [],
  );

  const value = useMemo<I18nContextValue>(() => ({
    language,
    changeLanguage,
    i18n,
    isReady,
  }), [changeLanguage, i18n, isReady, language]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
