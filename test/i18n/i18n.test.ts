import { afterAll, describe, expect, it } from 'vitest';
import i18n, { getCurrentLanguage, getLocale } from '@/i18n';

describe('i18n', () => {
  afterAll(() => i18n.changeLanguage('zh'));

  it('switches language, persists the choice and syncs <html lang>', async () => {
    await i18n.changeLanguage('ja');
    expect(getCurrentLanguage()).toBe('ja');
    expect(getLocale()).toBe('ja-JP');
    expect(localStorage.getItem('language')).toBe('ja');
    expect(document.documentElement.lang).toBe('ja');
  });

  it('interpolates values and picks the plural form for the language', async () => {
    await i18n.changeLanguage('en');
    expect(i18n.t('song/ScoreRanking.Records', { count: 1 })).toBe('1 record');
    expect(i18n.t('song/ScoreRanking.Records', { count: 3 })).toBe('3 records');
    expect(i18n.t('not-found/NotFoundPage.Redirect', { countdown: 5 })).toContain('5 seconds');

    await i18n.changeLanguage('zh');
    expect(i18n.t('song/ScoreRanking.Records', { count: 1 })).toBe('1 条记录');
  });

  it('normalizes regional and unsupported languages', async () => {
    await i18n.changeLanguage('ko-KR');
    expect(getCurrentLanguage()).toBe('ko');

    await i18n.changeLanguage('fr');
    expect(getCurrentLanguage()).toBe('en');
  });
});
