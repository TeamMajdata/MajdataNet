/**
 * Theme Provider - 全局亮/暗主题管理
 * - 默认跟随系统 prefers-color-scheme
 * - 手动切换后持久化到 localStorage（theme-mode / theme-follow-system）
 * - 通过 html.dark 类切换暗色主题（配合 index.css 的 .dark token 覆盖）
 */
import { useCallback, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { ThemeContext } from './themeContextDef';
import type { ThemeContextValue, ThemeMode } from './themeContextDef';

const THEME_MODE_KEY = 'theme-mode';
const THEME_FOLLOW_KEY = 'theme-follow-system';

function getSystemTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function getInitialTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'light';
  const stored = window.localStorage.getItem(THEME_MODE_KEY);
  if (stored === 'light' || stored === 'dark') return stored;
  return getSystemTheme();
}

function getInitialFollowSystem(): boolean {
  if (typeof window === 'undefined') return true;
  return window.localStorage.getItem(THEME_FOLLOW_KEY) !== 'false';
}

function applyThemeClass(theme: ThemeMode): void {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle('dark', theme === 'dark');
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<ThemeMode>(getInitialTheme);
  const [followSystem, setFollowSystem] = useState<boolean>(getInitialFollowSystem);

  // 应用主题类到 html 元素
  useEffect(() => {
    applyThemeClass(theme);
  }, [theme]);

  // 跟随系统时监听系统主题变化
  useEffect(() => {
    if (!followSystem) return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      const next = e.matches ? 'dark' : 'light';
      setTheme(next);
      window.localStorage.setItem(THEME_MODE_KEY, next);
    };
    mq.addEventListener('change', handleChange);
    return () => mq.removeEventListener('change', handleChange);
  }, [followSystem]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next: ThemeMode = prev === 'dark' ? 'light' : 'dark';
      window.localStorage.setItem(THEME_MODE_KEY, next);
      return next;
    });
    setFollowSystem(false);
    window.localStorage.setItem(THEME_FOLLOW_KEY, 'false');
  }, []);

  const setFollow = useCallback((follow: boolean) => {
    setFollowSystem(follow);
    window.localStorage.setItem(THEME_FOLLOW_KEY, String(follow));
    if (follow) {
      const next = getSystemTheme();
      setTheme(next);
      window.localStorage.setItem(THEME_MODE_KEY, next);
    }
  }, []);

  const value: ThemeContextValue = {
    theme,
    toggleTheme,
    followSystem,
    setFollowSystem: setFollow,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
