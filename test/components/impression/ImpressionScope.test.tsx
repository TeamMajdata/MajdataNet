import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ImpressionScope } from '@/contexts/ImpressionContext';
import { useImpressionRef } from '@/hooks/useImpressionRef';

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
  show(target: Element) {
    const entry = { target, isIntersecting: true, intersectionRatio: 1 } as IntersectionObserverEntry;
    this.callback([entry], this as unknown as IntersectionObserver);
  }
}

function Card({ hash }: { hash: string }) {
  return <div ref={useImpressionRef(hash)} data-hash={hash} />;
}

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const container = document.createElement('div');
let root = createRoot(container);
const fetcher = vi.fn();
const cardFor = (hash: string) => container.querySelector(`[data-hash="${hash}"]`)!;
const sentBodies = () => fetcher.mock.calls.map(([, init]) => JSON.parse(init.body));

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('IntersectionObserver', FakeObserver);
  vi.stubGlobal('fetch', fetcher);
  fetcher.mockResolvedValue({ ok: true, status: 204, text: async () => '' });
  FakeObserver.instances = [];
});

afterEach(async () => {
  await act(async () => root.unmount());
  root = createRoot(container);
  fetcher.mockReset();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('impression scope', () => {
  it('tracks only the cards inside the scope and posts them with the scope source', async () => {
    await act(async () => root.render(
      <>
        <ImpressionScope source="feed">
          <Card hash="a" />
          <Card hash="b" />
        </ImpressionScope>
        <Card hash="outside" />
      </>
    ));

    const observer = FakeObserver.instances.at(-1)!;
    expect(observer.observed).toEqual(new Set([cardFor('a'), cardFor('b')]));

    await act(async () => {
      observer.show(cardFor('a'));
      observer.show(cardFor('b'));
      vi.advanceTimersByTime(1000 + 1000);
    });

    expect(fetcher).toHaveBeenCalledExactlyOnceWith('/api3/api/recommend/impressions', expect.objectContaining({
      method: 'POST',
      keepalive: true,
      credentials: 'include',
    }));
    expect(sentBodies()).toEqual([{ source: 'feed', chartHashes: ['a', 'b'] }]);
  });

  it('does nothing for cards rendered without a scope', async () => {
    await act(async () => root.render(<Card hash="outside" />));

    expect(FakeObserver.instances).toHaveLength(0);
    await act(async () => vi.advanceTimersByTime(5000));
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('flushes pending impressions when the scope unmounts', async () => {
    await act(async () => root.render(
      <ImpressionScope source="feed">
        <Card hash="a" />
      </ImpressionScope>
    ));

    await act(async () => {
      FakeObserver.instances.at(-1)!.show(cardFor('a'));
      vi.advanceTimersByTime(1000);
    });
    expect(fetcher).not.toHaveBeenCalled();

    await act(async () => root.render(<></>));
    expect(sentBodies()).toEqual([{ source: 'feed', chartHashes: ['a'] }]);
  });

  it('swallows failed reports', async () => {
    fetcher.mockRejectedValue(new TypeError('network down'));
    await act(async () => root.render(
      <ImpressionScope source="feed">
        <Card hash="a" />
      </ImpressionScope>
    ));

    await act(async () => {
      FakeObserver.instances.at(-1)!.show(cardFor('a'));
      vi.advanceTimersByTime(1000 + 1000);
    });
    expect(fetcher).toHaveBeenCalledOnce();
  });
});
