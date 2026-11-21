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

export const MAIN_VOLUMES = ['BGM', 'Answer', 'Effects'] as const;
export const EFFECT_VOLUMES = ['Judge', 'EX', 'Break', 'Slide', 'Touch', 'Hanabi'] as const;
export const VOLUME_RANGE = { min: 0, max: 2, step: 0.1 } as const;

const DEFAULT_VOLUME: Record<VolumeKey, number> = {
  BGM: 1, Answer: 1, Effects: 1, Judge: 0.7, EX: 1, Break: 1, Slide: 0, Touch: 1, Hanabi: 1,
};

export type VolumeKey = typeof MAIN_VOLUMES[number] | typeof EFFECT_VOLUMES[number];
export type SettingKey = typeof VIEW_FIELDS[number]['key'] | VolumeKey;
export type ViewSettings = Record<SettingKey, number> & { Combo: boolean; Perf: boolean };
export type Channel = Exclude<VolumeKey, 'Effects'> | 'Clock';

// 开发中用过百分比格式的 MajViewSettings，换个名字不读它
const STORAGE_KEY = 'MajViewSettingsV2';
// 旧版 Unity 播放器的设置（逗号分隔，音量是分贝），只取非音量的几项
const LEGACY_KEY = 'MajdataSettings';

const clamp = (value: unknown, min: number, max: number, fallback: number) =>
  typeof value === 'number' && Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : fallback;

export function defaultSettings(): ViewSettings {
  return parseSettings({});
}

export function loadSettings(): ViewSettings {
  let saved: Record<string, unknown> = {};
  try {
    const json = localStorage.getItem(STORAGE_KEY);
    if (json) saved = JSON.parse(json);
    else {
      const legacy = localStorage.getItem(LEGACY_KEY)?.split(',') ?? [];
      VIEW_FIELDS.forEach(({ key }, i) => { if (legacy[i] !== undefined) saved[key] = Number(legacy[i]); });
      if (legacy[13] !== undefined) saved.Combo = legacy[13] === '1';
    }
  } catch { /* 无痕模式或数据损坏时用默认值 */ }
  return parseSettings(saved);
}

function parseSettings(saved: Record<string, unknown>): ViewSettings {
  // 性能信息（默认关闭）和连击数都是开关，数值项走 VIEW_FIELDS
  const settings = { Combo: saved.Combo !== false, Perf: saved.Perf === true } as ViewSettings;
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

/** 每个声道最终的线性增益 */
export function channelGains(settings: ViewSettings): Record<Channel, number> {
  const gains = { BGM: settings.BGM, Answer: settings.Answer, Clock: 1 } as Record<Channel, number>;
  for (const key of EFFECT_VOLUMES) gains[key] = settings[key] * settings.Effects;
  return gains;
}
