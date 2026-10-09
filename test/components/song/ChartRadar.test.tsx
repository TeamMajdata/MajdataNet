import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { SWRConfig } from 'swr';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import SongPage from '@/pages/SongPage';
import ChartRadar from '@/components/song/ChartRadar';
import { getDefaultChartLevel } from '@/utils/radar';

const translate = (_key: string, fallback?: string) => fallback ?? _key;
vi.mock('@/hooks', () => ({ useI18n: () => ({ i18n: translate, isReady: true }) }));
vi.mock('@/hooks/useI18n', () => ({ useI18n: () => ({ i18n: translate, isReady: true }) }));
vi.mock('react-helmet-async', () => ({ Helmet: () => null }));
vi.mock('@/utils', () => ({ stripTmpTags: (value: string) => value }));
vi.mock('framer-motion', async () => ({ ...await vi.importActual('framer-motion'), useReducedMotion: () => true }));
vi.mock('@/components', async () => ({
  PageLayout: ({ children }: { children: ReactNode }) => children,
  Tooltip: ({ children }: { children: ReactNode }) => children,
  SongDifficultyLevels: (await import('@/components/song/SongDifficultyLevels')).default,
  Majdata: () => null,
  CoverPic: () => null, TagManageWidget: () => null, TagManageTagLauncher: () => null,
  CommentSender: () => null, CommentList: () => null, LikeSender: () => null,
  ScoreRanking: () => null, CollectionModal: () => null, LoadingSpinner: () => null,
}));

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const featureOrder = ['note', 'peak', 'sweep', 'slide_tricky', 'slide_sequence', 'jack', 'fitted_constant'];
const radar = (esti = 14.2) => ({ featureOrder, feature: { jack: 75, note: 120, fitted_constant: esti, peak: 135, sweep: 80, slide_sequence: 110, slide_tricky: 160 } });
const response = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status });
const summary = { id: 'song', hash: 'hash', title: 'Song', artist: '', designer: '', uploader: 'user', levels: ['', '', '', '12+', '14', '14+', '15'], tags: [], publicTags: [], timestamp: '2026-10-04' };

describe('default radar difficulty', () => {
  it.each([
    [['', '', '', '12+', '14', '14+', '15'], 6],
    [['', '', '', '12+', '14', '14+', ''], 5],
    [['', '', '', '12+', '14', '', ''], 4],
    [[null, null, null, '12+', '  ', null, null], 3],
    [['2', '5', '8', '', '', '', ''], 2],
    [[null, '5', '', '', '', '', ''], 1],
    [['2', '', '', '', '', '', ''], 0],
    [[null, '', '  ', '', '', '', ''], undefined],
  ])('picks the last non-empty difficulty', (levels, expected) => {
    expect(getDefaultChartLevel(levels as (string | null)[])).toBe(expected);
  });
});

