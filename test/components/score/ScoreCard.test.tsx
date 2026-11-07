import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { SWRConfig } from 'swr';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ScoreCard } from '@/components/score/ScoreCard';
import type { Score } from '@/types';

vi.mock('@/components', () => ({
  CoverPic: () => null,
  Level: () => null,
  LazyLoad: ({ children }: { children: ReactNode }) => <>{children}</>,
}));
vi.mock('@/components/song/SongInteraction', () => ({ ChartVoteBadge: () => null }));
vi.mock('@/components/user/UserAvatar', () => ({ default: () => null }));
vi.mock('@/hooks', () => ({ useUsername: () => 'Alice' }));
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const LEVEL_HASH = '0123456789abcdef'.repeat(4);
const CHART_ID = '3f2504e0-4f89-11d3-9a0c-0305e82c3301';

const makeScore = (levelHash?: string | null): Score => ({
  acc: { dx: 100.5, classic: 101 },
  dxScore: 1234,
  comboState: 0,
  chartLevel: 3,
  hash: 'u/+9gjE3eW1Xv+7aHzaQ0w==',
  ...(levelHash === undefined ? {} : { levelHash }),
  chartInfo: {
    id: CHART_ID, title: 'Song', artist: 'Artist', designer: 'Designer', description: '',
    levels: ['', '', '', '13+'], uploader: 'uploader', timestamp: '', hash: 'u/+9gjE3eW1Xv+7aHzaQ0w==', tags: [], publicTags: [],
  },
  timestamp: '2026-10-01T00:00:00Z',
});
const entry = (username: string, acc: number) => ({ player: { username }, acc, comboState: 0, timestamp: '2026-10-01T00:00:00Z' });

let root: Root;
let container: HTMLDivElement;
let fetchMock: ReturnType<typeof vi.fn<typeof fetch>>;
beforeEach(() => {
  container = document.createElement('div'); document.body.append(container); root = createRoot(container);
  fetchMock = vi.fn<typeof fetch>(); vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => { act(() => root.unmount()); container.remove(); vi.unstubAllGlobals(); });
async function render(component: ReactNode) {
  await act(async () => { root.render(<SWRConfig value={{ provider: () => new Map(), shouldRetryOnError: false }}><MemoryRouter>{component}</MemoryRouter></SWRConfig>); });
}
const requestedUrls = () => fetchMock.mock.calls.map(([url]) => url);
const rankBadge = () => container.querySelector('span[title^="#"]');

describe('ScoreCard rank', () => {
  it('reads the rank from the level leaderboard when the score has a level hash', async () => {
    fetchMock.mockResolvedValue(Response.json({ levelHash: LEVEL_HASH, scores: [entry('bob', 101), entry(' alice ', 100.5), entry('carol', 99)] }));
    await render(<ScoreCard score={makeScore(LEVEL_HASH)} showLikeButton={false} showRank />);
    expect(requestedUrls()).toEqual([`/api3/api/maiscore/leaderboard/chart/by-level/${LEVEL_HASH}`]);
    expect(rankBadge()?.textContent).toBe('#2');
    expect(rankBadge()?.getAttribute('title')).toBe('#2 / 3');
  });

  it('shows no rank when the player is not on the level leaderboard', async () => {
    fetchMock.mockResolvedValue(Response.json({ levelHash: LEVEL_HASH, scores: [entry('bob', 101)] }));
    await render(<ScoreCard score={makeScore(LEVEL_HASH)} showLikeButton={false} showRank />);
    expect(requestedUrls()).toEqual([`/api3/api/maiscore/leaderboard/chart/by-level/${LEVEL_HASH}`]);
    expect(rankBadge()).toBeNull();
  });

  // 迁移期的旧成绩没有 level hash；格式不对的值也不拿去请求 by-level
  it.each([
    ['missing', undefined],
    ['null', null],
    ['empty', ''],
    ['uppercase', LEVEL_HASH.toUpperCase()],
    ['too short', LEVEL_HASH.slice(1)],
  ])('falls back to the chart leaderboard by chart id when the level hash is %s', async (_, levelHash) => {
    const scores: unknown[][] = Array.from({ length: 8 }, () => []);
    scores[3] = [entry('alice', 100.5), entry('bob', 99)];
    fetchMock.mockResolvedValue(Response.json({ hash: 'u/+9gjE3eW1Xv+7aHzaQ0w==', levelHashes: [null, null, null, LEVEL_HASH, null, null, null], scores }));
    await render(<ScoreCard score={makeScore(levelHash)} showLikeButton={false} showRank />);
    expect(requestedUrls()).toEqual([`/api3/api/maiscore/leaderboard/chart/by-id/${CHART_ID}`]);
    expect(rankBadge()?.getAttribute('title')).toBe('#1 / 2');
  });

  it('keeps scanning the other levels of the chart leaderboard in the fallback', async () => {
    const scores: unknown[][] = Array.from({ length: 8 }, () => []);
    scores[1] = [entry('bob', 101), entry('carol', 100), entry('alice', 99)];
    fetchMock.mockResolvedValue(Response.json({ hash: 'h', levelHashes: Array(7).fill(null), scores }));
    await render(<ScoreCard score={makeScore()} showLikeButton={false} showRank />);
    expect(rankBadge()?.getAttribute('title')).toBe('#3 / 3');
  });

  it('ranks the given player instead of the signed-in one', async () => {
    fetchMock.mockResolvedValue(Response.json({ levelHash: LEVEL_HASH, scores: [entry('alice', 101), entry('dave', 100)] }));
    await render(<ScoreCard score={makeScore(LEVEL_HASH)} showLikeButton={false} showRank rankUsername="Dave" />);
    expect(rankBadge()?.getAttribute('title')).toBe('#2 / 2');
  });

  it('does not request any leaderboard without showRank', async () => {
    await render(<ScoreCard score={makeScore(LEVEL_HASH)} showLikeButton={false} />);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(rankBadge()).toBeNull();
  });
});
