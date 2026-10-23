import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { SWRConfig } from 'swr';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import ScoreCount from '@/components/score/ScoreCount';

vi.mock('@/hooks', () => ({ useI18n: () => ({ i18n: (key: string) => key }) }));
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
it('keeps uploader filtering on the implemented stats endpoint', async () => {
  const fetch = vi.fn().mockResolvedValue(Response.json({ geneTime: '2026-10-01T00:00:00Z', players: [] }));
  vi.stubGlobal('fetch', fetch);
  await render(<ScoreCount uploader="mmfc_bot" page={0} pageSize={30} />);
  expect(fetch.mock.calls[0][0]).toBe('/api3/api/stats/score-sums?uploader=mmfc_bot&page=0&pageSize=30');
  expect(container.textContent).toContain('EmptyData');
});
it('shows a failed request instead of treating an error object as player data', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ title: 'Invalid page' }, { status: 400 })));
  await render(<ScoreCount uploader="mmfc_bot" page={0} pageSize={30} />);
  expect(container.textContent).toContain('FailedToLoad');
});
