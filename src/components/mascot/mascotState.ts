import { useSyncExternalStore } from 'react';

export const MASCOT_STORAGE_KEY = 'majdatanet.live2d-mascot.v1';
export const MASCOT_SIZE = { width: 220, height: 300 };
export const VIEWPORT_MARGIN = 12;
/** 桌面端顶栏高度（看板娘只在桌面端出现） */
export const HEADER_HEIGHT = 60;
/** 对白气泡等普通元素不进入顶栏下方的这段距离 */
export const TOP_BOUNDARY = HEADER_HEIGHT + VIEWPORT_MARGIN;
/** 模型画布顶部有一段透明区域（约占高度的 18%），头发从这里往下才开始 */
const MASCOT_TOP_INSET_RATIO = 0.18;
/** 头发离顶栏底边留的间距 */
const MASCOT_HEADER_GAP = 8;

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
  minY: number = TOP_BOUNDARY,
): MascotPosition {
  return {
    x: Math.min(Math.max(VIEWPORT_MARGIN, position.x), Math.max(VIEWPORT_MARGIN, viewport.width - size.width - VIEWPORT_MARGIN)),
    y: Math.min(Math.max(minY, position.y), Math.max(minY, viewport.height - size.height - VIEWPORT_MARGIN)),
  };
}

/**
 * 看板娘本身能往上放多高：画布顶部的透明区域可以藏到顶栏下面（顶栏层级更高，不会挡住点击），
 * 让头发正好停在顶栏下方一点点
 */
export function clampMascotPosition(
  position: MascotPosition,
  size: { width: number; height: number },
  viewport: { width: number; height: number },
): MascotPosition {
  return clampPosition(position, size, viewport, HEADER_HEIGHT + MASCOT_HEADER_GAP - Math.round(size.height * MASCOT_TOP_INSET_RATIO));
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
