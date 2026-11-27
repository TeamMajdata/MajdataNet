import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter, useSearchParams } from 'react-router-dom';
import { SWRConfig } from 'swr';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import UploadedCharts from '@/components/user/UploadedCharts';
import { endpoints } from '@/config/api';
import i18n from '@/i18n';
import type { Song } from '@/types';

// 只关心排序参数有没有进到列表接口；卡片和互动计数用轻量替身
vi.mock('@/components/song/SongCard', () => ({
  default: ({ song }: { song: Song }) => <span data-song={song.id}>{song.title}</span>,
}));
vi.mock('@/components/song/InteractSummaryProvider', () => ({
  default: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const song = (id: string): Song => ({
  id, hash: `hash-${id}`, title: id, artist: '', uploader: 'alice', designer: '', levels: [],
});

/** 把当前网址参数暴露给断言：MemoryRouter 不会改 window.location */
function UrlProbe() {
  const [params] = useSearchParams();
  return <span data-params={params.toString()} />;
}

describe('uploaded charts sorting', () => {
  let container: HTMLDivElement;
  let root: Root;
  let fetchMock: ReturnType<typeof vi.fn<typeof fetch>>;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    fetchMock = vi.fn<typeof fetch>(async () => Response.json([song('a'), song('b')]));
    vi.stubGlobal('fetch', fetchMock);
  });
  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  });

  async function render() {
    await act(async () => root.render(
      <SWRConfig value={{ provider: () => new Map(), shouldRetryOnError: false }}>
        <MemoryRouter initialEntries={['/space?id=alice&tab=uploaded']}>
          <UploadedCharts username="alice" onDataLoaded={() => {}} />
          <UrlProbe />
        </MemoryRouter>
      </SWRConfig>,
    ));
    for (let i = 0; i < 3; i += 1) {
      await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });
    }
  }

  const listCalls = () => fetchMock.mock.calls
    .map(([input]) => String(input))
    .filter((url) => url.includes('/maichart/list'));

  it('adds the picked sort to the list request and the URL, like the search page', async () => {
    await render();
    expect(listCalls()).toContain(endpoints.maichart.listSearchAndSort('uploader:alice', '', 0));

    await act(async () => container.querySelector<HTMLButtonElement>('button[aria-haspopup="menu"]')!.click());
    const uploadDate = Array.from(document.querySelectorAll<HTMLButtonElement>('[role="menuitemradio"]'))
      .find((button) => button.textContent === i18n.t('home/HomePage.UploadDate'))!;
    await act(async () => uploadDate.click());
    for (let i = 0; i < 3; i += 1) {
      await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });
    }

    expect(listCalls()).toContain(endpoints.maichart.listSearchAndSort('uploader:alice', 'timep', 0));
    expect(container.querySelector('[data-params]')!.getAttribute('data-params')).toContain('sort=5');
  });
});
