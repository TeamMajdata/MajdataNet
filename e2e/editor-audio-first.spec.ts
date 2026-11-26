import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

/**
 * 改了 First 之后，打击音也要跟着走。
 *
 * 以前 Transport 的 `events` 只在加载音频时建一次，编辑器的热替换只更新画面：
 * 音符挪了位置，但已经排进音频线程的 answer / judge 还在旧时间点上，听起来就是
 * 「画面按新 first、声音还按旧 first」。这里用 `?perf=1` 暴露的 __majviewDebug 读时间表。
 */
const chart = ['&title=Audio first fixture', '&artist=E2E', '&first=4.11', '&des=someone', '', '&lv_5=13+', '&inote_5=(120){4}1,2,3,4', ''].join('\n');

async function answerTimes(page: Page) {
  return page.evaluate(() => {
    const debug = (window as unknown as { __majviewDebug?: { transport: { events: { name: string; time: number }[] } | null } }).__majviewDebug;
    return debug?.transport?.events.filter((event) => event.name === 'answer').map((event) => event.time) ?? [];
  });
}

test('desktop: changing First moves the note sounds, not just the picture', async ({ page }) => {
  await page.addInitScript(({ chart }) => {
    localStorage.setItem('languageChoice', 'zh');
    (window as unknown as { showDirectoryPicker?: unknown }).showDirectoryPicker = async () => ({
      name: 'audio-fixture',
      async getFileHandle(name: string) {
        if (name === 'maidata.txt') {
          return {
            name,
            getFile: async () => new File([chart], name, { type: 'text/plain' }),
            createWritable: async () => ({ write: async () => {}, close: async () => {} }),
          };
        }
        if (name === 'track.mp3') {
          const track = await fetch('/majview/skin/clock.mp3').then((response) => response.blob());
          return {
            name,
            getFile: async () => new File([track], name, { type: 'audio/mpeg' }),
            createWritable: async () => ({ write: async () => {}, close: async () => {} }),
          };
        }
        throw new DOMException(`missing ${name}`, 'NotFoundError');
      },
    });
  }, { chart });

  await page.goto('/editor?perf=1');
  await page.getByRole('button', { name: '打开文件夹' }).click();
  await expect(page.locator('.editor-stage')).toBeVisible();

  const play = page.locator('.editor-playback button').nth(1);
  await play.click();
  await page.waitForFunction(() => Boolean((window as unknown as { __majviewDebug?: { transport: unknown } }).__majviewDebug?.transport));

  const first = page.locator('.editor-field', { hasText: 'First' }).locator('input');
  const rounded = async () => (await answerTimes(page)).map((time) => Math.round(time * 100) / 100);
  await expect.poll(async () => (await rounded()).length).toBeGreaterThan(0);

  // 谱面自带 &first=4.11：第一个 answer 应该落在 4.11
  const before = await rounded();
  expect(before[0]).toBe(4.11);

  // 滚轮 / 直接输入：First 4.11 → 6.11，音符整体晚 2 秒，打击音也要跟着晚 2 秒
  await first.fill('6.11');
  const shifted = before.map((time) => Math.round((time + 2) * 100) / 100);
  await expect.poll(rounded).toEqual(shifted);

  // 重新排音不能把播放停掉，也不能跳回开头
  const state = await page.evaluate(() => {
    const transport = (window as unknown as { __majviewDebug?: { transport: { playing: boolean; time: number } | null } }).__majviewDebug?.transport;
    return { playing: transport?.playing ?? false, time: transport?.time ?? 0 };
  });
  expect(state.playing).toBe(true);
  expect(state.time).toBeGreaterThan(0);
});
