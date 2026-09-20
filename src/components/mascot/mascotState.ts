export const MASCOT_STORAGE_KEY = 'majdatanet.live2d-mascot.v1';
export const MASCOT_SIZE = { width: 220, height: 300 };
export const VIEWPORT_MARGIN = 12;
export const TOP_BOUNDARY = 70 + VIEWPORT_MARGIN;

export interface MascotPosition {
  x: number;
  y: number;
}

export interface MascotPreferences {
  position?: MascotPosition;
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