describe('radar on the song page', () => {
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
    delete window.unitySendMessage;
  });
  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    delete window.unitySendMessage;
    vi.unstubAllGlobals();
  });
  async function render(children: ReactNode = <SongPage />) {
    await act(async () => root.render(
      <SWRConfig value={{ provider: () => cache }}>
        <MemoryRouter initialEntries={['/song?id=song']}>{children}</MemoryRouter>
      </SWRConfig>,
    ));
  }
  function difficulty(level: number) { return container.querySelector<HTMLElement>(`[id="lv${level}"]`)!; }
  function radarRequests() { return fetchMock.mock.calls.filter(([url]) => String(url).includes('/radar?')); }

  it('defaults to the last non-empty difficulty and follows existing clicks without loading Unity', async () => {
    fetchMock.mockImplementation(async url => String(url).endsWith('/summary') ? response(summary) : response(radar(String(url).endsWith('=5') ? 14.83 : 14.2)));
    await render();
    expect(container.querySelector('[data-radar-level]')?.getAttribute('data-radar-level')).toBe('6');
    expect(container.querySelector('aside section svg')?.textContent).toContain('错位');
    expect(container.querySelector('aside section svg')?.textContent).toContain('拟合定数');
    expect(container.querySelector('aside')?.textContent).not.toMatch(/主要特征|刻度|SLIDE/);
    expect(radarRequests()[0][0]).toBe('/api3/api/maichart/song/radar?chartLevel=6');

    await act(async () => difficulty(5).querySelector('sup')!.click());
    expect(container.querySelector('aside section svg')?.textContent).toContain('14.83');
    expect(container.querySelector('[data-radar-level]')?.getAttribute('data-radar-level')).toBe('5');
  });

  it('uses the default difficulty when navigating to another song', async () => {
    function NextSong() {
      const navigate = useNavigate();
      return <button onClick={() => navigate('/song?id=other')}>Next song</button>;
    }
    fetchMock.mockImplementation(async url => {
      if (String(url).endsWith('/summary')) return response({ ...summary, id: String(url).includes('/other/') ? 'other' : 'song' });
      return response(radar());
    });
    await render(<><SongPage /><NextSong /></>);
    await act(async () => difficulty(5).click());
    expect(radarRequests().at(-1)?.[0]).toBe('/api3/api/maichart/song/radar?chartLevel=5');
    await act(async () => Array.from(container.querySelectorAll('button')).find(button => button.textContent === 'Next song')!.click());
    expect(radarRequests().at(-1)?.[0]).toBe('/api3/api/maichart/other/radar?chartLevel=6');
    expect(container.querySelector('[data-radar-level]')?.getAttribute('data-radar-level')).toBe('6');
  });

  it('observes nested clicks while preserving exactly one original playback message per click', async () => {
    fetchMock.mockImplementation(async url => String(url).endsWith('/summary') ? response(summary) : response(radar()));
    const sendMessage = vi.fn();
    window.unitySendMessage = sendMessage;
    await render();
    await act(async () => difficulty(5).querySelector('sup')!.click());
    expect(sendMessage).toHaveBeenCalledTimes(1);
    expect(sendMessage.mock.calls[0][2]).toMatch(/\nlv5$/);
    expect(radarRequests().at(-1)?.[0]).toBe('/api3/api/maichart/song/radar?chartLevel=5');
    await act(async () => difficulty(5).querySelector('span')!.click());
    expect(sendMessage).toHaveBeenCalledTimes(2);
    expect(radarRequests()).toHaveLength(2);
    await act(async () => container.querySelector<HTMLElement>('[data-radar-level]')!.click());
    expect(sendMessage).toHaveBeenCalledTimes(2);
    expect(radarRequests()).toHaveLength(2);
  });

  it('never shows a late response for the previously selected difficulty', async () => {
    let finishDefault!: (response: Response) => void;
    fetchMock.mockImplementation(async url => {
      if (String(url).endsWith('/summary')) return response(summary);
      if (String(url).endsWith('=6')) return new Promise(resolve => { finishDefault = resolve; });
      return response(radar(14.83));
    });
    await render();
    await act(async () => difficulty(5).click());
    await act(async () => finishDefault(response(radar(14.2))));
    expect(container.querySelector('aside section svg')?.textContent).toContain('14.83');
    expect(container.querySelector('aside section svg')?.textContent).not.toContain('14.20');
    expect(container.querySelector('[data-radar-level]')?.getAttribute('data-radar-level')).toBe('5');
  });

  it.each([404, 409, 422, 503])('keeps the selected difficulty on HTTP %s and allows a manual retry', async status => {
    fetchMock.mockImplementation(async url => String(url).endsWith('/summary') ? response(summary) : response({}, status));
    await render();
    expect(container.querySelector('aside [role="alert"]')).not.toBeNull();
    expect(container.querySelector('[data-radar-level]')?.getAttribute('data-radar-level')).toBe('6');
    expect(radarRequests()).toHaveLength(1);
    fetchMock.mockResolvedValue(response(radar()));
    await act(async () => container.querySelector<HTMLButtonElement>('aside section button')!.click());
    expect(container.querySelector('aside [role="alert"]')).toBeNull();
    expect(container.querySelector('aside section svg')?.textContent).toContain('14.20');
    expect(radarRequests()).toHaveLength(2);
  });

  it('invalidates client data when the chart hash changes', async () => {
    fetchMock.mockResolvedValueOnce(response(radar())).mockResolvedValueOnce(response(radar(13.75)));
    await render(<ChartRadar id="song" hash="old" chartLevel={4} />);
    await render(<ChartRadar id="song" hash="new" chartLevel={4} />);
    expect(radarRequests()).toHaveLength(2);
    expect(container.querySelector('svg')?.textContent).toContain('13.75');
  });

  it('places 100 on the reference hexagon and caps drawing at 200 without capping labels', async () => {
    const scores = [50, 100, 150, 200, 250, 0];
    fetchMock.mockResolvedValue(response({
      featureOrder,
      feature: { ...Object.fromEntries(featureOrder.slice(0, 6).map((key, i) => [key, scores[i]])), fitted_constant: 14.2 },
    }));
    await render(<ChartRadar id="song" hash="hash" chartLevel={4} />);
    const image = container.querySelector('svg image')!;
    const referenceRadius = Number(image.getAttribute('width')) / 2;
    const centerX = Number(image.getAttribute('x')) + referenceRadius;
    const centerY = Number(image.getAttribute('y')) + referenceRadius;
    const points = container.querySelector('svg polygon')!.getAttribute('points')!.split(' ').map(pair => pair.split(',').map(Number));
    for (const [i, expectedRadius] of [0.5, 1, 1.5, 2, 2, 0].entries()) {
      const [x, y] = points[i];
      expect(Math.hypot(x - centerX, y - centerY) / referenceRadius).toBeCloseTo(expectedRadius);
    }
    expect(container.querySelector('svg')?.getAttribute('aria-label')).toContain('拟合定数: 14.20');
    expect(container.querySelector('svg')?.textContent).toContain('250');
    expect(container.querySelector('svg')?.getAttribute('aria-label')).toContain('星星阵: 250');
  });

  it('shows missing values as unavailable instead of drawing a zero-score polygon', async () => {
    fetchMock.mockResolvedValue(response({ ...radar(), feature: { ...radar().feature, note: null, fitted_constant: null } }));
    await render(<ChartRadar id="song" hash="hash" chartLevel={4} />);
    expect(container.querySelector('svg polygon')).toBeNull();
    expect(container.querySelector('svg')?.getAttribute('aria-label')).toContain('物量: —');
    expect(container.querySelector('svg')?.getAttribute('aria-label')).toContain('拟合定数: —');
  });

  it('rejects malformed JSON payloads without drawing NaN values', async () => {
    fetchMock.mockResolvedValue(response({ featureOrder, feature: { ...radar().feature, note: '120' } }));
    await render(<ChartRadar id="song" hash="hash" chartLevel={4} />);
    expect(container.querySelector('[role="alert"]')).not.toBeNull();
    expect(container.querySelector('svg')).toBeNull();
  });

  it('does not request radar when all difficulties are empty', async () => {
    fetchMock.mockResolvedValue(response({ ...summary, levels: Array(7).fill(null) }));
    await render();
    expect(radarRequests()).toHaveLength(0);
    expect(container.querySelector('aside')?.textContent).toContain('暂无可用难度');
  });
});
