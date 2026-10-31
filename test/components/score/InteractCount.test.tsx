import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { SWRConfig } from 'swr';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import InteractCount from '@/components/score/InteractCount';
import InteractSummaryProvider from '@/components/song/InteractSummaryProvider';

vi.mock('@/hooks', async () => ({
  ...(await vi.importActual<typeof import('@/hooks')>('@/hooks')),
  useI18n: () => ({ i18n: (_key: string, fallback?: string) => fallback ?? _key, language: 'en', isReady: true }),
}));
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const summary = (chartId: string, score: number, comments: number, plays = 10) => ({
  chartId, plays, score, upvotes: score, downvotes: 0, comments, myVote: 0,
});

describe('InteractCount', () => {
  let container: HTMLDivElement;
  let root: Root;
  let fetchMock: ReturnType<typeof vi.fn<typeof fetch>>;
  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    fetchMock = vi.fn<typeof fetch>();
    vi.stubGlobal('fetch', fetchMock);
  });
  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  });
  async function render(children: ReactNode) {
    await act(async () => root.render(
      <SWRConfig value={{ provider: () => new Map(), shouldRetryOnError: false, dedupingInterval: 0 }}>{children}</SWRConfig>,
    ));
  }

  it('reads every card of a list from one batch request', async () => {
    fetchMock.mockResolvedValue(Response.json([summary('a', 7, 2, 1500), summary('b', 0, 0)]));
    await render(
      <InteractSummaryProvider ids={['a', 'b', 'c']}>
        <InteractCount songid="a" />
        <InteractCount songid="b" />
        <InteractCount songid="c" />
      </InteractSummaryProvider>,
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api3/api/maichart/interactsum');
    expect(init?.method).toBe('POST');
    expect(JSON.parse(String(init?.body))).toEqual(['a', 'b', 'c']);
    const cells = container.querySelectorAll('span[title]');
    expect([...cells].map((cell) => cell.textContent)).toEqual(['1.5K', '7', '2', '10', '0', '0']);
    // 批量结果里没有的谱面（例如已删除）不显示计数
    expect(container.children).toHaveLength(3);
    expect(container.children[2].textContent).toBe('');
  });

  it('falls back to a single request outside a list', async () => {
    fetchMock.mockResolvedValue(Response.json(summary('solo', -3, 12)));
    await render(<InteractCount songid="solo" />);
    expect(fetchMock.mock.calls[0][0]).toBe('/api3/api/maichart/solo/interactsum');
    expect(container.textContent).toContain('-3');
    expect(container.textContent).toContain('12');
  });
});
