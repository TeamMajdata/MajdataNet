import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { chooseDownloadFormat } from '@/utils/downloadFormat';
import '@/i18n';

const testGlobals = globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean };

describe('chooseDownloadFormat', () => {
  beforeEach(() => {
    testGlobals.IS_REACT_ACT_ENVIRONMENT = true;
    localStorage.clear();
  });

  afterEach(async () => {
    // 弹窗播完关闭动画（约 150ms）后才卸载，等它结束再清理，避免和下一个用例重叠
    await act(async () => new Promise((resolve) => setTimeout(resolve, 400)));
    document.body.innerHTML = '';
  });

  // 返回包在对象里，否则 async 函数会一直等用户选择
  async function open(title = 'Song') {
    let result!: Promise<string | null>;
    await act(async () => {
      result = chooseDownloadFormat(title);
    });
    return { result };
  }

  const option = (format: string) => document.querySelector<HTMLButtonElement>(`[data-format="${format}"]`)!;

  it('asks before downloading and remembers the picked format', async () => {
    const { result } = await open('Some Title');
    expect(document.querySelector('[role="dialog"]')?.textContent).toContain('Some Title');
    expect(document.activeElement).toBe(option('zip'));
    await act(async () => option('adx').click());
    await expect(result).resolves.toBe('adx');
    expect(localStorage.getItem('DownloadType')).toBe('adx');
  });

  it('focuses and marks the last used format', async () => {
    localStorage.setItem('DownloadType', 'adx');
    const { result } = await open();
    expect(document.activeElement).toBe(option('adx'));
    expect(option('adx').textContent).toContain('上次使用');
    expect(option('zip').textContent).not.toContain('上次使用');
    await act(async () => option('zip').click());
    await expect(result).resolves.toBe('zip');
  });

  it('resolves null when cancelled with Escape and keeps the saved format', async () => {
    localStorage.setItem('DownloadType', 'zip');
    const { result } = await open();
    await act(async () => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })));
    await expect(result).resolves.toBeNull();
    expect(localStorage.getItem('DownloadType')).toBe('zip');
  });
});
