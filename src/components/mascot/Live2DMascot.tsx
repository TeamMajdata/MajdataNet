import { useCallback, useEffect, useId, useRef, useState, useSyncExternalStore } from 'react';
import type { KeyboardEvent, PointerEvent } from 'react';
import { useI18n } from '@/hooks/useI18n';
import { createMascotController } from './runtime';
import {
  chooseReaction,
  chooseDialogueVariant,
  clampPosition,
  MASCOT_SIZE,
  readPreferences,
  savePreferences,
  TOP_BOUNDARY,
  VIEWPORT_MARGIN,
} from './mascotState';
import type { MascotPosition, MascotPreferences } from './mascotState';
import './mascot.css';

const DRAG_THRESHOLD = 6;
const BUBBLE_SIZE = { width: 260, height: 84 };

function useMediaQuery(query: string): boolean {
  const subscribe = useCallback((listener: () => void) => {
    const media = window.matchMedia(query);
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [query]);
  return useSyncExternalStore(subscribe, () => window.matchMedia(query).matches, () => false);
}

function subscribeViewport(listener: () => void) {
  window.addEventListener('resize', listener);
  document.addEventListener('fullscreenchange', listener);
  return () => {
    window.removeEventListener('resize', listener);
    document.removeEventListener('fullscreenchange', listener);
  };
}

function getViewportSnapshot() {
  return `${window.innerWidth},${window.innerHeight},${Boolean(document.fullscreenElement)}`;
}

interface DragState {
  pointerId: number;
  startX: number;
  startY: number;
  origin: MascotPosition;
  moved: boolean;
}

export default function Live2DMascot() {
  const { i18n } = useI18n();
  const desktop = useMediaQuery('(min-width: 769px)');
  const viewportSnapshot = useSyncExternalStore(subscribeViewport, getViewportSnapshot, () => '0,0,false');
  const [viewportWidth, viewportHeight, fullscreen] = viewportSnapshot.split(',');
  const viewport = { width: Number(viewportWidth), height: Number(viewportHeight) };
  const eligible = desktop && fullscreen !== 'true';
  const [preferences, setPreferences] = useState(readPreferences);
  const [controller] = useState(createMascotController);
  const runtimeStatus = useSyncExternalStore(controller.subscribe, controller.getSnapshot, () => 'idle');
  const visible = eligible && runtimeStatus !== 'error';
  const [speech, setSpeech] = useState<{ reaction: 0 | 1 | 2; variant: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const hostRef = useRef<HTMLDivElement>(null);
  const characterRef = useRef<HTMLButtonElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const suppressClickRef = useRef(false);
  const previousReactionRef = useRef<0 | 1 | 2 | null>(null);
  const hintId = useId();
  const size = MASCOT_SIZE;
  const position = clampPosition(preferences.position ?? {
    x: VIEWPORT_MARGIN,
    y: viewport.height - size.height - VIEWPORT_MARGIN,
  }, size, viewport);
  const shown = runtimeStatus === 'ready';
  const dismissSpeech = useCallback(() => {
    setSpeech(null);
    if (document.activeElement?.closest('.live2d-mascot__speech')) {
      characterRef.current?.focus({ preventScroll: true });
    }
  }, []);

  useEffect(() => {
    if (!visible || !hostRef.current) return;
    controller.activate(hostRef.current);
    return () => controller.deactivate();
  }, [controller, visible]);

  useEffect(() => {
    const dismiss = () => setSpeech(null);
    const desktopMedia = window.matchMedia('(min-width: 769px)');
    document.addEventListener('fullscreenchange', dismiss);
    desktopMedia.addEventListener('change', dismiss);
    return () => {
      document.removeEventListener('fullscreenchange', dismiss);
      desktopMedia.removeEventListener('change', dismiss);
    };
  }, []);

  useEffect(() => {
    if (!speech) return;
    const timeout = window.setTimeout(dismissSpeech, 6_000);
    const dismiss = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') dismissSpeech();
    };
    document.addEventListener('keydown', dismiss);
    return () => {
      window.clearTimeout(timeout);
      document.removeEventListener('keydown', dismiss);
    };
  }, [speech, dismissSpeech]);

  const messages = [
    [i18n('shared/Live2DMascot.Shy1'), i18n('shared/Live2DMascot.Shy2')],
    [i18n('shared/Live2DMascot.Encourage1'), i18n('shared/Live2DMascot.Encourage2')],
    [i18n('shared/Live2DMascot.Cry1'), i18n('shared/Live2DMascot.Cry2')],
  ];

  function updatePreferences(next: MascotPreferences) {
    setPreferences(next);
    savePreferences(next);
  }

  function move(nextPosition: MascotPosition) {
    updatePreferences({ position: clampPosition(nextPosition, size, viewport) });
  }

  function poke() {
    const reaction = chooseReaction(previousReactionRef.current);
    if (!controller.playReaction(reaction)) return;
    previousReactionRef.current = reaction;
    setSpeech({ reaction, variant: chooseDialogueVariant() });
  }

  function handleClick() {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }
    poke();
  }

  function handlePointerDown(event: PointerEvent<HTMLButtonElement>) {
    if (event.button !== 0 || event.isPrimary === false) return;
    suppressClickRef.current = false;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      origin: position,
      moved: false,
    };
  }

  function handlePointerMove(event: PointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const deltaX = event.clientX - drag.startX;
    const deltaY = event.clientY - drag.startY;
    if (!drag.moved && Math.hypot(deltaX, deltaY) < DRAG_THRESHOLD) return;
    drag.moved = true;
    suppressClickRef.current = true;
    setDragging(true);
    move({ x: drag.origin.x + deltaX, y: drag.origin.y + deltaY });
  }

  function finishDrag(event: PointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    setDragging(false);
    if (event.type === 'pointercancel' || event.type === 'lostpointercapture') suppressClickRef.current = true;
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    const offsets: Record<string, [number, number]> = {
      ArrowLeft: [-16, 0], ArrowRight: [16, 0], ArrowUp: [0, -16], ArrowDown: [0, 16],
    };
    const offset = offsets[event.key];
    if (offset) {
      event.preventDefault();
      move({ x: position.x + offset[0], y: position.y + offset[1] });
    } else if (event.key === 'Enter' || event.key === ' ') {
      // Let the native button dispatch its click; keyboard use must survive a prior drag.
      suppressClickRef.current = false;
    }
  }

  if (!visible) return null;

  const bubblePosition = clampPosition({
    x: position.x + (size.width - BUBBLE_SIZE.width) / 2,
    y: position.y - BUBBLE_SIZE.height - 12 >= TOP_BOUNDARY
      ? position.y - BUBBLE_SIZE.height - 12
      : position.y + size.height + 12,
  }, BUBBLE_SIZE, viewport);

  return (
    <aside
      className={`live2d-mascot${dragging ? ' live2d-mascot--dragging' : ''}`}
      style={{ left: position.x, top: position.y, width: size.width, height: size.height, visibility: shown ? undefined : 'hidden' }}
      aria-label={i18n('shared/Live2DMascot.Name')}
      aria-hidden={!shown || undefined}
      data-testid="live2d-mascot"
      data-model-status={runtimeStatus}
      data-mascot-state={runtimeStatus}
    >
      <div ref={hostRef} className="live2d-mascot__canvas" data-testid="mascot-canvas-host" aria-hidden="true" />
      {shown && <button
        ref={characterRef}
        type="button"
        className="live2d-mascot__character"
        data-testid="mascot-poke"
        aria-label={i18n('shared/Live2DMascot.Poke')}
        aria-describedby={hintId}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishDrag}
        onPointerCancel={finishDrag}
        onLostPointerCapture={finishDrag}
      />}
      <span id={hintId} className="live2d-mascot__sr-only">{i18n('shared/Live2DMascot.MoveHint')}</span>
      {speech && shown && (
        <div className="live2d-mascot__speech" data-testid="mascot-dialogue" style={{ left: bubblePosition.x, top: bubblePosition.y }} role="status" aria-live="polite" aria-atomic="true">
          <span className="live2d-mascot__name">{i18n('shared/Live2DMascot.Name')}</span>
          <span>{messages[speech.reaction][speech.variant]}</span>
          <button
            type="button"
            className="live2d-mascot__dismiss"
            data-testid="mascot-dismiss-dialogue"
            onClick={dismissSpeech}
            aria-label={i18n('shared/Live2DMascot.DismissDialogue')}
            title={i18n('shared/Live2DMascot.DismissDialogue')}
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>
      )}
    </aside>
  );
}
