import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { SWRConfig } from 'swr';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import ScoreCount from '@/components/score/ScoreCount';
import i18n from '@/i18n';

vi.mock('@/components', () => ({ LoadingSpinner: () => <span>Loading</span> }));
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let root: Root;
let container: HTMLDivElement;
beforeEach(() => { container = document.createElement('div'); document.body.append(container); root = createRoot(container); });
afterEach(() => { act(() => root.unmount()); container.remove(); vi.unstubAllGlobals(); });
async function render(component: ReactNode) {
  await act(async () => { root.render(<SWRConfig value={{ provider: () => new Map(), shouldRetryOnError: false }}><MemoryRouter>{component}</MemoryRouter></SWRConfig>); });
}
it('renders nested players/acc.dx from the new all-player totals endpoint', async () => {
  const fetch = vi.fn().mockResolvedValue(Response.json({ geneTime: '2026-10-01T00:00:00Z', players: [{ userId: 'abc', username: 'player', acc: { dx: 202.3456, classic: 205 } }] }));
  vi.stubGlobal('fetch', fetch);
  await render(<ScoreCount uploader="" page={0} pageSize={100} />);
  expect(fetch.mock.calls[0][0]).toBe('/api3/api/maiscore/sum/all?page=0&pageSize=100');
  expect(container.textContent).toContain('player'); expect(container.textContent).toContain('202.3456%');
});
it('shows the avatar from the player profile and looks up only players without one', async () => {
  const fetch = vi.fn(async (url: string) => url.includes('/account/profile?')
    ? Response.json({ code: 13, message: 'No such user' }, { status: 404 })
    : Response.json({ geneTime: '2026-10-01T00:00:00Z', players: [
      { userId: 'u1', username: 'player', acc: { dx: 202.3456, classic: 205 }, player: { id: 'u1', username: 'player', nickname: 'Nick', avatarId: 'abc' } },
      { userId: 'u2', username: 'ghost', acc: { dx: 100, classic: 100 }, player: null },
    ] }));
  vi.stubGlobal('fetch', fetch);
  await render(<ScoreCount uploader="" page={0} pageSize={100} />);
  expect(container.querySelector('img[alt="player"]')?.getAttribute('src')).toBe('/api3/api/avatar/abc');
  // 带资料的玩家不再查资料；账号已删除（player 为 null）的才按用户名查
  expect(fetch.mock.calls.map(([url]) => url).filter((url) => url.includes('/account/profile'))).toEqual(['/api3/api/account/profile?username=ghost']);
  // 名字照旧显示用户名，不换成昵称
  expect(container.textContent).toContain('player'); expect(container.textContent).not.toContain('Nick');
});
it('filters by uploader through the by-uploader totals endpoint', async () => {
  const fetch = vi.fn().mockResolvedValue(Response.json({ geneTime: '2026-10-01T00:00:00Z', players: [] }));
  vi.stubGlobal('fetch', fetch);
  await render(<ScoreCount uploader="mmfc_bot" page={0} pageSize={30} />);
  expect(fetch.mock.calls[0][0]).toBe('/api3/api/maiscore/sum/chart/by-uploader/mmfc_bot?page=0&pageSize=30');
  expect(container.textContent).toContain(i18n.t('shared/ScoreCount.EmptyData'));
});
it('escapes the uploader as a single path segment', async () => {
  const fetch = vi.fn().mockResolvedValue(Response.json({ geneTime: '2026-10-01T00:00:00Z', players: [] }));
  vi.stubGlobal('fetch', fetch);
  await render(<ScoreCount uploader="a/b c" page={1} pageSize={30} />);
  expect(fetch.mock.calls[0][0]).toBe('/api3/api/maiscore/sum/chart/by-uploader/a%2Fb%20c?page=1&pageSize=30');
});
it('shows a failed request instead of treating an error object as player data', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ title: 'Invalid page' }, { status: 400 })));
  await render(<ScoreCount uploader="mmfc_bot" page={0} pageSize={30} />);
  expect(container.textContent).toContain(i18n.t('shared/ScoreCount.FailedToLoad'));
});
