import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { SWRConfig } from 'swr';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import CollectionPage from '@/pages/collection/CollectionPage';
import { endpoints } from '@/config/api';
import i18n from '@/i18n';
import type { Song } from '@/types';

vi.mock('@/hooks', () => ({ useUserContext: () => ({ username: 'alice' }) }));
vi.mock('@/components', () => ({
  PageLayout: ({ children }: { children: ReactNode }) => <main>{children}</main>,
  SongCard: ({ song }: { song: Song }) => <span data-song={song.id}>{song.title}</span>,
  LoadingSpinner: () => null,
}));
vi.mock('@/components/collection/CollectionSubscribeButton', () => ({ default: () => null }));
vi.mock('react-toastify', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const collectionId = '69f3ace2bb1f42b84457a4f9';
const song = (id: string, hash = `hash-${id}`) => ({ id, hash, title: id, artist: '', uploader: 'alice', designer: '', levels: [] });
// 歌单只列谱面 Id；chart-gone 已被删除，info 接口不会返回它
let collection = {
  id: collectionId, name: 'List', createdBy: 'alice', description: '', count: 4, visibility: 0,
  items: ['chart-1', 'chart-2', 'chart-gone', 'chart-3'],
};
const info = (id: string) => ({ metadata: song(id), levelHashes: [], resources: {} });
// 搜索结果不带 hash 也能直接添加，不需要再请求 summary
const searchResults = [song('chart-4', ''), song('chart-5', '')];

describe('collection management', () => {
  let container: HTMLDivElement;
  let root: Root;
  let fetchMock: ReturnType<typeof vi.fn<typeof fetch>>;
  beforeEach(() => {
    collection = { ...collection, count: 4, items: ['chart-1', 'chart-2', 'chart-gone', 'chart-3'] };
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    fetchMock = vi.fn<typeof fetch>(async (input, init) => {
      const url = String(input);
      if (url === endpoints.collection.songlist(collectionId)) return Response.json(collection);
      if (url === endpoints.maichart.info) {
        // 故意打乱响应顺序，页面应按 items 的顺序显示
        const ids: string[] = JSON.parse(String(init?.body));
        return Response.json(ids.filter((id) => id !== 'chart-gone').reverse().map(info));
      }
      if (url.startsWith(endpoints.maichart.listSearchAndSort('chart'))) return Response.json(searchResults);
      return new Response(null, { status: 200 });
    });
    vi.stubGlobal('fetch', fetchMock);
  });
  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  });

  const buttonByText = (text: string) =>
    Array.from(container.querySelectorAll('button')).find((b) => b.textContent === text)!;
  const cardButton = (id: string) =>
    container.querySelector(`[data-song="${id}"]`)!.parentElement!.querySelector('button')!;
  const click = (button: HTMLButtonElement) => act(async () => button.click());

  async function renderPage() {
    await act(async () => root.render(
      <SWRConfig value={{ provider: () => new Map(), shouldRetryOnError: false }}>
        <MemoryRouter initialEntries={[`/collection?id=${collectionId}`]}><CollectionPage /></MemoryRouter>
      </SWRConfig>,
    ));
  }
  const shownIds = () => Array.from(container.querySelectorAll('[data-song]')).map((e) => e.getAttribute('data-song'));
  const infoCalls = () => fetchMock.mock.calls.filter(([url]) => url === endpoints.maichart.info);

  async function startManagingAndSearch() {
    await renderPage();
    await click(buttonByText(i18n.t('collection/CollectionPage.Manage')));
    const input = container.querySelector<HTMLInputElement>(`input[placeholder="${i18n.t('collection/CollectionPage.SearchToAdd')}"]`)!;
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, 'chart');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect(container.querySelector('[data-song="chart-5"]')).not.toBeNull();
  }

  async function submittedItems() {
    await click(buttonByText(i18n.t('collection/CollectionPage.Submit')));
    const call = fetchMock.mock.calls.find(([url]) => url === endpoints.collection.modify(collectionId));
    expect(call?.[1]?.method).toBe('PUT');
    expect(fetchMock.mock.calls.some(([url]) => String(url).endsWith('/summary'))).toBe(false);
    return JSON.parse(String(call![1]!.body)).items;
  }

  it('loads chart metadata with one batch request and shows charts in collection order', async () => {
    await renderPage();
    expect(infoCalls()).toHaveLength(1);
    expect(infoCalls()[0][1]?.method).toBe('POST');
    expect(JSON.parse(String(infoCalls()[0][1]?.body))).toEqual(['chart-1', 'chart-2', 'chart-gone', 'chart-3']);
    expect(shownIds()).toEqual(['chart-1', 'chart-2', 'chart-3']);
    expect(fetchMock.mock.calls.some(([url]) => String(url).endsWith('/summary'))).toBe(false);
  });

  it('sends no metadata request for an empty collection', async () => {
    collection = { ...collection, count: 0, items: [] };
    await renderPage();
    expect(infoCalls()).toHaveLength(0);
    expect(container.textContent).toContain(i18n.t('collection/CollectionPage.EmptyCollection'));
  });

  it('submits chart IDs: kept originals in order, then additions in the order added', async () => {
    await startManagingAndSearch();
    await click(cardButton('chart-2'));
    await click(cardButton('chart-5'));
    await click(cardButton('chart-4'));
    expect(await submittedItems()).toEqual(['chart-1', 'chart-gone', 'chart-3', 'chart-5', 'chart-4']);
  });

  it('drops an addition that is removed again before submitting', async () => {
    await startManagingAndSearch();
    await click(cardButton('chart-5'));
    await click(cardButton('chart-4'));
    await click(cardButton('chart-5'));
    expect(await submittedItems()).toEqual(['chart-1', 'chart-2', 'chart-gone', 'chart-3', 'chart-4']);
  });
});
