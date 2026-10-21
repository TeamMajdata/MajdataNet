import { act } from 'react';
import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Live2DMascot from '@/components/mascot/Live2DMascot';
import { MASCOT_STORAGE_KEY } from '@/components/mascot/mascotState';

const runtime = vi.hoisted(() => ({
  status: 'ready' as 'idle' | 'loading' | 'ready' | 'error',
  listeners: new Set<() => void>(),
  activate: vi.fn(),
  deactivate: vi.fn(),
  playReaction: vi.fn(() => true),
  create: vi.fn(),
}));

vi.mock('@/components/mascot/runtime', () => ({
  createMascotController: () => {
    runtime.create();
    return {
      getSnapshot: () => runtime.status,
      subscribe: (listener: () => void) => {
        runtime.listeners.add(listener);
        return () => runtime.listeners.delete(listener);
      },
      activate: runtime.activate,
      deactivate: runtime.deactivate,
      playReaction: runtime.playReaction,
      onReactionEnd: () => () => undefined,
    };
  },
}));

vi.mock('@/hooks/useI18n', () => ({
  useI18n: () => ({ i18n: (key: string) => key.split('.').at(-1) }),
}));

const testGlobals = globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean };
testGlobals.IS_REACT_ACT_ENVIRONMENT = true;

interface MediaState {
  matches: boolean;
  listeners: Set<() => void>;
}

