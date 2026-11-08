import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { SWRConfig } from 'swr';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import TagManageWidget from '@/components/ui/TagManageWidget';
import i18n from '@/i18n';
import { TooltipProvider } from '@/components/ui/Tooltip';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const toastMock = vi.hoisted(() => ({
  loading: vi.fn(() => 'toast-id'), done: vi.fn(), error: vi.fn(), success: vi.fn(),
}));
vi.mock('react-toastify', () => ({ toast: toastMock }));
// The song page reloads a second after saving; never let that reach jsdom.
vi.mock('@/utils/sleep', () => ({ default: () => new Promise<void>(() => {}) }));

describe('TagManageWidget', () => {
  let container: HTMLDivElement;
  let root: Root;
  let fetchMock: ReturnType<typeof vi.fn<typeof fetch>>;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    fetchMock = vi.fn<typeof fetch>();
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} unobserve() {} });
    Object.values(toastMock).forEach((fn) => fn.mockClear());
  });
  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
    window.history.replaceState(null, '', '/');
  });

  async function open(path: string, summary: { tags?: string[]; publicTags?: string[] }) {
    window.history.replaceState(null, '', path);
    fetchMock.mockResolvedValueOnce(Response.json(summary));
    await act(async () => root.render(
      <SWRConfig value={{ provider: () => new Map() }}><TooltipProvider><TagManageWidget songid="c1" /></TooltipProvider></SWRConfig>,
    ));
    await act(async () => (container.querySelector('svg')!.parentElement as HTMLElement).click());
  }
  const shownTags = () => {
    const label = [...document.body.querySelectorAll('div')].find((div) => div.textContent === 'Tags:')!;
    return [...label.nextElementSibling!.querySelectorAll('span')].map((span) => span.textContent);
  };
  const clickText = async (text: string) => {
    const element = [...document.body.querySelectorAll<HTMLElement>('span, button')].find((el) => el.textContent === text)!;
    await act(async () => element.click());
  };
  const saveRequest = () => {
    const [url, init] = fetchMock.mock.calls[1];
    return { url: String(url), method: init?.method, body: JSON.parse(String(init?.body)) };
  };

  it('sends public tag edits as a PATCH and shows the tags the server returns', async () => {
    await open('/song', { publicTags: ['A', 'B'] });
    await clickText('A');
    await clickText('POPS');
    expect(shownTags()).toEqual(['B', 'POPS']);
    fetchMock.mockResolvedValueOnce(Response.json(['B', 'Other', 'POPS']));
    await clickText('更新Tags');

    expect(saveRequest()).toEqual({ url: '/api3/api/maichart/c1/publictags', method: 'PATCH', body: { add: ['POPS'], remove: ['A'] } });
    expect(shownTags()).toEqual(['B', 'Other', 'POPS']);
    expect(toastMock.success).toHaveBeenCalledOnce();
  });

  it('replaces private tags with a PUT of the whole list', async () => {
    await open('/user/charts', { tags: ['x'] });
    await act(async () => {
      const input = document.body.querySelector<HTMLInputElement>('input[type="text"]')!;
      const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
      setValue.call(input, ' y ');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await clickText(i18n.t('shared/TagManageWidget.AddTag'));
    fetchMock.mockResolvedValueOnce(Response.json(['x', 'y']));
    await clickText('更新Tags');

    expect(saveRequest()).toEqual({ url: '/api3/api/maichart/c1/tags', method: 'PUT', body: ['x', 'y'] });
    expect(shownTags()).toEqual(['x', 'y']);
  });

  it('keeps the edit and reports the failure when saving is refused', async () => {
    await open('/song', { publicTags: ['A'] });
    await clickText('POPS');
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 401 }));
    await clickText('更新Tags');

    expect(toastMock.error).toHaveBeenCalledOnce();
    expect(toastMock.done).toHaveBeenCalledWith('toast-id');
    expect(toastMock.success).not.toHaveBeenCalled();
    expect(shownTags()).toEqual(['A', 'POPS']);
  });
});
