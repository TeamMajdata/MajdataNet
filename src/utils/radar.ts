import type { RadarAxis } from '@/types/radar';

// Clockwise from the top. Colors match MajdataPlay Assets/Scenes/List.unity.
// label is the zh fallback for i18nKey.
export const radarAxes: { key: RadarAxis; i18nKey: string; label: string; fill: string; stroke: string }[] = [
  { key: 'note', i18nKey: 'song/ChartRadar.AxisNote', label: '物量', fill: '#ecb47b', stroke: '#da6e00' },
  { key: 'peak', i18nKey: 'song/ChartRadar.AxisPeak', label: '爆发', fill: '#dd8377', stroke: '#c73320' },
  { key: 'sweep', i18nKey: 'song/ChartRadar.AxisSweep', label: '扫键', fill: '#ea98bb', stroke: '#dc5690' },
  { key: 'slide_tricky', i18nKey: 'song/ChartRadar.AxisSlideTricky', label: '错位', fill: '#b2cfe0', stroke: '#005f97' },
  { key: 'slide_sequence', i18nKey: 'song/ChartRadar.AxisSlideSequence', label: '星星阵', fill: '#7bc4c5', stroke: '#008d8f' },
  { key: 'jack', i18nKey: 'song/ChartRadar.AxisJack', label: '纵连', fill: '#a484d7', stroke: '#9772d1' },
];

export function getDefaultChartLevel(levels: (string | null)[]): number | undefined {
  return [6, 5, 4, 3, 2, 1, 0].find(index => levels[index]?.trim());
}