describe('Live2DMascot', () => {
  let container: HTMLDivElement;
  let root: Root;
  let media: Map<string, MediaState>;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    runtime.status = 'ready';
    runtime.listeners.clear();
    runtime.playReaction.mockReturnValue(true);
    localStorage.clear();
    Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: 1440 });
    Object.defineProperty(window, 'innerHeight', { configurable: true, writable: true, value: 900 });
    Object.defineProperty(document, 'fullscreenElement', { configurable: true, value: null });
    media = new Map([
      ['(min-width: 769px)', { matches: true, listeners: new Set() }],
      ['(prefers-reduced-motion: reduce)', { matches: false, listeners: new Set() }],
    ]);
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: vi.fn((query: string) => {
        const state = media.get(query)!;
        return {
          get matches() { return state.matches; },
          media: query,
          addEventListener: (_type: string, listener: () => void) => state.listeners.add(listener),
          removeEventListener: (_type: string, listener: () => void) => state.listeners.delete(listener),
        };
      }),
    });
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  function render() {
    act(() => root.render(<Live2DMascot />));
  }

  function element(testId: string) {
    return container.querySelector(`[data-testid="${testId}"]`) as HTMLElement;
  }

  function click(testId: string) {
    act(() => element(testId).click());
  }

  function setMedia(query: string, matches: boolean) {
    act(() => {
      const state = media.get(query)!;
      state.matches = matches;
      state.listeners.forEach((listener) => listener());
    });
  }

  function setRuntimeStatus(status: typeof runtime.status) {
    act(() => {
      runtime.status = status;
      runtime.listeners.forEach((listener) => listener());
    });
  }

  function pointer(type: string, x: number, y: number) {
    const event = new Event(type, { bubbles: true });
    Object.assign(event, { pointerId: 1, button: 0, clientX: x, clientY: y, isPrimary: true });
    act(() => element('mascot-poke').dispatchEvent(event));
  }

  it('activates once at the lower left and stays silent until poked', () => {
    render();
    expect(runtime.activate).toHaveBeenCalledOnce();
    expect(runtime.activate).toHaveBeenCalledWith(element('mascot-canvas-host'));
    expect(element('live2d-mascot').style.left).toBe('12px');
    expect(element('live2d-mascot').style.top).toBe('588px');
    expect(element('mascot-dialogue')).toBeNull();
    expect(element('mascot-poke').tagName).toBe('BUTTON');
    expect(element('mascot-poke').getAttribute('aria-label')).toBe('Poke');
    expect(document.getElementById(element('mascot-poke').getAttribute('aria-describedby')!)?.textContent).toBe('MoveHint');
  });

  it.each(['idle', 'loading'] as const)('keeps only a hidden noninteractive host while the model is %s', (status) => {
    runtime.status = status;
    render();
    expect(runtime.activate).toHaveBeenCalledWith(element('mascot-canvas-host'));
    expect(element('mascot-canvas-host')).not.toBeNull();
    expect(element('live2d-mascot').getAttribute('aria-hidden')).toBe('true');
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('button, a[href], input, select, textarea, [tabindex]')).toBeNull();
    expect(container.querySelector('.live2d-mascot__loading')).toBeNull();
    expect(element('mascot-dialogue')).toBeNull();
    expect(runtime.playReaction).not.toHaveBeenCalled();
  });

  it('reveals the live character only after the existing loading host becomes ready', () => {
    runtime.status = 'loading';
    render();
    const host = element('mascot-canvas-host');
    expect(element('mascot-poke')).toBeNull();
    setRuntimeStatus('ready');
    expect(element('mascot-canvas-host')).toBe(host);
    expect(runtime.activate).toHaveBeenCalledOnce();
    expect(element('live2d-mascot').getAttribute('aria-hidden')).not.toBe('true');
    expect(element('mascot-poke')).not.toBeNull();
    expect(container.querySelector('img')).toBeNull();
    click('mascot-poke');
    expect(runtime.playReaction).toHaveBeenCalledOnce();
    expect(element('mascot-dialogue')).not.toBeNull();
  });

  it('shows a polite six-second response and avoids consecutive reaction groups', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    render();
    click('mascot-poke');
    expect(runtime.playReaction).toHaveBeenLastCalledWith(0);
    expect(element('mascot-dialogue').textContent).toContain('NameShy1');
    expect(element('mascot-dialogue').getAttribute('role')).toBe('status');
    expect(element('mascot-dialogue').getAttribute('aria-live')).toBe('polite');
    click('mascot-poke');
    expect(runtime.playReaction).toHaveBeenLastCalledWith(1);
    expect(element('mascot-dialogue').textContent).toContain('NameEncourage1');
    act(() => vi.advanceTimersByTime(5_999));
    expect(element('mascot-dialogue')).not.toBeNull();
    act(() => vi.advanceTimersByTime(1));
    expect(element('mascot-dialogue')).toBeNull();
  });

  it.each(['click', 'escape', 'timeout'])('dismisses dialogue by %s without hiding or reloading the character', (method) => {
    render();
    const host = element('mascot-canvas-host');
    const character = element('mascot-poke');
    const position = element('live2d-mascot').getAttribute('style');
    click('mascot-poke');
    const dismiss = element('mascot-dismiss-dialogue');
    expect(dismiss.getAttribute('aria-label')).toBe('DismissDialogue');
    dismiss.focus();
    if (method === 'click') click('mascot-dismiss-dialogue');
    else if (method === 'escape') act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })));
    else act(() => vi.advanceTimersByTime(6_000));
    expect(element('mascot-dialogue')).toBeNull();
    expect(element('mascot-canvas-host')).toBe(host);
    expect(element('mascot-poke')).toBe(character);
    expect(element('live2d-mascot').dataset.modelStatus).toBe('ready');
    expect(element('mascot-collapse')).toBeNull();
    expect(element('live2d-mascot').getAttribute('style')).toBe(position);
    expect(element('mascot-restore')).toBeNull();
    expect(runtime.activate).toHaveBeenCalledOnce();
    expect(runtime.deactivate).not.toHaveBeenCalled();
    expect(runtime.playReaction).toHaveBeenCalledOnce();
    expect(document.activeElement).toBe(character);
  });

  it('does not move focus from another control when dialogue expires', () => {
    render();
    const input = document.createElement('input');
    container.appendChild(input);
    click('mascot-poke');
    input.focus();
    act(() => vi.advanceTimersByTime(6_000));
    expect(element('mascot-dialogue')).toBeNull();
    expect(document.activeElement).toBe(input);
  });

  it('does not replace or prolong dialogue when the model rejects a busy reaction', () => {
    render();
    click('mascot-poke');
    const dialogue = element('mascot-dialogue').textContent;
    act(() => vi.advanceTimersByTime(3_000));
    runtime.playReaction.mockReturnValue(false);
    click('mascot-poke');
    expect(element('mascot-dialogue').textContent).toBe(dialogue);
    act(() => vi.advanceTimersByTime(3_000));
    expect(element('mascot-dialogue')).toBeNull();
  });

  it('moves by keyboard, persists the position, and closes dialogue with Escape', () => {
    render();
    const button = element('mascot-poke');
    button.focus();
    act(() => button.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true })));
    expect(element('live2d-mascot').style.left).toBe('28px');
    expect(JSON.parse(localStorage.getItem(MASCOT_STORAGE_KEY)!).position).toEqual({ x: 28, y: 588 });
    click('mascot-poke');
    act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })));
    expect(element('mascot-dialogue')).toBeNull();
    expect(document.activeElement).toBe(button);
  });

  it('starts dragging at six pixels and suppresses the resulting click', () => {
    render();
    const button = element('mascot-poke') as HTMLButtonElement;
    button.setPointerCapture = vi.fn();
    button.hasPointerCapture = vi.fn(() => true);
    button.releasePointerCapture = vi.fn();
    pointer('pointerdown', 100, 650);
    pointer('pointermove', 103, 652);
    expect(element('live2d-mascot').style.left).toBe('12px');
    pointer('pointermove', 120, 630);
    expect(element('live2d-mascot').style.left).toBe('32px');
    expect(element('live2d-mascot').style.top).toBe('568px');
    pointer('pointerup', 120, 630);
    click('mascot-poke');
    expect(button.setPointerCapture).toHaveBeenCalledWith(1);
    expect(button.releasePointerCapture).toHaveBeenCalledWith(1);
    expect(runtime.playReaction).not.toHaveBeenCalled();
    expect(element('mascot-dialogue')).toBeNull();
    // A later keyboard activation must not be swallowed after pointer dragging.
    act(() => button.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })));
    click('mascot-poke');
    expect(runtime.playReaction).toHaveBeenCalledOnce();
  });

  it('allows a poke when pointer movement stays below the drag threshold', () => {
    render();
    pointer('pointerdown', 100, 650);
    pointer('pointermove', 102, 652);
    pointer('pointerup', 102, 652);
    click('mascot-poke');
    expect(runtime.playReaction).toHaveBeenCalledOnce();
  });

  it('provides no collapse, restore or avatar controls', () => {
    render();
    expect(element('mascot-collapse')).toBeNull();
    expect(element('mascot-restore')).toBeNull();
    expect(container.querySelector('img')).toBeNull();
    expect(element('live2d-mascot').style.width).toBe('220px');
    expect(runtime.activate).toHaveBeenCalledOnce();
    expect(runtime.deactivate).not.toHaveBeenCalled();
  });

  it('ignores the old collapsed preference and preserves the stored position', () => {
    localStorage.setItem(MASCOT_STORAGE_KEY, JSON.stringify({ collapsed: true, position: { x: 90, y: 750 } }));
    render();
    expect(runtime.activate).toHaveBeenCalledOnce();
    expect(element('mascot-poke')).not.toBeNull();
    expect(element('mascot-restore')).toBeNull();
    expect(element('live2d-mascot').style.left).toBe('90px');
    act(() => element('mascot-poke').dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })));
    expect(JSON.parse(localStorage.getItem(MASCOT_STORAGE_KEY)!)).toEqual({ position: { x: 106, y: 588 } });
  });

  it('clamps stored positions and reclamps after the viewport becomes smaller', () => {
    localStorage.setItem(MASCOT_STORAGE_KEY, JSON.stringify({ collapsed: false, position: { x: 9_000, y: -500 } }));
    render();
    expect(element('live2d-mascot').style.left).toBe('1208px');
    expect(element('live2d-mascot').style.top).toBe('82px');
    act(() => {
      window.innerWidth = 900;
      window.dispatchEvent(new Event('resize'));
    });
    expect(element('live2d-mascot').style.left).toBe('668px');
    click('mascot-poke');
    expect(Number.parseInt(element('mascot-dialogue').style.left, 10) + 260).toBeLessThanOrEqual(888);
  });

  it('creates no UI and never activates the model on mobile', () => {
    media.get('(min-width: 769px)')!.matches = false;
    render();
    expect(container.childElementCount).toBe(0);
    expect(runtime.activate).not.toHaveBeenCalled();
    setMedia('(min-width: 769px)', true);
    expect(element('mascot-poke')).not.toBeNull();
    click('mascot-poke');
    setMedia('(min-width: 769px)', false);
    expect(container.childElementCount).toBe(0);
    expect(runtime.deactivate).toHaveBeenCalledOnce();
    setMedia('(min-width: 769px)', true);
    expect(element('mascot-dialogue')).toBeNull();
  });

  it('deactivates in fullscreen and restores the same instance on exit', () => {
    render();
    click('mascot-poke');
    act(() => {
      Object.defineProperty(document, 'fullscreenElement', { configurable: true, value: document.body });
      document.dispatchEvent(new Event('fullscreenchange'));
    });
    expect(container.childElementCount).toBe(0);
    expect(runtime.deactivate).toHaveBeenCalledOnce();
    act(() => {
      Object.defineProperty(document, 'fullscreenElement', { configurable: true, value: null });
      document.dispatchEvent(new Event('fullscreenchange'));
    });
    expect(runtime.activate).toHaveBeenCalledTimes(2);
    expect(runtime.create).toHaveBeenCalledOnce();
    expect(element('mascot-dialogue')).toBeNull();
  });

  it('keeps the desktop model available when reduced motion is enabled or changes', () => {
    media.get('(prefers-reduced-motion: reduce)')!.matches = true;
    render();
    expect(runtime.activate).toHaveBeenCalledOnce();
    expect(element('mascot-poke')).not.toBeNull();
    expect(container.querySelector('img')).toBeNull();
    click('mascot-poke');
    expect(runtime.playReaction).toHaveBeenCalledOnce();
    expect(element('mascot-dialogue')).not.toBeNull();
    setMedia('(prefers-reduced-motion: reduce)', false);
    setMedia('(prefers-reduced-motion: reduce)', true);
    expect(runtime.activate).toHaveBeenCalledOnce();
    expect(runtime.deactivate).not.toHaveBeenCalled();
    expect(element('mascot-poke')).not.toBeNull();
  });

  it('renders no avatar, controls, or focus targets when the runtime has failed', () => {
    runtime.status = 'error';
    render();
    expect(container.childElementCount).toBe(0);
    expect(container.querySelector('img, button, [tabindex]')).toBeNull();
    expect(runtime.activate).not.toHaveBeenCalled();
    expect(runtime.playReaction).not.toHaveBeenCalled();
  });

  it('removes the loading host and deactivates when model loading fails', () => {
    runtime.status = 'loading';
    render();
    expect(runtime.activate).toHaveBeenCalledOnce();
    expect(element('mascot-canvas-host')).not.toBeNull();
    setRuntimeStatus('error');
    expect(runtime.deactivate).toHaveBeenCalledOnce();
    expect(container.childElementCount).toBe(0);
    expect(container.querySelector('img, button, [tabindex]')).toBeNull();
    setMedia('(min-width: 769px)', false);
    setMedia('(min-width: 769px)', true);
    expect(runtime.activate).toHaveBeenCalledOnce();
    expect(container.childElementCount).toBe(0);
  });

  it('ignores malformed storage and remains usable if writes are blocked', () => {
    localStorage.setItem(MASCOT_STORAGE_KEY, '{broken');
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('Blocked', 'SecurityError'); });
    render();
    expect(element('mascot-poke')).not.toBeNull();
    expect(() => act(() => element('mascot-poke').dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })))).not.toThrow();
    expect(element('mascot-poke')).not.toBeNull();
  });

  it('uses default preferences when storage reads are blocked', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new DOMException('Blocked', 'SecurityError'); });
    expect(render).not.toThrow();
    expect(element('mascot-poke')).not.toBeNull();
  });
});
