import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CommentBody, CommentListView, CommentSection } from '@/components/song/SongComments';
import type { Comment, CommentList, CommentPage } from '@/types';

const { toast } = vi.hoisted(() => ({ toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() } }));
vi.mock('react-toastify', () => ({ toast }));
let currentUser: { id: string; username: string } | null = { id: 'u1', username: 'alice' };
let administrator = false;
vi.mock('@/hooks', () => ({
  useI18n: () => ({ i18n: (_key: string, fallback?: string) => fallback ?? _key, language: 'en', isReady: true }),
  useUserContext: () => ({ user: currentUser, username: currentUser?.username ?? '', isLoading: false, error: null, refetch: () => {} }),
  useIsAdministrator: () => administrator,
}));
vi.mock('@/components', () => ({ LoadingSpinner: () => <span>Loading</span> }));
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function comment(id: string, extra: Partial<Comment> = {}): Comment {
  return {
    id, chartId: 'chart', chartHash: 'hash', parentId: null, depth: 0, authorId: 'u2', author: 'bob', body: `body of ${id}`,
    createdAt: new Date(Date.now() - 3600_000).toISOString(), editedAt: null, deleted: false, removed: false, score: 1, myVote: 0,
    replyCount: 0, replies: [], ...extra,
  };
}
function page(items: Comment[], extra: Partial<CommentPage> = {}): CommentPage {
  return { items, total: items.length, commentCount: 5, page: 1, pageSize: 20, sort: 'best', ...extra };
}
const json = (value: unknown, status = 200) => Response.json(value, { status });

