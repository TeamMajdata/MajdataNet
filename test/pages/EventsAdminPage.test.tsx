import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { SWRConfig } from 'swr';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import EventsAdminPage from '@/pages/admin/EventsAdminPage';
import type { Event } from '@/types/event';

const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock('react-toastify', () => ({ toast }));
vi.mock('@/hooks/useUserContext', () => ({
  useUserContext: () => ({ user: { id: 'u1', username: 'alice' }, username: 'alice', isLoading: false, error: null, refetch: () => {} }),
}));
vi.mock('@/components', () => ({
  PageLayout: ({ children }: { children: ReactNode }) => <main>{children}</main>,
  LoadingSpinner: () => <span>loading</span>,
}));
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mmfc15: Event = {
  id: 'mmfc15', type: 'space', asset: 'MMFC15', src: '/events/mmfc15.jpg', alt: 'MMFC 15', title: 'MMFC 15',
  category: 2, createDate: '2026-10-31T16:00:00Z', endDate: '2099-12-01T15:59:59.999Z', description: '',
};

/** 内存里的 api/event 和 account/session，按请求修改活动列表。 */
function fakeBackend(groups: string[], events: Event[]) {
  return vi.fn<typeof fetch>(async (input, init) => {
    const url = String(input);
    const method = init?.method ?? 'GET';
    if (url === '/api3/api/account/session') return Response.json({ id: 's1', permissions: 131071, groups });
    if (url === '/api3/api/event' && method === 'GET') return Response.json(events);
    if (url === '/api3/api/event' && method === 'POST') {
      const body = JSON.parse(String(init?.body)) as Event;
      if (events.some((event) => event.id === body.id)) return Response.json({ code: 40900, message: 'exists' }, { status: 409 });
      const saved = { ...body, createDate: new Date(body.createDate).toISOString(), endDate: new Date(body.endDate).toISOString() };
      events.unshift(saved);
      return Response.json(saved, { status: 201 });
    }
    const id = decodeURIComponent(url.slice('/api3/api/event/'.length));
    if (method === 'DELETE') {
      events.splice(events.findIndex((event) => event.id === id), 1);
      return Response.json({ code: 114514, message: 'Ok' });
    }
    throw new Error(`unexpected request ${method} ${url}`);
  });
}

let root: Root;
let container: HTMLDivElement;
let fetchMock: ReturnType<typeof fakeBackend>;
beforeEach(() => {
  vi.clearAllMocks();
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

async function render(groups: string[], events: Event[]) {
  fetchMock = fakeBackend(groups, events);
  vi.stubGlobal('fetch', fetchMock);
  await act(async () => root.render(
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}><EventsAdminPage /></SWRConfig>,
  ));
  await settle();
}
async function settle() {
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });
}
function button(text: string) {
  return [...container.querySelectorAll('button')].find((item) => item.textContent?.trim() === text)!;
}
function fill(name: string, value: string) {
  const element = container.querySelector<HTMLInputElement | HTMLSelectElement>(`[name="${name}"]`)!;
  const prototype = element instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
  act(() => {
    Object.getOwnPropertyDescriptor(prototype, 'value')!.set!.call(element, value);
    element.dispatchEvent(new Event(element instanceof HTMLSelectElement ? 'change' : 'input', { bubbles: true }));
  });
}
function requests(method: string) {
  return fetchMock.mock.calls.filter(([, init]) => (init?.method ?? 'GET') === method);
}

describe('EventsAdminPage', () => {
  it('turns away a session outside the event manager group without loading events', async () => {
    await render([], [mmfc15]);

    expect(container.textContent).toContain('只有活动管理员或管理员可以管理活动。');
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual(['/api3/api/account/session']);
  });

  it('lists the events for an administrator', async () => {
    await render(['administrator'], [mmfc15]);

    expect(container.textContent).toContain('MMFC 15');
    expect(container.textContent).toContain('进行中 1');
    expect(container.querySelector('a[href="/space?id=MMFC15"]')).not.toBeNull();
  });

  it('creates an event from the form with times in Beijing time', async () => {
    await render(['eventManager'], [mmfc15]);
    await act(async () => button('新建活动').click());

    await act(async () => button('保存').click());
    expect(container.textContent).toContain('必填');
    expect(requests('POST')).toHaveLength(0);

    fill('id', 'mmfc16');
    fill('title', 'MMFC 16');
    fill('type', 'eventTag');
    fill('asset', 'MMFC16');
    fill('src', '/events/mmfc16.jpg');
    fill('alt', 'MMFC 16');
    fill('start', '2026-12-01T00:00');
    fill('end', '2026-12-31T23:59:59');
    await act(async () => button('保存').click());
    await settle();

    expect(JSON.parse(String(requests('POST')[0][1]!.body))).toEqual({
      id: 'mmfc16', type: 'eventTag', asset: 'MMFC16', src: '/events/mmfc16.jpg', alt: 'MMFC 16', title: 'MMFC 16',
      category: 2, createDate: '2026-12-01T00:00:00+08:00', endDate: expect.stringMatching(/^2026-12-31T23:59:59(\.000)?\+08:00$/), description: '',
    });
    expect(toast.success).toHaveBeenCalledWith('已创建活动');
    expect(container.querySelector('[role="dialog"]')).toBeNull();
    expect(container.textContent).toContain('MMFC 16');
  });

  it('refuses an ID that is already taken before sending', async () => {
    await render(['eventManager'], [mmfc15]);
    await act(async () => button('新建活动').click());
    fill('id', 'mmfc15');
    await act(async () => button('保存').click());

    expect(container.textContent).toContain('这个 ID 已被使用');
    expect(requests('POST')).toHaveLength(0);
  });

  it('deletes an event after confirmation', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    await render(['eventManager'], [mmfc15]);

    await act(async () => button('删除').click());
    await settle();

    expect(window.confirm).toHaveBeenCalledWith('确定删除活动「MMFC 15」吗？此操作不能撤销。');
    expect(requests('DELETE')[0][0]).toBe('/api3/api/event/mmfc15');
    expect(container.textContent).toContain('没有符合条件的活动');
  });
});
