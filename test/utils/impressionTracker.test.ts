import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ImpressionTracker } from '@/utils/impressionTracker';

class FakeObserver {
  static instances: FakeObserver[] = [];
  readonly observed = new Set<Element>();
  private readonly callback: IntersectionObserverCallback;
  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback;
    FakeObserver.instances.push(this);
  }
  observe(element: Element) { this.observed.add(element); }
  unobserve(element: Element) { this.observed.delete(element); }
  disconnect() { this.observed.clear(); }
  show(target: Element, ratio: number) {
    const entry = { target, isIntersecting: ratio > 0, intersectionRatio: ratio } as IntersectionObserverEntry;
    this.callback([entry], this as unknown as IntersectionObserver);
  }
}

let visibility: DocumentVisibilityState = 'visible';
const setVisibility = (state: DocumentVisibilityState) => {
  visibility = state;
  document.dispatchEvent(new Event('visibilitychange'));
};
const latestObserver = () => FakeObserver.instances.at(-1)!;
const card = () => document.createElement('div');

let send: ReturnType<typeof vi.fn<(hashes: string[]) => void>>;
let tracker: ImpressionTracker;

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('IntersectionObserver', FakeObserver);
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => visibility });
  visibility = 'visible';
  FakeObserver.instances = [];
  send = vi.fn<(hashes: string[]) => void>();
  tracker = new ImpressionTracker(send);
});

afterEach(() => {
  tracker.disconnect();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('impression tracker', () => {
  it('reports a card that stays at least half visible for one second, sent one second later', () => {
    const element = card();
    tracker.observe(element, 'h1');
    tracker.connect();
    latestObserver().show(element, 0.6);

    vi.advanceTimersByTime(999);
    tracker.flush();
    expect(send).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(send).not.toHaveBeenCalled();
    vi.advanceTimersByTime(999);
    expect(send).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(send).toHaveBeenCalledExactlyOnceWith(['h1']);
    expect(latestObserver().observed.has(element)).toBe(false);
  });

  it('ignores cards that are under half visible or leave before the dwell time', () => {
    const element = card();
    tracker.observe(element, 'h1');
    tracker.connect();

    latestObserver().show(element, 0.4);
    vi.advanceTimersByTime(5000);
    latestObserver().show(element, 0.6);
    vi.advanceTimersByTime(500);
    latestObserver().show(element, 0);
    vi.advanceTimersByTime(5000);

    expect(send).not.toHaveBeenCalled();
  });

  it('pauses while the page is hidden and resumes for cards still in view', () => {
    const element = card();
    tracker.observe(element, 'h1');
    tracker.connect();
    latestObserver().show(element, 0.6);

    vi.advanceTimersByTime(500);
    setVisibility('hidden');
    vi.advanceTimersByTime(5000);
    expect(send).not.toHaveBeenCalled();

    setVisibility('visible');
    vi.advanceTimersByTime(1000 + 1000);
    expect(send).toHaveBeenCalledExactlyOnceWith(['h1']);
  });

  it('sends queued impressions as soon as the page is hidden', () => {
    const element = card();
    tracker.observe(element, 'h1');
    tracker.connect();
    latestObserver().show(element, 0.6);
    vi.advanceTimersByTime(1000);

    setVisibility('hidden');
    expect(send).toHaveBeenCalledExactlyOnceWith(['h1']);
  });

  it('reports each hash once per tracker', () => {
    const first = card();
    const second = card();
    tracker.observe(first, 'h1');
    tracker.observe(second, 'h1');
    tracker.connect();

    latestObserver().show(first, 1);
    latestObserver().show(second, 1);
    vi.advanceTimersByTime(1000);
    latestObserver().show(first, 1);
    vi.advanceTimersByTime(5000);

    expect(send).toHaveBeenCalledExactlyOnceWith(['h1']);
  });

  it('sends immediately once a batch fills up', () => {
    const elements = Array.from({ length: 20 }, card);
    elements.forEach((element, i) => tracker.observe(element, `h${i}`));
    tracker.connect();
    elements.forEach((element) => latestObserver().show(element, 1));

    vi.advanceTimersByTime(1000);
    expect(send).toHaveBeenCalledExactlyOnceWith(elements.map((_, i) => `h${i}`));
  });

  it('stops tracking a card once its ref is cleaned up', () => {
    const element = card();
    const cleanup = tracker.observe(element, 'h1');
    tracker.connect();
    latestObserver().show(element, 1);

    cleanup();
    vi.advanceTimersByTime(5000);
    expect(send).not.toHaveBeenCalled();
    expect(latestObserver().observed.has(element)).toBe(false);
  });

  it('observes cards registered before connecting and flushes on disconnect', () => {
    const element = card();
    tracker.observe(element, 'h1');
    expect(FakeObserver.instances).toHaveLength(0);

    tracker.connect();
    expect(latestObserver().observed.has(element)).toBe(true);
    latestObserver().show(element, 1);
    vi.advanceTimersByTime(1000);

    tracker.disconnect();
    expect(send).toHaveBeenCalledExactlyOnceWith(['h1']);
  });

  it('keeps registrations and reported hashes across reconnects, as under StrictMode', () => {
    const reported = card();
    const later = card();
    tracker.observe(reported, 'h1');
    tracker.observe(later, 'h2');
    tracker.connect();
    latestObserver().show(reported, 1);
    vi.advanceTimersByTime(1000);
    tracker.disconnect();
    expect(send).toHaveBeenCalledExactlyOnceWith(['h1']);
    send.mockClear();

    tracker.connect();
    expect(latestObserver().observed).toEqual(new Set([later]));
    latestObserver().show(later, 1);
    vi.advanceTimersByTime(1000 + 1000);
    expect(send).toHaveBeenCalledExactlyOnceWith(['h2']);
  });

  it('does not observe a card whose hash was already reported', () => {
    const first = card();
    tracker.observe(first, 'h1');
    tracker.connect();
    latestObserver().show(first, 1);
    vi.advanceTimersByTime(1000);

    const again = card();
    tracker.observe(again, 'h1');
    expect(latestObserver().observed.has(again)).toBe(false);
  });
});