describe('CommentSection', () => {
  let container: HTMLDivElement;
  let root: Root;
  let fetchMock: ReturnType<typeof vi.fn<typeof fetch>>;
  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    fetchMock = vi.fn<typeof fetch>();
    vi.stubGlobal('fetch', fetchMock);
    // jsdom 没有这两个布局 API；永久链接视图用它们把评论滚进视野
    Element.prototype.scrollIntoView = vi.fn();
    vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} unobserve() {} });
    currentUser = { id: 'u1', username: 'alice' };
    administrator = false;
    toast.error.mockClear();
    toast.success.mockClear();
  });
  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  });
  async function render(children: ReactNode, path = '/song?id=chart') {
    await act(async () => root.render(<MemoryRouter initialEntries={[path]}>{children}</MemoryRouter>));
  }
  const requested = () => fetchMock.mock.calls.map(([url, init]) => `${init?.method ?? 'GET'} ${String(url)}`);
  const bodies = () => [...container.querySelectorAll('article p')].map((p) => p.textContent);
  const button = (label: string) => [...container.querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent?.trim() === label)!;

  it('loads the best page and nests replies with the uploader badge and placeholders', async () => {
    const reply = comment('r', { parentId: 'a', depth: 1, author: 'uploader-user', body: 'a reply', score: 4, myVote: 1 });
    const placeholder = comment('gone', { parentId: 'a', depth: 1, deleted: true, author: '', authorId: null, body: '', replyCount: 1,
      replies: [comment('below', { parentId: 'gone', depth: 2, body: 'below the placeholder' })] });
    fetchMock.mockResolvedValue(json(page([comment('a', { replyCount: 2, replies: [reply, placeholder] }), comment('b', { body: 'second root' })])));
    await render(<CommentSection chartId="chart" uploader="uploader-user" commentCount={0} />);

    expect(requested()).toEqual(['GET /api3/api/maichart/chart/comments?sort=best&page=1']);
    expect(container.querySelector('#comments-heading')!.textContent).toContain('5');
    expect(bodies()).toEqual(['body of a', 'a reply', 'This comment was deleted by its author'.replace('This comment was deleted by its author', '此评论已被作者删除'), 'below the placeholder', 'second root']);
    const badges = [...container.querySelectorAll('span')].filter((s) => s.textContent === '上传者');
    expect(badges).toHaveLength(1);
    expect(container.querySelector('article#comment-gone header span')!.textContent).toBe('[已删除]');
    // 当前用户给回复投过赞，分数按赞色高亮
    const replyScore = container.querySelector('article#comment-r [aria-live="polite"]')!;
    expect(replyScore.className).toContain('text-orange-400');
  });

  it('refetches when the order changes', async () => {
    fetchMock.mockImplementation(async () => json(page([])));
    await render(<CommentSection chartId="chart" uploader="x" commentCount={0} />);
    await act(async () => {
      const select = container.querySelector('select')!;
      select.value = 'top';
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });
    expect(requested()).toEqual([
      'GET /api3/api/maichart/chart/comments?sort=best&page=1',
      'GET /api3/api/maichart/chart/comments?sort=top&page=1',
    ]);
    expect(container.textContent).toContain('暂无评论');
  });

  it('posts a comment and shows it on top with the author vote', async () => {
    fetchMock.mockImplementation(async (_url, init) =>
      init?.method === 'POST'
        ? json(comment('new', { author: 'alice', authorId: 'u1', body: 'hello there', myVote: 1 }), 201)
        : json(page([comment('a')])));
    await render(<CommentSection chartId="chart" uploader="x" commentCount={1} />);
    await act(async () => {
      const textarea = container.querySelector('textarea')!;
      Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!.call(textarea, 'hello there');
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await act(async () => button('发表').click());
    const post = fetchMock.mock.calls.find(([, init]) => init?.method === 'POST')!;
    expect(String(post[0])).toBe('/api3/api/maichart/chart/comments');
    expect(JSON.parse(String(post[1]?.body))).toEqual({ body: 'hello there' });
    expect(bodies()[0]).toBe('hello there');
    expect(container.querySelector('#comments-heading')!.textContent).toContain('6');
    // 自己的评论可以编辑和删除
    expect(button('编辑')).toBeTruthy();
    expect(button('删除')).toBeTruthy();
  });

  it('deletes own comment after confirming and purges it from the tree', async () => {
    fetchMock.mockImplementation(async (_url, init) =>
      init?.method === 'DELETE' ? json({ ok: true, purged: true }) : json(page([comment('mine', { author: 'alice', authorId: 'u1' }), comment('theirs')])));
    await render(<CommentSection chartId="chart" uploader="x" commentCount={2} />);
    await act(async () => button('删除').click());
    expect(container.textContent).toContain('删除这条评论？');
    await act(async () => button('确认').click());
    expect(requested()).toContain('DELETE /api3/api/comment/mine');
    expect(bodies()).toEqual(['body of theirs']);
    expect(toast.success).toHaveBeenCalledWith('已删除');
    // 别人的评论既不能编辑也不能删除
    expect(button('删除')).toBeUndefined();
  });

  it('lets an administrator remove another user\'s comment, leaving a placeholder', async () => {
    administrator = true;
    fetchMock.mockImplementation(async (_url, init) =>
      init?.method === 'DELETE' ? json({ ok: true, purged: false }) : json(page([comment('theirs', { replyCount: 1, replies: [comment('r', { parentId: 'theirs', depth: 1 })] })])));
    await render(<CommentSection chartId="chart" uploader="x" commentCount={2} />);
    await act(async () => button('移除').click());
    await act(async () => button('确认').click());
    expect(bodies()).toEqual(['此评论已被管理员移除', 'body of r']);
    expect(toast.success).toHaveBeenCalledWith('已移除');
  });

  it('votes on a comment through the comment vote endpoint', async () => {
    fetchMock.mockImplementation(async (_url, init) =>
      init?.method === 'PUT' ? json({ score: 0, myVote: -1 }) : json(page([comment('a', { score: 1 })])));
    await render(<CommentSection chartId="chart" uploader="x" commentCount={1} />);
    await act(async () => container.querySelector<HTMLButtonElement>('article#comment-a button[aria-label="踩"]')!.click());
    const vote = fetchMock.mock.calls.find(([, init]) => init?.method === 'PUT')!;
    expect(String(vote[0])).toBe('/api3/api/comment/a/vote');
    expect(JSON.parse(String(vote[1]?.body))).toEqual({ value: -1 });
    expect(container.querySelector('article#comment-a [aria-live="polite"]')!.textContent).toBe('0');
  });

  it('shows a single thread for a permalink and links back to all comments', async () => {
    fetchMock.mockResolvedValue(json({ item: comment('child', { parentId: 'parent', depth: 1 }), sort: 'best' }));
    await render(<CommentSection chartId="chart" uploader="x" commentCount={9} focusId="child" />, '/song?id=chart&comment=child');
    expect(requested()).toEqual(['GET /api3/api/comment/child?sort=best']);
    expect(container.textContent).toContain('正在查看单条评论');
    const links = [...container.querySelectorAll('a')].map((a) => a.getAttribute('href'));
    expect(links).toContain('/song?id=chart#comments');
    expect(links).toContain('/song?id=chart&comment=parent');
    // 永久链接视图里没有发表框
    expect(container.querySelector('textarea')).toBeNull();
  });

  it('offers a continue-thread link below the deepest visible level and collapses buried comments', async () => {
    let node = comment('d9', { depth: 9, parentId: 'd8' });
    for (let depth = 8; depth >= 0; depth--) {
      node = comment(`d${depth}`, { depth, parentId: depth === 0 ? null : `d${depth - 1}`, replyCount: 1, replies: [node] });
    }
    const buried = comment('buried', { score: -5, replyCount: 1, replies: [comment('hidden', { parentId: 'buried', depth: 1 })] });
    fetchMock.mockResolvedValue(json(page([node, buried])));
    await render(<CommentSection chartId="chart" uploader="x" commentCount={0} />);
    expect(container.querySelector('article#comment-d8')).toBeTruthy();
    expect(container.querySelector('article#comment-d9')).toBeNull();
    const links = [...container.querySelectorAll('article#comment-d8 a')].map((a) => a.getAttribute('href'));
    expect(links).toContain('/song?id=chart&comment=d8');
    expect(container.textContent).toContain('继续阅读这个话题');
    expect(container.querySelector('article#comment-hidden')).toBeNull();
    expect(container.querySelector('article#comment-buried [aria-expanded="false"]')).toBeTruthy();
  });

  it('asks a signed-out visitor to sign in and shows failures with a retry', async () => {
    currentUser = null;
    fetchMock.mockResolvedValueOnce(json({ code: 13, message: 'No such chart' }, 404)).mockResolvedValueOnce(json(page([])));
    await render(<CommentSection chartId="chart" uploader="x" commentCount={0} />);
    expect(container.textContent).toContain('登录后即可评论');
    expect(container.querySelector('a[href^="/login?redirect="]')).toBeTruthy();
    expect(container.textContent).toContain('No such chart');
    await act(async () => button('重试').click());
    expect(requested()).toHaveLength(2);
    expect(container.textContent).toContain('暂无评论');
  });
});

