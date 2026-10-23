/**
 * 推荐曝光追踪：卡片可见比例达到阈值并连续停留一段时间才算曝光，按 Hash 去重后攒批上报。
 * 只负责判定和攒批，发送方式由调用方注入。
 */

export const IMPRESSION_VISIBLE_RATIO = 0.5;
export const IMPRESSION_DWELL_MS = 1000;
// 尽快落库：转化只归因到已记录的曝光，看到后马上点下载也能算上
export const IMPRESSION_FLUSH_DELAY_MS = 1000;
// 攒够即发；远低于后端单次 100 个的上限
export const IMPRESSION_FLUSH_SIZE = 20;

export class ImpressionTracker {
  private readonly send: (hashes: string[]) => void;
  private readonly hashes = new Map<Element, string>();
  private readonly visible = new Set<Element>();
  private readonly timers = new Map<Element, ReturnType<typeof setTimeout>>();
  private readonly reported = new Set<string>();
  private queue: string[] = [];
  private flushTimer: ReturnType<typeof setTimeout> | undefined;
  private observer: IntersectionObserver | undefined;

  constructor(send: (hashes: string[]) => void) {
    this.send = send;
  }

  // 卡片的 ref 回调早于作用域的 effect 执行，未连接时先登记，connect 时统一观察。
  // 已上报的 Hash（例如翻回上一页）只登记不观察。
  observe(element: Element, hash: string): () => void {
    this.hashes.set(element, hash);
    if (!this.reported.has(hash)) this.observer?.observe(element);
    return () => this.forget(element);
  }

  connect(): void {
    if (this.observer) return;
    this.observer = new IntersectionObserver(this.handleEntries, { threshold: IMPRESSION_VISIBLE_RATIO });
    for (const [element, hash] of this.hashes) {
      if (!this.reported.has(hash)) this.observer.observe(element);
    }
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
    window.addEventListener('pagehide', this.flush);
  }

  // 保留登记的卡片和已上报集合，StrictMode 重新 connect 后继续生效。
  disconnect(): void {
    this.observer?.disconnect();
    this.observer = undefined;
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    window.removeEventListener('pagehide', this.flush);
    this.visible.clear();
    this.stopAllTimers();
    this.flush();
  }

  readonly flush = (): void => {
    clearTimeout(this.flushTimer);
    this.flushTimer = undefined;
    if (this.queue.length === 0) return;
    const batch = this.queue;
    this.queue = [];
    this.send(batch);
  };

  private readonly handleEntries = (entries: IntersectionObserverEntry[]): void => {
    for (const entry of entries) {
      if (entry.isIntersecting && entry.intersectionRatio >= IMPRESSION_VISIBLE_RATIO) {
        this.visible.add(entry.target);
        this.startTimer(entry.target);
      } else {
        this.visible.delete(entry.target);
        this.stopTimer(entry.target);
      }
    }
  };

  // 页面隐藏时停止计时并发出已攒的曝光；回到前台后重新计时仍在视口内的卡片。
  private readonly handleVisibilityChange = (): void => {
    if (document.visibilityState === 'hidden') {
      this.stopAllTimers();
      this.flush();
    } else {
      for (const element of this.visible) this.startTimer(element);
    }
  };

  private startTimer(element: Element): void {
    const hash = this.hashes.get(element);
    if (hash === undefined || this.reported.has(hash) || this.timers.has(element)) return;
    if (document.visibilityState === 'hidden') return;
    this.timers.set(element, setTimeout(() => {
      this.timers.delete(element);
      this.visible.delete(element);
      this.observer?.unobserve(element);
      this.record(hash);
    }, IMPRESSION_DWELL_MS));
  }

  private stopTimer(element: Element): void {
    clearTimeout(this.timers.get(element));
    this.timers.delete(element);
  }

  private stopAllTimers(): void {
    for (const timer of this.timers.values()) clearTimeout(timer);
    this.timers.clear();
  }

  private forget(element: Element): void {
    this.observer?.unobserve(element);
    this.stopTimer(element);
    this.visible.delete(element);
    this.hashes.delete(element);
  }

  private record(hash: string): void {
    if (this.reported.has(hash)) return;
    this.reported.add(hash);
    this.queue.push(hash);
    if (this.queue.length >= IMPRESSION_FLUSH_SIZE) this.flush();
    else this.flushTimer ??= setTimeout(this.flush, IMPRESSION_FLUSH_DELAY_MS);
  }
}
