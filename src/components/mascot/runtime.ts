import type { L2D } from 'l2d/dist/index.js';

export type MascotModelStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface MascotController {
  getSnapshot: () => MascotModelStatus;
  subscribe: (listener: () => void) => () => void;
  activate: (host: HTMLElement) => void;
  deactivate: () => void;
  playReaction: (index: 0 | 1 | 2) => boolean;
  onReactionEnd: (listener: () => void) => () => void;
}

const MODEL_PATH = '/live2d/xiaoxiaolanbai/xiaoxiaolanbai.model3.json';
const LOAD_TIMEOUT = 15_000;
const REACTION_TIMEOUT = 9_000;

interface LoadAttempt {
  cancelled: boolean;
  loaded: boolean;
  settled: boolean;
  startedRuntime: boolean;
  timeout: number;
}

/**
 * Keep this controller for the lifetime of the app, including while hidden.
 * l2d's constructor registers window listeners that destroy() does not remove.
 * Reusing its runtime and canvas avoids accumulating those listeners.
 */
export function createMascotController(): MascotController {
  let status: MascotModelStatus = 'idle';
  let host: HTMLElement | null = null;
  let canvas: HTMLCanvasElement | null = null;
  let runtime: L2D | null = null;
  let attempt: LoadAttempt | null = null;
  let modelReady = false;
  let failed = false;
  let cancelIdle: (() => void) | null = null;
  let reaction: number | null = null;
  let reactionTimer: number | null = null;
  const listeners = new Set<() => void>();
  const reactionListeners = new Set<() => void>();

  function setStatus(next: MascotModelStatus) {
    if (next === status) return;
    status = next;
    listeners.forEach((listener) => listener());
  }

  function clearReaction() {
    if (reactionTimer !== null) window.clearTimeout(reactionTimer);
    reactionTimer = null;
    const wasReacting = reaction !== null;
    reaction = null;
    if (wasReacting) reactionListeners.forEach((listener) => listener());
  }

  function destroyModel() {
    modelReady = false;
    clearReaction();
    try {
      runtime?.destroy();
    } catch {
      // A partially initialized WebGL context can fail during library cleanup.
      // Never restart that context or let an optional decoration crash the app.
      failed = true;
      canvas?.remove();
      setStatus('error');
    }
  }

  function fail() {
    failed = true;
    if (attempt) window.clearTimeout(attempt.timeout);
    cancelIdle?.();
    cancelIdle = null;
    canvas?.remove();
    setStatus('error');
    clearReaction();
    // l2d's outstanding asset callbacks still reference its model managers.
    // Destroying a pending load would null those managers before the callbacks
    // finish. Retain this attempt as the owner until its promise settles, even
    // though the decoration is now completely hidden.
    if (attempt) finishAttempt(attempt);
    else if (modelReady) destroyModel();
  }

  function attachCanvas() {
    if (host && canvas && !failed && canvas.parentNode !== host) {
      host.appendChild(canvas);
    }
  }

  function finishAttempt(current: LoadAttempt) {
    if (attempt !== current || !current.settled) return;
    // load() may resolve without emitting loaded on a fetch/WebGL failure.
    // Its resolution must never be treated as a successful model load.
    if (!failed && !current.loaded && current.startedRuntime) return;
    window.clearTimeout(current.timeout);
    attempt = null;
    if (failed || current.cancelled || !host) {
      if (current.startedRuntime) destroyModel();
      if (!failed) {
        setStatus('idle');
        scheduleLoad();
      }
      return;
    }
    modelReady = true;
    attachCanvas();
    try {
      runtime?.playMotion('Idle', 0, 1);
      setStatus('ready');
    } catch {
      fail();
    }
  }

  function loaded() {
    const current = attempt;
    if (!current) return;
    current.loaded = true;
    window.clearTimeout(current.timeout);
    // Do not release the model inside l2d's rendering/onLoaded callback. It is
    // still on the stack and its load promise has not necessarily settled yet.
    queueMicrotask(() => finishAttempt(current));
  }

  function endReaction() {
    if (reaction === null) return;
    clearReaction();
    if (!modelReady || !host || failed) return;
    try {
      runtime?.playMotion('Idle', 0, 1);
    } catch {
      fail();
    }
  }

  async function loadModel() {
    if (!host || failed || attempt || modelReady) return;
    const current: LoadAttempt = {
      cancelled: false,
      loaded: false,
      settled: false,
      startedRuntime: false,
      timeout: 0,
    };
    attempt = current;
    setStatus('loading');
    current.timeout = window.setTimeout(() => {
      if (attempt !== current) return;
      // This is terminal for the document. No replacement load can race a
      // pending network request that l2d does not expose a way to cancel.
      fail();
    }, LOAD_TIMEOUT);

    try {
      if (!runtime) {
        const { init } = await import('l2d/dist/index.js');
        if (failed || current.cancelled || !host) return;
        runtime = init(canvas!);
        runtime.on('loaded', loaded);
        runtime.on('motionend', (group, index) => {
          if (group === 'TapBody' && index === reaction) endReaction();
        });
      }
      if (failed || current.cancelled || !host) return;
      current.startedRuntime = true;
      await runtime.load({
        path: MODEL_PATH,
        position: [0, -0.12],
        scale: 0.84,
        logLevel: 'error',
        volume: 0,
      });
    } catch {
      fail();
    } finally {
      current.settled = true;
      finishAttempt(current);
    }
  }

  function scheduleLoad() {
    if (!host || failed || attempt || modelReady || cancelIdle) return;
    const start = () => {
      cancelIdle = null;
      void loadModel();
    };
    if (typeof window.requestIdleCallback === 'function') {
      const handle = window.requestIdleCallback(start, { timeout: 1_200 });
      cancelIdle = () => window.cancelIdleCallback(handle);
    } else {
      const handle = window.setTimeout(start, 500);
      cancelIdle = () => window.clearTimeout(handle);
    }
  }

  return {
    getSnapshot: () => status,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    activate: (nextHost) => {
      host = nextHost;
      if (failed) return;
      if (!canvas) {
        canvas = document.createElement('canvas');
        canvas.width = 440;
        canvas.height = 600;
        canvas.className = 'live2d-mascot__canvas';
        canvas.setAttribute('aria-hidden', 'true');
      }
      attachCanvas();
      if (attempt) setStatus('loading');
      scheduleLoad();
    },
    deactivate: () => {
      host = null;
      cancelIdle?.();
      cancelIdle = null;
      canvas?.remove();
      clearReaction();
      if (attempt) {
        // The same runtime cannot load again until the previous async work has
        // finished. This also covers React StrictMode's setup/cleanup/setup.
        attempt.cancelled = true;
        finishAttempt(attempt);
      } else if (modelReady) {
        destroyModel();
      }
      if (!failed) setStatus('idle');
    },
    playReaction: (index) => {
      if (!host || !modelReady || failed || reaction !== null) return false;
      reaction = index;
      reactionTimer = window.setTimeout(endReaction, REACTION_TIMEOUT);
      try {
        runtime!.playMotion('TapBody', index, 3);
        return true;
      } catch {
        fail();
        return false;
      }
    },
    onReactionEnd: (listener) => {
      reactionListeners.add(listener);
      return () => { reactionListeners.delete(listener); };
    },
  };
}
