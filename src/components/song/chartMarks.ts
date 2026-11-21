import { createContext } from 'react';

/** 评论里的谱面位置：时间（秒，按播放器显示的时间，包含开头 clock）或 combo 数 */
export interface ChartMark {
  kind: 'time' | 'combo';
  value: number;
}

/** 当前预览谱面的范围，以及跳过去的方法；谱面还没加载好时为 null */
export interface ChartMarkTarget {
  /** 播放器显示的总时长（秒） */
  length: number;
  maxCombo: number;
  jump: (mark: ChartMark) => void;
}

export const ChartMarkContext = createContext<ChartMarkTarget | null>(null);

const PREFIX = '#majview-';

export function chartMarkHref(mark: ChartMark) {
  return `${PREFIX}${mark.kind}-${mark.value}`;
}

export function parseChartMarkHref(href: string): ChartMark | null {
  const match = href.startsWith(PREFIX) && /^(time|combo)-(\d+)$/.exec(href.slice(PREFIX.length));
  return match ? { kind: match[1] as ChartMark['kind'], value: Number(match[2]) } : null;
}

export function chartMarkInRange(target: ChartMarkTarget | null, mark: ChartMark) {
  if (!target) return false;
  return mark.kind === 'time'
    ? mark.value <= target.length
    : mark.value >= 1 && mark.value <= target.maxCombo;
}
