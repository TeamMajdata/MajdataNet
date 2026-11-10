import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { SWRConfig } from 'swr';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import UserRating from '@/components/user/UserRating';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const featureOrder = ['note', 'peak', 'sweep', 'slide_tricky', 'slide_sequence', 'jack', 'fitted_constant'];

function rating() {
  return {
    featureOrder,
    feature: { note: 100.2, peak: 90.1, sweep: 80.3, slide_tricky: 70.4, slide_sequence: 60.5, jack: 50.6, fitted_constant: 13.5 },
    charts: ['chart-a'],
    best: [{
      acc: { dx: 100.5123, classic: 99.1 },
      dxScore: 1200,
      comboState: 2,
      chartLevel: 4,
      hash: 'chart-hash',
      levelHash: 'a'.repeat(64),
      chartInfo: {
        id: 'chart-a', title: 'Song A', artist: 'Artist A', designer: 'Designer A', description: '',
        levels: ['', '', '', '', '14+', '', ''], uploader: 'uploader', timestamp: '2026-01-01',
        hash: 'chart-hash', tags: [], publicTags: [],
      },
      timestamp: '2026-01-01T00:00:00Z',
    }],
    scoreCount: 1,
    chartCount: 1,
  };
}

const jsonResponse = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status });

describe('rating on the profile page', () => {
  let container: HTMLDivElement;
  let root: Root;
  let fetchMock: ReturnType<typeof vi.fn<typeof fetch>>;
  let cache: Map<string, unknown>;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    cache = new Map();
    fetchMock = vi.fn<typeof fetch>();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  });

  async function render(children: ReactNode = <UserRating username="bbben" />) {
    await act(async () => root.render(
      <SWRConfig value={{ provider: () => cache }}>
        <MemoryRouter initialEntries={['/space?id=bbben']}>{children}</MemoryRouter>
      </SWRConfig>,
    ));
  }

  it('draws the radar and lists the averaged chart levels', async () => {
    fetchMock.mockResolvedValue(jsonResponse(rating()));
    await render();

    expect(fetchMock).toHaveBeenCalledWith('/api3/api/maiscore/rating/by-username/bbben', expect.anything());
    expect(container.querySelector('svg')?.textContent).toContain('拟合定数');
    expect(container.textContent).toContain('1 张谱面参与计算');
    expect(container.textContent).toContain('Best 50');
    expect(container.textContent).toContain('Song A');
    expect(container.textContent).toContain('14+');
    expect(container.textContent).toContain('100.5123');
  });

  it('shows an empty notice when no chart could be averaged', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ ...rating(), feature: {}, charts: [], best: [], scoreCount: 0, chartCount: 0 }));
    await render();

    expect(container.textContent).toContain('还没有可用于计算 rating 的成绩');
  });

  it('reports a failed rating and retries on demand', async () => {
    fetchMock.mockResolvedValue(jsonResponse({}, 500));
    await render();

    expect(container.textContent).toContain('Rating 加载失败');
    const retry = Array.from(container.querySelectorAll('button')).find(button => button.textContent === '重试')!;
    fetchMock.mockResolvedValue(jsonResponse(rating()));
    await act(async () => retry.click());
    expect(container.textContent).toContain('Song A');
  });
});