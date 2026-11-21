import type { TranslationKey } from '@/i18n';
import type { RadarAxis } from '@/types/radar';

// Clockwise from the top. Colors match MajdataPlay Assets/Scenes/List.unity.
export const radarAxes: { key: RadarAxis; i18nKey: TranslationKey; fill: string; stroke: string }[] = [
  { key: 'note', i18nKey: 'song/ChartRadar.AxisNote', fill: '#ecb47b', stroke: '#da6e00' },
  { key: 'peak', i18nKey: 'song/ChartRadar.AxisPeak', fill: '#dd8377', stroke: '#c73320' },
  { key: 'sweep', i18nKey: 'song/ChartRadar.AxisSweep', fill: '#ea98bb', stroke: '#dc5690' },
  { key: 'slide_tricky', i18nKey: 'song/ChartRadar.AxisSlideTricky', fill: '#b2cfe0', stroke: '#005f97' },
  { key: 'slide_sequence', i18nKey: 'song/ChartRadar.AxisSlideSequence', fill: '#7bc4c5', stroke: '#008d8f' },
  { key: 'jack', i18nKey: 'song/ChartRadar.AxisJack', fill: '#a484d7', stroke: '#9772d1' },
];

export function getDefaultChartLevel(levels: (string | null)[]): number | undefined {
  return [6, 5, 4, 3, 2, 1, 0].find(index => levels[index]?.trim());
}

/** 解析谱面页 URL 的 `level` 参数（0–6）；该难度不存在时返回 undefined */
export function parseRequestedLevel(value: string | null, levels: (string | null)[]): number | undefined {
  if (value == null || !/^[0-6]$/.test(value)) return undefined;
  const level = Number(value);
  return levels[level]?.trim() ? level : undefined;
}
