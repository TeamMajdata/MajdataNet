import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { SWRConfig } from 'swr';
import { expect, it, vi } from 'vitest';
import { ScoreRanking } from '@/components/song/ScoreRanking';

vi.mock('@/components/user/UserAvatar', () => ({ default: () => null }));

it('only lists scores for the difficulty selected in the page header', async () => {
  const player = { username: 'chart fan', nickname: 'Chart Fan' };
  const scores = [[], [], [], [{ player, acc: 99.125, comboState: 0 }], []];
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.stubGlobal('fetch', vi.fn(async () => Response.json({ scores })));
  const container = document.createElement('div');
  const root = createRoot(container);
  const cache = new Map();
  const render = (level: number) => act(async () => root.render(
    <SWRConfig value={{ provider: () => cache }}><MemoryRouter>
      <ScoreRanking songid="chart" chartLevel={level} />
    </MemoryRouter></SWRConfig>,
  ));
  try {
    await render(3);
    expect(container.querySelector('ol')?.textContent).toContain('99.1250%');
    expect(container.querySelector('a')?.getAttribute('href')).toBe('/space?id=chart%20fan');
    await render(4);
    expect(container.querySelector('li')).toBeNull();
    expect(container.textContent).toContain('暂无成绩记录');
  } finally {
    await act(async () => root.unmount());
    vi.unstubAllGlobals();
  }
});
