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
const collection = {
  id: collectionId, name: 'List', createdBy: 'alice', description: '', count: 3, visibility: 0,
  items: [song('chart-1'), song('chart-2'), song('chart-3')],
};
// 搜索结果不带 hash 也能直接添加，不需要再请求 summary
const searchResults = [song('chart-4', ''), song('chart-5', '')];

describe('collection management', () => {
  let container: HTMLDivElement;
  let root: Root;
  let fetchMock: ReturnType<typeof vi.fn<typeof fetch>>;
  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    fetchMock = vi.fn<typeof fetch>(async (input) => {
      const url = String(input);
      if (url === endpoints.collection.songlist(collectionId)) return Response.json(collection);
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

  async function startManagingAndSearch() {
    await act(async () => root.render(
      <SWRConfig value={{ provider: () => new Map(), shouldRetryOnError: false }}>
        <MemoryRouter initialEntries={[`/collection?id=${collectionId}`]}><CollectionPage /></MemoryRouter>
      </SWRConfig>,
    ));
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
    expect(call?.[1]?.method).toBe('POST');
    expect(fetchMock.mock.calls.some(([url]) => String(url).endsWith('/summary'))).toBe(false);
    return JSON.parse(String(call![1]!.body)).items;
  }

  it('submits chart IDs: kept originals in order, then additions in the order added', async () => {
    await startManagingAndSearch();
    await click(cardButton('chart-2'));
    await click(cardButton('chart-5'));
    await click(cardButton('chart-4'));
    expect(await submittedItems()).toEqual(['chart-1', 'chart-3', 'chart-5', 'chart-4']);
  });

  it('drops an addition that is removed again before submitting', async () => {
    await startManagingAndSearch();
    await click(cardButton('chart-5'));
    await click(cardButton('chart-4'));
    await click(cardButton('chart-5'));
    expect(await submittedItems()).toEqual(['chart-1', 'chart-2', 'chart-3', 'chart-4']);
  });
});
