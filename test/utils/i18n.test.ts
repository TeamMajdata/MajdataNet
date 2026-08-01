import { beforeEach, describe, expect, it, vi } from 'vitest';

const dictionaries = {
  en: {
    'song/SongPage': {
      Download: 'Download',
    },
  },
  zh: {
    'song/SongPage': {
      Download: '下载',
    },
  },
};

describe('i18n', () => {
  beforeEach(() => {
    vi.resetModules();
    localStorage.clear();
    vi.stubGlobal('fetch', vi.fn(async (input: string | URL | Request) => {
      const language = String(input).match(/\/([a-z]{2})\.json$/)?.[1] as keyof typeof dictionaries;
      return new Response(JSON.stringify(dictionaries[language] ?? {}), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }));
  });

  it('resolves route/component.key values and switches languages', async () => {
    const { i18n, setLanguage } = await import('@/utils/i18n');

    await setLanguage('en-US');
    expect(i18n('song/SongPage.Download')).toBe('Download');

    await setLanguage('zh-CN');
    expect(i18n('song/SongPage.Download')).toBe('下载');
    expect(localStorage.getItem('language')).toBe('zh');
  });

  it('deduplicates concurrent language-file requests', async () => {
    const { setLanguage } = await import('@/utils/i18n');

    await Promise.all([setLanguage('en'), setLanguage('en')]);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('does not let a slower request overwrite the latest language', async () => {
    let releaseEnglish: (() => void) | undefined;
    vi.stubGlobal('fetch', vi.fn((input: string | URL | Request) => {
      const language = String(input).match(/\/([a-z]{2})\.json$/)?.[1] as keyof typeof dictionaries;
      const response = () => new Response(JSON.stringify(dictionaries[language]), { status: 200 });
      if (language !== 'en') return Promise.resolve(response());
      return new Promise<Response>((resolve) => {
        releaseEnglish = () => resolve(response());
      });
    }));

    const { getCurrentLanguage, i18n, setLanguage } = await import('@/utils/i18n');
    const englishRequest = setLanguage('en');
    await setLanguage('zh');
    releaseEnglish?.();
    await englishRequest;

    expect(getCurrentLanguage()).toBe('zh');
    expect(i18n('song/SongPage.Download')).toBe('下载');
  });

  it('returns the fallback for malformed or missing keys', async () => {
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { i18n, setLanguage } = await import('@/utils/i18n');
    await setLanguage('en');

    expect(i18n('Download', 'fallback')).toBe('fallback');
    expect(i18n('song/SongPage.Missing', 'fallback')).toBe('fallback');
    expect(warning).toHaveBeenCalledTimes(2);
  });
});
