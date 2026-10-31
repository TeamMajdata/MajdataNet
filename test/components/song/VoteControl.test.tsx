import { act, useState, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { VoteControl } from '@/components/song/VoteControl';
import type { Vote, VoteResult } from '@/types';

const { toast } = vi.hoisted(() => ({ toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() } }));
vi.mock('react-toastify', () => ({ toast }));
let currentUser: { id: string; username: string } | null = { id: 'u1', username: 'alice' };
vi.mock('@/hooks', () => ({
  useI18n: () => ({ i18n: (_key: string, fallback?: string) => fallback ?? _key, language: 'en', isReady: true }),
  useUserContext: () => ({ user: currentUser, username: currentUser?.username ?? '', isLoading: false, error: null, refetch: () => {} }),
}));

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/** 像真实调用方一样把服务端结果写回状态。 */
function Stateful({ score, myVote, onVote }: { score: number; myVote: Vote; onVote: (value: Vote) => Promise<VoteResult> }) {
  const [state, setState] = useState({ score, myVote });
  return <VoteControl score={state.score} myVote={state.myVote} onVote={onVote} onResult={(r) => setState({ score: r.score, myVote: r.myVote })} label="vote" />;
}

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location">{location.pathname + location.search}</output>;
}

describe('VoteControl', () => {
  let container: HTMLDivElement;
  let root: Root;
  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    currentUser = { id: 'u1', username: 'alice' };
    toast.error.mockClear();
  });
  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });
  async function render(children: ReactNode) {
    await act(async () => root.render(
      <MemoryRouter initialEntries={['/song?id=chart#comments']}>
        <Routes>
          <Route path="*" element={<>{children}<LocationProbe /></>} />
        </Routes>
      </MemoryRouter>,
    ));
  }
  const up = () => container.querySelector<HTMLButtonElement>('button[aria-label="赞"]')!;
  const down = () => container.querySelector<HTMLButtonElement>('button[aria-label="踩"]')!;
  const score = () => container.querySelector('[aria-live="polite"]')!.textContent;

  it('updates the score optimistically and hands the server result to the caller', async () => {
    let resolve!: (result: VoteResult) => void;
    const onVote = vi.fn(() => new Promise<VoteResult>((r) => { resolve = r; }));
    const onResult = vi.fn();
    await render(<VoteControl score={3} myVote={0} onVote={onVote} onResult={onResult} label="vote" />);
    expect(score()).toBe('3');

    await act(async () => up().click());
    expect(score()).toBe('4');
    expect(up().getAttribute('aria-pressed')).toBe('true');
    expect(onVote).toHaveBeenCalledWith(1);

    await act(async () => resolve({ score: 4, upvotes: 4, downvotes: 0, myVote: 1 }));
    expect(onResult).toHaveBeenCalledWith({ score: 4, upvotes: 4, downvotes: 0, myVote: 1 });
  });

  it('pressing the active arrow withdraws the vote and a flipped vote moves the score by two', async () => {
    const onVote = vi.fn((value: Vote) => Promise.resolve({ score: 2 - 1 + value, myVote: value } as VoteResult));
    await render(<Stateful score={2} myVote={1} onVote={onVote} />);
    await act(async () => up().click());
    expect(onVote).toHaveBeenLastCalledWith(0);
    expect(score()).toBe('1');
    await act(async () => down().click());
    expect(onVote).toHaveBeenLastCalledWith(-1);
    expect(score()).toBe('0');
    expect(down().getAttribute('aria-pressed')).toBe('true');
  });

  it('rolls back and reports the error when the server rejects the vote', async () => {
    const onVote = vi.fn(() => Promise.reject(new Error('Too many requests')));
    const onResult = vi.fn();
    await render(<VoteControl score={5} myVote={0} onVote={onVote} onResult={onResult} label="vote" />);
    await act(async () => down().click());
    expect(score()).toBe('5');
    expect(down().getAttribute('aria-pressed')).toBe('false');
    expect(onResult).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith('Too many requests');
  });

  it('sends a signed-out visitor to the login page with a redirect back', async () => {
    currentUser = null;
    const onVote = vi.fn();
    await render(<VoteControl score={1} myVote={0} onVote={onVote} onResult={() => {}} label="vote" />);
    await act(async () => up().click());
    expect(onVote).not.toHaveBeenCalled();
    expect(container.querySelector('[data-testid="location"]')!.textContent)
      .toBe('/login?redirect=' + encodeURIComponent('/song?id=chart#comments'));
  });

  it('formats large scores compactly', async () => {
    await render(<VoteControl score={12345} myVote={0} onVote={vi.fn()} onResult={() => {}} label="vote" />);
    expect(score()).toBe('12.3K');
  });
});
