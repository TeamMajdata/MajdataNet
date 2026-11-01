import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SWRConfig } from 'swr';
import { useEvents, type EventsState } from '@/hooks/useEvents';
import bundledEvents from '../../public/events.json';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const container = document.createElement('div');
let root = createRoot(container);
const states: EventsState[] = [];
afterEach(async () => {
  await act(async () => root.unmount());
  root = createRoot(container);
  states.length = 0;
  vi.unstubAllGlobals();
});

function Probe() {
  states.push(useEvents());
  return null;
}

/** 用独立的 SWR 缓存渲染，避免上一个用例的结果被复用；等请求结束后返回最后一次的状态。 */
async function renderEvents(): Promise<EventsState> {
  await act(async () => root.render(
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}><Probe /></SWRConfig>,
  ));
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 0)); });
  return states[states.length - 1];
}

const apiEvent = {
  id: 'mmfc15', type: 'space', asset: 'MMFC15', src: '/events/mmfc15.jpg', alt: 'MMFC 15', title: 'MMFC 15',
  category: 2, createDate: '2026-10-31T16:00:00Z', endDate: '2026-12-01T15:59:59.999Z', description: '',
};

describe('useEvents', () => {
  it('reads the events from api/event', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify([apiEvent]), { status: 200 }));
    vi.stubGlobal('fetch', fetcher);

    const state = await renderEvents();

    expect(states[0]).toEqual({ events: [], isLoading: true });
    expect(state).toEqual({ events: [apiEvent], isLoading: false });
    expect(fetcher).toHaveBeenCalledWith('/api3/api/event', expect.objectContaining({ credentials: 'include' }));
  });

  it('falls back to the bundled events.json when api/event is unavailable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 404 })));

    const state = await renderEvents();

    expect(state).toEqual({ events: bundledEvents, isLoading: false });
  });
});
