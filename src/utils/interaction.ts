import type { Language } from '@/types';

const INTL_LOCALES: Record<Language, string> = { en: 'en', zh: 'zh-CN', ja: 'ja', ko: 'ko' };

/** Intl 所用的区域标识。 */
export function intlLocale(language: Language): string {
  return INTL_LOCALES[language] ?? 'en';
}

/** 紧凑数字：1234 → 1.2K，按当前语言格式化。 */
export function compactNumber(value: number, language: Language): string {
  return new Intl.NumberFormat(intlLocale(language), {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}

/** 登录页地址；登录后回到当前页面。 */
export function loginPath(location: { pathname: string; search: string; hash: string }): string {
  return `/login?redirect=${encodeURIComponent(location.pathname + location.search + location.hash)}`;
}
