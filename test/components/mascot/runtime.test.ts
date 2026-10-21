import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMascotController } from '@/components/mascot/runtime';
import type { MascotController } from '@/components/mascot/runtime';

const mock = vi.hoisted(() => ({ init: vi.fn() }));

vi.mock('l2d/dist/index.js', () => ({ init: mock.init }));

function deferred() {
  let resolve!: () => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<void>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

function fakeRuntime() {
  let loaded: () => void = () => {};
  let motionend: (group: string, index: number, file: string | null) => void = () => {};
  const loads: ReturnType<typeof deferred>[] = [];
  const runtime = {
    loads,
    load: vi.fn(() => {
      const pending = deferred();
      loads.push(pending);
      return pending.promise;
    }),
    destroy: vi.fn(),
    playMotion: vi.fn(),
    on: vi.fn((event: string, listener: typeof loaded | typeof motionend) => {
      if (event === 'loaded') loaded = listener as typeof loaded;
      if (event === 'motionend') motionend = listener as typeof motionend;
      return runtime;
    }),
    emitLoaded: () => loaded(),
    emitMotionEnd: (group: string, index = 0) => motionend(group, index, null),
  };
  return runtime;
}

describe('Live2D runtime controller', () => {
  let runtime: ReturnType<typeof fakeRuntime>;
  let controller: MascotController;
  let host: HTMLDivElement;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('requestIdleCallback', undefined);
    vi.stubGlobal('cancelIdleCallback', undefined);
    runtime = fakeRuntime();
    mock.init.mockReset().mockReturnValue(runtime);
    controller = createMascotController();
    host = document.createElement('div');
    document.body.appendChild(host);
  });

  afterEach(() => {
    controller.deactivate();
    host.remove();
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  async function start() {
    controller.activate(host);
    await vi.advanceTimersByTimeAsync(500);
    await vi.dynamicImportSettled();
  }

  async function complete(index = runtime.loads.length - 1) {
    runtime.emitLoaded();
    runtime.loads[index].resolve();
    await vi.advanceTimersByTimeAsync(0);
  }

  it('stays lazy while hidden and cancels scheduled loading before initialization', async () => {
    controller.deactivate();
    expect(controller.getSnapshot()).toBe('idle');
    expect(mock.init).not.toHaveBeenCalled();
    expect(host.childElementCount).toBe(0);

    controller.activate(host);
    expect(controller.getSnapshot()).toBe('idle');
    const canvas = host.querySelector('canvas')!;
    expect([canvas.width, canvas.height]).toEqual([440, 600]);
    expect(canvas.getAttribute('aria-hidden')).toBe('true');
    controller.deactivate();
    await vi.advanceTimersByTimeAsync(1_000);
    expect(mock.init).not.toHaveBeenCalled();
    expect(runtime.load).not.toHaveBeenCalled();
    expect(host.childElementCount).toBe(0);
  });

  it('uses the browser idle callback and cancels it when hidden', async () => {
    const requestIdle = vi.fn().mockReturnValue(17);
    const cancelIdle = vi.fn();
    vi.stubGlobal('requestIdleCallback', requestIdle);
    vi.stubGlobal('cancelIdleCallback', cancelIdle);
    controller.activate(host);
    expect(requestIdle).toHaveBeenCalledWith(expect.any(Function), { timeout: 1_200 });
    controller.deactivate();
    expect(cancelIdle).toHaveBeenCalledWith(17);
    expect(mock.init).not.toHaveBeenCalled();
  });

  it('only becomes ready after loaded and uses the MMFC model settings', async () => {
    const changed = vi.fn();
    const unsubscribe = controller.subscribe(changed);
    await start();
    expect(controller.getSnapshot()).toBe('loading');
    expect(runtime.load).toHaveBeenCalledWith({
      path: '/live2d/xiaoxiaolanbai/xiaoxiaolanbai.model3.json',
      position: [0, -0.12],
      scale: 0.84,
      logLevel: 'error',
      volume: 0,
    });
    runtime.loads[0].resolve();
    await vi.advanceTimersByTimeAsync(0);
    expect(controller.getSnapshot()).toBe('loading');
    expect(runtime.playMotion).not.toHaveBeenCalled();
    runtime.emitLoaded();
    await vi.advanceTimersByTimeAsync(0);
    expect(controller.getSnapshot()).toBe('ready');
    expect(runtime.playMotion).toHaveBeenLastCalledWith('Idle', 0, 1);
    expect(changed).toHaveBeenCalledTimes(2);
    unsubscribe();
    controller.deactivate();
    expect(changed).toHaveBeenCalledTimes(2);
  });

  it('serializes a pending load through cleanup and reactivation', async () => {
    await start();
    const canvas = host.firstChild;
    controller.deactivate();
    expect(runtime.destroy).not.toHaveBeenCalled();
    controller.activate(host);
    await vi.advanceTimersByTimeAsync(1_000);
    expect(runtime.load).toHaveBeenCalledTimes(1);
    expect(host.firstChild).toBe(canvas);

    // loaded fires inside l2d's callback, before the promise resolves.
    runtime.emitLoaded();
    await vi.advanceTimersByTimeAsync(0);
    expect(runtime.destroy).not.toHaveBeenCalled();
    expect(controller.getSnapshot()).toBe('loading');
    runtime.loads[0].resolve();
    await vi.advanceTimersByTimeAsync(0);
    expect(runtime.destroy).toHaveBeenCalledTimes(1);
    expect(controller.getSnapshot()).toBe('idle');

    await vi.advanceTimersByTimeAsync(500);
    expect(mock.init).toHaveBeenCalledTimes(1);
    expect(runtime.load).toHaveBeenCalledTimes(2);
    expect(runtime.on).toHaveBeenCalledTimes(2);
    expect(runtime.destroy.mock.invocationCallOrder[0]).toBeLessThan(runtime.load.mock.invocationCallOrder[1]);
    await complete();
    expect(controller.getSnapshot()).toBe('ready');
  });

  it('survives StrictMode setup/cleanup/setup with a single runtime and canvas', async () => {
    controller.activate(host);
    const canvas = host.firstChild;
    controller.deactivate();
    controller.activate(host);
    await vi.advanceTimersByTimeAsync(500);
    await vi.dynamicImportSettled();
    await complete();
    expect(mock.init).toHaveBeenCalledTimes(1);
    expect(runtime.load).toHaveBeenCalledTimes(1);
    expect(host.firstChild).toBe(canvas);
    expect(host.querySelectorAll('canvas')).toHaveLength(1);
  });

  it('reuses the runtime after ready models are hidden for a viewport or fullscreen change', async () => {
    await start();
    await complete();
    const canvas = host.firstChild;
    for (let index = 0; index < 3; index += 1) {
      controller.deactivate();
      expect(host.childElementCount).toBe(0);
      expect(controller.getSnapshot()).toBe('idle');
      await start();
      await complete();
      expect(host.firstChild).toBe(canvas);
      expect(controller.getSnapshot()).toBe('ready');
    }
    expect(mock.init).toHaveBeenCalledTimes(1);
    expect(runtime.on).toHaveBeenCalledTimes(2);
    expect(runtime.destroy).toHaveBeenCalledTimes(3);
  });

  it('times out a resolved load without loaded and never retries during this document', async () => {
    await start();
    runtime.loads[0].resolve();
    await vi.advanceTimersByTimeAsync(14_999);
    expect(controller.getSnapshot()).toBe('loading');
    await vi.advanceTimersByTimeAsync(1);
    expect(controller.getSnapshot()).toBe('error');
    expect(host.childElementCount).toBe(0);
    expect(runtime.destroy).toHaveBeenCalledTimes(1);

    controller.deactivate();
    controller.activate(host);
    await vi.advanceTimersByTimeAsync(20_000);
    expect(runtime.load).toHaveBeenCalledTimes(1);
    expect(controller.getSnapshot()).toBe('error');
    expect(host.childElementCount).toBe(0);
  });

  it('waits for late loaded and load settlement after timeout before destroying once', async () => {
    await start();
    controller.deactivate();
    controller.activate(host);
    await vi.advanceTimersByTimeAsync(15_000);
    expect(controller.getSnapshot()).toBe('error');
    expect(runtime.destroy).not.toHaveBeenCalled();
    expect(host.childElementCount).toBe(0);

    // As in Cubism6, loaded can run while the loader still uses its managers.
    runtime.emitLoaded();
    await vi.advanceTimersByTimeAsync(0);
    expect(runtime.destroy).not.toHaveBeenCalled();
    runtime.loads[0].resolve();
    await vi.advanceTimersByTimeAsync(0);
    expect(runtime.destroy).toHaveBeenCalledTimes(1);
    expect(controller.getSnapshot()).toBe('error');
    expect(runtime.playMotion).not.toHaveBeenCalled();
    expect(host.childElementCount).toBe(0);
    runtime.emitLoaded();
    controller.activate(host);
    await vi.advanceTimersByTimeAsync(1_000);
    expect(runtime.load).toHaveBeenCalledTimes(1);
    expect(runtime.destroy).toHaveBeenCalledTimes(1);
  });

  it('retains an indefinitely pending failed loader without destroying or restarting it', async () => {
    await start();
    await vi.advanceTimersByTimeAsync(15_000);
    controller.deactivate();
    controller.activate(host);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(controller.getSnapshot()).toBe('error');
    expect(host.childElementCount).toBe(0);
    expect(runtime.destroy).not.toHaveBeenCalled();
    expect(runtime.load).toHaveBeenCalledTimes(1);
    expect(mock.init).toHaveBeenCalledTimes(1);
  });

  it('falls back on load rejection and contains cleanup failures', async () => {
    await start();
    runtime.destroy.mockImplementation(() => { throw new Error('context lost'); });
    runtime.loads[0].reject(new Error('network failed'));
    await vi.advanceTimersByTimeAsync(0);
    expect(controller.getSnapshot()).toBe('error');
    expect(controller.playReaction(0)).toBe(false);
    expect(() => controller.deactivate()).not.toThrow();
    expect(host.childElementCount).toBe(0);
  });

  it('locks reactions until TapBody ends and returns to Idle', async () => {
    const ended = vi.fn();
    controller.onReactionEnd(ended);
    expect(controller.playReaction(0)).toBe(false);
    await start();
    await complete();
    expect(controller.playReaction(1)).toBe(true);
    expect(runtime.playMotion).toHaveBeenLastCalledWith('TapBody', 1, 3);
    expect(controller.playReaction(2)).toBe(false);
    runtime.emitMotionEnd('Idle');
    runtime.emitMotionEnd('TapBody', 0);
    expect(ended).not.toHaveBeenCalled();
    runtime.emitMotionEnd('TapBody', 1);
    expect(ended).toHaveBeenCalledTimes(1);
    expect(runtime.playMotion).toHaveBeenLastCalledWith('Idle', 0, 1);
    expect(controller.playReaction(2)).toBe(true);
  });

  it('unlocks reactions after nine seconds and clears reaction timers when hidden', async () => {
    const ended = vi.fn();
    const unsubscribe = controller.onReactionEnd(ended);
    await start();
    await complete();
    controller.playReaction(0);
    await vi.advanceTimersByTimeAsync(8_999);
    expect(controller.playReaction(1)).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(ended).toHaveBeenCalledTimes(1);
    expect(runtime.playMotion).toHaveBeenLastCalledWith('Idle', 0, 1);
    expect(controller.playReaction(1)).toBe(true);
    controller.deactivate();
    expect(ended).toHaveBeenCalledTimes(2);
    const motions = runtime.playMotion.mock.calls.length;
    await vi.advanceTimersByTimeAsync(9_000);
    expect(runtime.playMotion).toHaveBeenCalledTimes(motions);
    expect(ended).toHaveBeenCalledTimes(2);
    unsubscribe();
    await start();
    await complete();
    controller.playReaction(2);
    runtime.emitMotionEnd('TapBody', 2);
    expect(ended).toHaveBeenCalledTimes(2);
  });

  it('does not destroy models for document visibility changes', async () => {
    await start();
    await complete();
    document.dispatchEvent(new Event('visibilitychange'));
    expect(runtime.destroy).not.toHaveBeenCalled();
    expect(controller.getSnapshot()).toBe('ready');
  });
});
