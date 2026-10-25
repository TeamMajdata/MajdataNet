import { useContext } from 'react';
import { I18nContext } from '@/contexts/i18nContextDef';
import type { I18nContextValue } from '@/types/i18n';

/** 使用由 I18nProvider 管理的唯一 i18n 状态。 */
export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within I18nProvider');
  }
  return context;
}
