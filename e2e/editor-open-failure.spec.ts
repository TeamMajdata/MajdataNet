import { expect, test } from '@playwright/test';

/**
 * 打开文件夹失败时必须有反馈。
 *
 * 以前 `pickDirectory()` 把「用户取消」和「浏览器拒绝」都吞成 null，边界情况（权限被拒、
 * 已经有一个选择器开着、句柄失效）看起来就是「点了没反应」。
 * 现在：取消保持安静，其他失败要在空状态 / 判定盘上显示原因。
 */
const chart = ['&title=Open failure fixture', '&artist=E2E', '&first=4.11', '&des=someone', '', '&lv_5=13+', '&inote_5=(120){4}1,2,3,4', ''].join('\n');

const setPicker = (page: import('@playwright/test').Page, mode: 'throw' | 'open', name = 'Denied') =>
  page.addInitScript(
    ({ mode, name, chart }) => {
      localStorage.setItem('languageChoice', 'zh');
      const picker = async () => {
        if (mode === 'throw') {
          const error = name === 'AbortError'
            ? new DOMException('the user aborted a request', 'AbortError')
            : new DOMException('The request is not allowed by the user agent or the platform in the current context.', 'NotAllowedError');
          throw error;
        }
        return {
          name: 'fixture',
          async getFileHandle(file: string) {
            if (file !== 'maidata.txt') throw new DOMException(`missing ${file}`, 'NotFoundError');
            return {
              name: file,
              getFile: async () => new File([chart], file, { type: 'text/plain' }),
              createWritable: async () => ({ write: async () => {}, close: async () => {} }),
            };
          },
        };
      };
      (window as unknown as { showDirectoryPicker?: unknown }).showDirectoryPicker = picker;
    },
    { mode, name, chart },
  );

test('desktop: a rejected directory picker shows why instead of doing nothing', async ({ page }) => {
  await setPicker(page, 'throw');
  await page.goto('/editor');
  await page.getByRole('button', { name: '打开文件夹' }).click();

  const alert = page.locator('.editor-empty [role="alert"]');
  await expect(alert).toBeVisible();
  await expect(alert).toContainText('打开文件夹失败');
  await expect(alert).toContainText('not allowed');
  // 还停在空状态，按钮恢复可点（没有卡在「打开中…」）
  await expect(page.getByRole('button', { name: '打开文件夹' })).toBeEnabled();
});

test('desktop: cancelling the picker stays quiet', async ({ page }) => {
  await setPicker(page, 'throw', 'AbortError');
  await page.goto('/editor');
  await page.getByRole('button', { name: '打开文件夹' }).click();

  await expect(page.getByRole('button', { name: '打开文件夹' })).toBeEnabled();
  await expect(page.locator('.editor-empty')).toBeVisible();
  await expect(page.locator('[role="alert"]')).toHaveCount(0);
});

test('desktop: failing to switch charts keeps the current chart and shows the reason', async ({ page }) => {
  await setPicker(page, 'open');
  await page.goto('/editor');
  await page.getByRole('button', { name: '打开文件夹' }).click();
  await expect(page.locator('.editor-stage')).toBeVisible();

  // 第二次打开失败：浮层提示，谱面还在
  await page.evaluate(() => {
    (window as unknown as { showDirectoryPicker?: unknown }).showDirectoryPicker = async () => {
      throw new DOMException('blocked by policy', 'SecurityError');
    };
  });
  await page.locator('.editor-menubar').getByRole('button', { name: '文件' }).click();
  await page.locator('.editor-menubar').getByRole('button', { name: '打开文件夹' }).click();

  const overlay = page.locator('.editor-error-overlay');
  await expect(overlay).toBeVisible();
  await expect(overlay).toContainText('打开文件夹失败');
  await expect(overlay).toContainText('blocked by policy');
  await expect(page.locator('.editor-stage')).toBeVisible();
  await expect(page.locator('.editor-field', { hasText: 'First' }).locator('input')).toHaveValue('4.11');
});
