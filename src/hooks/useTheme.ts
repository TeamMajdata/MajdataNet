/**
 * 使用主题的 Hook
 */
import { useContext } from 'react';
import { ThemeContext } from '@/contexts/themeContextDef';
import type { ThemeContextValue } from '@/contexts/themeContextDef';

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}
