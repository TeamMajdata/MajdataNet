import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

/**
 * 顶栏在 en/ja 下曾经被导航撑破（导航压到右侧搜索/语言/账号上）。
 * 根因：顶栏容器封顶 80rem，导航项不收缩，en/ja 的文案又比中文长。
 * 修复：把「文档」收进「工具」、缩短 ja 文案，并让导航项可以收缩（超长时省略号）。
 * 这些断言盯的是「导航右边缘不能越过右侧控件」，任何语言、任何窗口宽度都一样。
 */
const LANGUAGES = ['zh', 'en', 'ja', 'ko'] as const;

async function openHeader(page: Page, language: string, width: number) {
  await page.setViewportSize({ width, height: 900 });
  await page.addInitScript((lang) => {
    localStorage.setItem('languageChoice', lang);
  }, language);
  // 顶栏不依赖数据，但别让首页去真的打后端
  await page.route('**/api3/**', (route) => route.fulfill({ status: 401, body: '' }));
  await page.goto('/');
  // 未登录时右侧是「登录 / 注册」，等它出现说明用户资料请求已经落地，量到的是最终宽度
  await expect(page.locator('header a[href="/login"]')).toBeVisible();
}

async function measureHeader(page: Page) {
  return page.evaluate(() => {
    const header = document.querySelector('header')!;
    const inner = header.firstElementChild as HTMLElement;
    const list = header.querySelector('nav ul') as HTMLElement;
    const right = inner.lastElementChild as HTMLElement;
    const items = [...list.children].map((item) => {
      const label = item.querySelector('a > span, button > span') as HTMLElement | null;
      return { text: label?.textContent ?? '', truncated: label ? label.scrollWidth > label.clientWidth + 1 : false };
    });
    return {
      gap: Math.round(right.getBoundingClientRect().left - list.getBoundingClientRect().right),
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      items,
    };
  });
}

for (const language of LANGUAGES) {
  for (const width of [1280, 1920]) {
    test(`desktop: ${language} header keeps clear of the controls at ${width}px`, async ({ page }) => {
      await openHeader(page, language, width);
      const { gap, overflow, items } = await measureHeader(page);

      // 5 个主导航项：文档已经收进「工具」下拉
      expect(items).toHaveLength(5);
      expect(items.some((item) => item.truncated)).toBe(false);
      expect(gap).toBeGreaterThan(0);
      expect(overflow).toBe(0);
    });
  }
}

test('mobile: the hamburger menu lists every entry including the tools children', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('languageChoice', 'ja');
  });
  await page.route('**/api3/**', (route) => route.fulfill({ status: 401, body: '' }));
  await page.goto('/');

  await page.locator('[data-navigation-toggle]').click();
  const tree = page.locator('nav ul').first();
  await expect(tree.locator('> li')).toHaveCount(5);

  await page.locator('[data-navigation-group="tools"]').click();
  await expect(tree.getByRole('link', { name: 'ドキュメント' })).toBeVisible();
  await expect(tree.getByRole('link', { name: 'ヘビープレイヤー' })).toBeVisible();
});