describe('CommentBody and CommentListView', () => {
  let container: HTMLDivElement;
  let root: Root;
  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });
  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('links web addresses and mentions but never interprets markup', async () => {
    await act(async () => root.render(
      <MemoryRouter><CommentBody text={'see https://example.com/a?b=1. ping @bob_1 <b>x</b>'} /></MemoryRouter>,
    ));
    const links = [...container.querySelectorAll('a')];
    expect(links.map((a) => a.getAttribute('href'))).toEqual(['https://example.com/a?b=1', '/space?id=bob_1']);
    expect(links[0].getAttribute('rel')).toContain('noopener');
    expect(container.querySelector('b')).toBeNull();
    expect(container.textContent).toContain('<b>x</b>');
  });

  it('pages a flat list and shows the chart of each comment', async () => {
    const load = vi.fn(async (page: number): Promise<CommentList> => ({
      items: [comment(`p${page}`, { chartTitle: 'Song Title', score: 3 })], total: 45, page, pageSize: 20,
    }));
    await act(async () => root.render(<MemoryRouter><CommentListView load={load} empty="none" /></MemoryRouter>));
    expect(load).toHaveBeenLastCalledWith(1, expect.any(AbortSignal));
    expect(container.textContent).toContain('Song Title');
    expect(container.textContent).toContain('1 / 3');
    const next = [...container.querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent === '下一页')!;
    await act(async () => next.click());
    expect(load).toHaveBeenLastCalledWith(2, expect.any(AbortSignal));
    expect(container.textContent).toContain('body of p2');
    const links = [...container.querySelectorAll('a')].map((a) => a.getAttribute('href'));
    expect(links).toContain('/song?id=chart');
    expect(links).toContain('/song?id=chart&comment=p2');
  });
});
