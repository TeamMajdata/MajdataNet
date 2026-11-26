/**
 * 预览设置，存在 localStorage 里（JSON）。
 *
 * 音量和 Play 一样是线性倍数，0.0–2.0、步长 0.1，1.0 是原样，超过 1.0 是增益；默认 1.0，Tap 0.7，Slide 默认关掉。
 * 界面上主要给三个：音乐、Answer、打击音；打击音是总闸（Play 里没有），乘在每一类打击音上。
 * clock 固定 1.0，不提供调节。
 */
export const VIEW_FIELDS = [
  { key: 'Offset', min: -500, max: 500, value: 0 },
  // 在谱面自带的 &first 上再加的偏移：正值让整张谱面（音符和打击音）整体晚一点
  { key: 'FirstOffset', min: -500, max: 500, value: 0 },
  // 默认值和 Play 一致：流速 7.5，背景暗度 80%
  { key: 'NoteSpeed', min: 1, max: 200, value: 75 },
  { key: 'TouchSpeed', min: 1, max: 200, value: 75 },
  { key: 'BGCover', min: 0, max: 10, value: 8 },
] as const;

export const MAIN_VOLUMES = ['Master', 'BGM', 'Answer', 'Effects'] as const;
export const EFFECT_VOLUMES = ['Judge', 'EX', 'Break', 'Slide', 'Touch', 'Hanabi'] as const;
export const VOLUME_RANGE = { min: 0, max: 2, step: 0.1 } as const;

const DEFAULT_VOLUME: Record<VolumeKey, number> = {
  Master: 1, BGM: 1, Answer: 1, Effects: 1, Judge: 0.7, EX: 1, Break: 1, Slide: 0, Touch: 1, Hanabi: 1,
};

export type VolumeKey = typeof MAIN_VOLUMES[number] | typeof EFFECT_VOLUMES[number];
export type SettingKey = typeof VIEW_FIELDS[number]['key'] | VolumeKey;
export type ViewSettings = Record<SettingKey, number> & { Combo: boolean; Counter: boolean; Perf: boolean; Gestures: boolean; SlideClassic: boolean };
export type Channel = Exclude<VolumeKey, 'Effects' | 'Master'> | 'Clock';

// 开发中用过百分比格式的 MajViewSettings，换个名字不读它
const STORAGE_KEY = 'MajViewSettingsV2';
// 旧版 Unity 播放器的设置（逗号分隔），格式见 migrateLegacySettings
const LEGACY_KEY = 'MajdataSettings';

const clamp = (value: unknown, min: number, max: number, fallback: number) =>
  typeof value === 'number' && Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : fallback;

export function defaultSettings(): ViewSettings {
  return parseSettings({});
}

/**
 * 旧版 Unity 播放器（MajdataView_web）的 `MajdataSettings` 是一行逗号分隔的值，顺序来自
 * `Assets/Scripts/SettingsManager.cs` 的 `GetSliderValues()`：
 *
 *   sliders  = Offset, NoteSpeed, TouchSpeed, BGCover          （更早的 build 前面还有 TargetFPS）
 *   channels = BGM, Answer, Judge, Slide, Break, EX, Touch, Hanabi, Others   （单位 dB）
 *   combo    = 1 / 0
 *
 * 只迁移流速、背景暗度和连击数：
 * - 偏移不迁移。旧版的 Offset 是给 Unity 播放器校准的，新版还有谱面自带的 `&first` 和独立的
 *   First 偏移，直接搬会让整张谱面莫名其妙地挪一段，所以一律从 0 开始；
 * - 音量不迁移。旧版是 dB（拿不到混音器的基准音量），新版是线性倍数，换算不可靠。
 *
 * 字段数对不上（旧版本增减过项目）时整份跳过，回退到默认值，不要凭空猜。
 */
export function migrateLegacySettings(raw: string | null): Record<string, unknown> | null {
  if (!raw) return null;
  const values = raw.split(',').map((value) => value.trim());
  // 4 个滑条 + 9 个声道 + 连击 = 14；早期 build 多一个 TargetFPS = 15
  if (values.length !== 14 && values.length !== 15) return null;
  const combo = values.at(-1);
  if (combo !== '0' && combo !== '1') return null;
  const base = values.length === 15 ? 1 : 0;
  const numbers = values.slice(0, -1).map(Number);
  if (numbers.some((value) => !Number.isFinite(value))) return null;
  return {
    NoteSpeed: numbers[base + 1],
    TouchSpeed: numbers[base + 2],
    BGCover: numbers[base + 3],
    Combo: combo === '1',
  };
}

export function loadSettings(): ViewSettings {
  let saved: Record<string, unknown> = {};
  try {
    const json = localStorage.getItem(STORAGE_KEY);
    if (json) saved = JSON.parse(json);
    else saved = migrateLegacySettings(localStorage.getItem(LEGACY_KEY)) ?? {};
  } catch { /* 无痕模式或数据损坏时用默认值 */ }
  return parseSettings(saved);
}

function parseSettings(saved: Record<string, unknown>): ViewSettings {
  // 开关项：连击数、物量、性能信息、手势（默认都开，性能信息默认关）
  const settings = {
    Combo: saved.Combo !== false,
    Counter: saved.Counter !== false,
    Perf: saved.Perf === true,
    Gestures: saved.Gestures !== false,
    // Play 的 SlideSortOrder：默认 Modern（旧 Slide 在上），打开后是 Classic（新 Slide 在上）
    SlideClassic: saved.SlideClassic === true,
  } as ViewSettings;
  for (const { key, min, max, value } of VIEW_FIELDS) settings[key] = clamp(saved[key], min, max, value);
  for (const key of [...MAIN_VOLUMES, ...EFFECT_VOLUMES]) {
    settings[key] = Math.round(clamp(saved[key], VOLUME_RANGE.min, VOLUME_RANGE.max, DEFAULT_VOLUME[key]) * 10) / 10;
  }
  return settings;
}

export function saveSettings(settings: ViewSettings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch { /* 存不了就只在本次生效 */ }
}

/** 每个声道最终的线性增益；Master 乘在全部声道上（clock 也一起） */
export function channelGains(settings: ViewSettings): Record<Channel, number> {
  const master = settings.Master;
  const gains = { BGM: settings.BGM * master, Answer: settings.Answer * master, Clock: master } as Record<Channel, number>;
  for (const key of EFFECT_VOLUMES) gains[key] = settings[key] * settings.Effects * master;
  return gains;
}
