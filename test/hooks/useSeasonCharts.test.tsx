import { act, useEffect } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { SWRConfig } from 'swr';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useSeasonCharts, type SeasonChartsState } from '@/hooks/useSeasonCharts';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const collectionId = '69f3ace2bb1f42b84457a4f9';
const first = '3f2504e0-4f89-11d3-9a0c-0305e82c3301';
const second = '9b2e6c1a-0d4f-4e6b-8a7c-5f1e2d3c4b5a';
const summary = (id: string, hash = 'same-hash') => ({ id, title: `Song ${id}`, hash, levels: [null, '7', null, null, null, null, null] });

describe('useSeasonCharts', () => {
  let container: HTMLDivElement;
  let root: Root;
  let charts: SeasonChartsState | undefined;
  let fetchMock: ReturnType<typeof vi.fn<typeof fetch>>;

  function Probe() {
    const state = useSeasonCharts(collectionId);
    useEffect(() => { charts = state; }, [state]);
    return null;
  }

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    charts = undefined;
    fetchMock = vi.fn<typeof fetch>();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  });

  function serve(summaries: Record<string, () => Promise<Response>>) {
    fetchMock.mockImplementation(async input => {
      const url = String(input);
      if (url === `/api3/api/collection/${collectionId}/songlist`) {
        // 谱单顺序与 Id 字母序相反，GUID 大写也要规范化成小写
        return Response.json({ items: [{ id: second.toUpperCase() }, { id: first }] });
      }
      const id = /\/maichart\/([^/]+)\/summary$/.exec(url)?.[1];
      if (id && summaries[id]) return summaries[id]();
      throw new Error(`Unexpected request ${url}`);
    });
  }

  // 谱单和各谱面摘要依次经过请求队列，多等几轮让 SWR 完成
  async function flush() {
    for (let i = 0; i < 3; i += 1) {
      await act(async () => { await new Promise(resolve => setTimeout(resolve, 0)); });
    }
  }

  async function render() {
    await act(async () => root.render(
      <SWRConfig value={{ provider: () => new Map() }}><Probe /></SWRConfig>,
    ));
    await flush();
  }

  it('gives the collection chart IDs in pool order once every chart has loaded', async () => {
    // 两张谱面的 hash 相同也不影响：排行只按谱面 Id 查询
    serve({ [first]: async () => Response.json(summary(first)), [second]: async () => Response.json(summary(second)) });
    await render();
    expect(charts?.error).toBeUndefined();
    expect(charts?.items.map(item => item.id)).toEqual([second, first]);
    expect(charts?.songIds).toEqual([second, first]);
  });

  it('withholds chart IDs while any chart is still loading', async () => {
    let finish!: () => void;
    const pending = new Promise<Response>(resolve => { finish = () => resolve(Response.json(summary(second))); });
    serve({ [first]: async () => Response.json(summary(first)), [second]: () => pending });
    await render();
    expect(charts?.isLoading).toBe(true);
    expect(charts?.songIds).toBeUndefined();

    await act(async () => finish());
    await flush();
    expect(charts?.songIds).toEqual([second, first]);
  });

  it('reports an error instead of chart IDs when a chart fails to load', async () => {
    serve({ [first]: async () => Response.json(summary(first)), [second]: async () => new Response('', { status: 500 }) });
    await render();
    expect(charts?.songIds).toBeUndefined();
    expect(charts?.error?.message).toBe('Chart request failed (500)');
  });
});
