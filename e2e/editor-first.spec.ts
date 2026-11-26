import { expect, test } from '@playwright/test';

/**
 * 编辑器中栏的 First 输入框：
 * 1. 打开谱面时必须显示文件里的 `&first`（以前是不受控的 defaultValue，停在挂载时的 0）；
 * 2. 改完的值要写回 `&first`，清空输入框不能被当成 0。
 *
 * File System Access API 在测试里没法点系统选择器，用 showDirectoryPicker 的桩喂两份谱面。
 */
const chartA = ['&title=First fixture', '&artist=E2E', '&first=4.11', '&des=someone', '', '&lv_5=13+', '&inote_5=(120){4}1,2,3,4', ''].join('\n');
const chartB = ['&title=Second fixture', '&artist=E2E', '&first=1.5', '&des=someone', '', '&lv_5=12+', '&inote_5=(120){4}1,2,3,4', ''].join('\n');

test.use({ serviceWorkers: 'block' });

test('desktop: the First field follows the opened chart and writes back', async ({ page }) => {
  await page.addInitScript(
    ({ charts }) => {
      localStorage.setItem('languageChoice', 'zh');
      let call = 0;
      const windows = window as unknown as { showDirectoryPicker?: unknown };
      windows.showDirectoryPicker = async () => {
        const chart = charts[Math.min(call, charts.length - 1)];
        call += 1;
        return {
          name: `fixture-${call}`,
          async getFileHandle(name: string) {
            if (name !== 'maidata.txt') throw new DOMException(`missing ${name}`, 'NotFoundError');
            return {
              name,
              getFile: async () => new File([chart], name, { type: 'text/plain' }),
              // 「保存」写回，测试里只记录，不落盘
              createWritable: async () => ({ write: async () => {}, close: async () => {} }),
            };
          },
        };
      };
    },
    { charts: [chartA, chartB] },
  );

  await page.goto('/editor');
  await page.getByRole('button', { name: '打开文件夹' }).click();

  const first = page.locator('.editor-field', { hasText: 'First' }).locator('input');
  await expect(first).toHaveValue('4.11');
  await expect(page.locator('.editor-save')).toHaveText('已保存');

  // 改值写回 &first：脏标记出现
  await first.fill('10');
  await expect(first).toHaveValue('10');
  await expect(page.locator('.editor-save')).toHaveText('未保存');

  // 逐字输入小数：数字输入框在输入「4.」时中间态是空值，不能被吞掉
  await first.fill('');
  await first.pressSequentially('4.15');
  await expect(first).toHaveValue('4.15');

  // 清空输入框不写入 0；失焦后回到文件里的值
  await first.fill('');
  await first.blur();
  await expect(first).toHaveValue('4.15');

  // 再打开另一份谱面（有未保存改动，先选“不保存”），First 要换成新谱面的值
  await page.locator('.editor-menubar').getByRole('button', { name: '文件' }).click();
  await page.locator('.editor-menubar').getByRole('button', { name: '打开文件夹' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: '不保存' }).click();
  await expect(first).toHaveValue('1.5');
});
