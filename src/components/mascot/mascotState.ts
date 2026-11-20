import { useSyncExternalStore } from 'react';

export const MASCOT_STORAGE_KEY = 'majdatanet.live2d-mascot.v1';
export const MASCOT_SIZE = { width: 220, height: 300 };
export const VIEWPORT_MARGIN = 12;
export const TOP_BOUNDARY = 70 + VIEWPORT_MARGIN;

export interface MascotPosition {
  x: number;
  y: number;
}

/** 右键菜单里可选的三档大小（相对 MASCOT_SIZE 的倍数） */
export const MASCOT_SCALES = [0.75, 1, 1.25] as const;
export type MascotScale = typeof MASCOT_SCALES[number];

export interface MascotPreferences {
  position?: MascotPosition;
  scale?: MascotScale;
  /** 右键菜单“隐藏”后为 true，可在页脚重新显示 */
  hidden?: boolean;
}

export function clampPosition(
  position: MascotPosition,
  size: { width: number; height: number },
  viewport: { width: number; height: number },
): MascotPosition {
  return {
    x: Math.min(Math.max(VIEWPORT_MARGIN, position.x), Math.max(VIEWPORT_MARGIN, viewport.width - size.width - VIEWPORT_MARGIN)),
    y: Math.min(Math.max(TOP_BOUNDARY, position.y), Math.max(TOP_BOUNDARY, viewport.height - size.height - VIEWPORT_MARGIN)),
  };
}

export function readPreferences(): MascotPreferences {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(MASCOT_STORAGE_KEY) ?? 'null');
    if (!value || typeof value !== 'object') return {};
    const saved = value as Partial<MascotPreferences>;
    const position = saved.position;
    return {
      ...(position && Number.isFinite(position.x) && Number.isFinite(position.y)
        ? { position: { x: position.x, y: position.y } }
        : {}),
      ...(MASCOT_SCALES.includes(saved.scale as MascotScale) && saved.scale !== 1 ? { scale: saved.scale } : {}),
      ...(saved.hidden === true ? { hidden: true } : {}),
    };
  } catch {
    return {};
  }
}

export function savePreferences(preferences: MascotPreferences): void {
  try {
    localStorage.setItem(MASCOT_STORAGE_KEY, JSON.stringify(preferences));
  } catch {
    // Decoration remains usable when browser storage is unavailable.
  }
}

export function chooseReaction(previous: number | null): 0 | 1 | 2 {
  const choices = ([0, 1, 2] as const).filter((reaction) => reaction !== previous);
  return choices[Math.floor(Math.random() * choices.length)];
}

export function chooseDialogueVariant(): 0 | 1 {
  return Math.random() < 0.5 ? 0 : 1;
}

// ---- 共享的偏好设置：看板娘本身和页脚的“显示”按钮都订阅这一份 ----

const listeners = new Set<() => void>();
let cachedRaw: string | null | undefined;
let cached: MascotPreferences = {};

function readRaw(): string | null | undefined {
  try {
    return localStorage.getItem(MASCOT_STORAGE_KEY);
  } catch {
    return undefined; // 读不了存储时沿用内存里的值
  }
}

/** 按存储里的原始字符串缓存，字符串不变就返回同一个对象 */
export function getMascotPreferences(): MascotPreferences {
  const raw = readRaw();
  if (raw !== undefined && raw !== cachedRaw) {
    cachedRaw = raw;
    cached = readPreferences();
  }
  return cached;
}

export function setMascotPreferences(next: MascotPreferences): void {
  cached = next;
  savePreferences(next);
  const raw = readRaw();
  if (raw !== undefined) cachedRaw = raw === JSON.stringify(next) ? raw : cachedRaw;
  listeners.forEach((listener) => listener());
}

export function updateMascotPreferences(patch: Partial<MascotPreferences>): void {
  const next: MascotPreferences = { ...getMascotPreferences(), ...patch };
  if (!next.hidden) delete next.hidden;
  if (next.scale === 1) delete next.scale;
  setMascotPreferences(next);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === MASCOT_STORAGE_KEY) listener();
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}

export function useMascotPreferences(): MascotPreferences {
  return useSyncExternalStore(subscribe, getMascotPreferences, () => cached);
}
