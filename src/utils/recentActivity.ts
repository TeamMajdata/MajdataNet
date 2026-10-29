/**
 * 最近游玩活跃度图表的数据计算（纯函数，与组件分离以满足 fast-refresh 约束）
 */
import type { RecentPlayedData } from '@/types';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ActivityPoint = {
  label: string;
  value: number;
  x: number;
  y: number;
};

export type ActivityData = {
  rangeLabel: string;
  total: number;
  today: number;
  latestLabel: string;
  points: ActivityPoint[];
  maxValue: number;
};

// ─── Constants ────────────────────────────────────────────────────────────────

export const CHART_WIDTH = 920;
export const CHART_HEIGHT = 260;
export const CHART_PADDING = { top: 34, right: 28, bottom: 44, left: 44 };
export const ACTIVITY_LINE_COLOR = '#FFD166';

// ─── Time utilities ───────────────────────────────────────────────────────────

export function parseRecentTime(value?: string): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function startOfLocalDay(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function formatDateLabel(value: Date): string {
  return `${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
}

function formatTimeLabel(value: Date | null): string {
  if (!value) return '暂无记录';
  return `${formatDateLabel(value)} ${String(value.getHours()).padStart(2, '0')}:${String(value.getMinutes()).padStart(2, '0')}`;
}

// ─── Chart math ───────────────────────────────────────────────────────────────

export function buildSmoothPath(points: ActivityPoint[]): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

  const commands = [`M ${points[0].x} ${points[0].y}`];
  for (let i = 0; i < points.length - 1; i += 1) {
    const current = points[i];
    const next = points[i + 1];
    const previous = points[i - 1] || current;
    const following = points[i + 2] || next;
    const smoothing = 0.2;
    const cp1x = current.x + (next.x - previous.x) * smoothing;
    const cp1y = current.y + (next.y - previous.y) * smoothing;
    const cp2x = next.x - (following.x - current.x) * smoothing;
    const cp2y = next.y - (following.y - current.y) * smoothing;
    commands.push(`C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${next.x} ${next.y}`);
  }

  return commands.join(' ');
}

export function buildActivityData(records: RecentPlayedData[]): ActivityData {
  const now = new Date();
  const todayStart = startOfLocalDay(now);
  const parsedTimes = records
    .map((record) => parseRecentTime(record.timestamp))
    .filter((value): value is Date => value !== null)
    .sort((a, b) => a.getTime() - b.getTime());

  const fallback = {
    rangeLabel: '最近游玩',
    total: records.length,
    today: 0,
    latestLabel: records.length > 0 ? '未知时间' : '暂无记录',
    points: [],
    maxValue: 0,
  };

  if (parsedTimes.length === 0) return fallback;

  const oldest = parsedTimes[0];
  const latest = parsedTimes[parsedTimes.length - 1];
  const oldestAgeDays = Math.max(
    0,
    Math.floor((todayStart.getTime() - startOfLocalDay(oldest).getTime()) / 86400000)
  );
  const rangeDays = oldestAgeDays <= 6 ? 7 : oldestAgeDays <= 13 ? 14 : 30;
  const firstDay = new Date(todayStart);
  firstDay.setDate(todayStart.getDate() - rangeDays + 1);
  const counts = Array.from({ length: rangeDays }, () => 0);

  parsedTimes.forEach((time) => {
    const dayIndex = Math.floor((startOfLocalDay(time).getTime() - firstDay.getTime()) / 86400000);
    if (dayIndex >= 0 && dayIndex < counts.length) {
      counts[dayIndex] += 1;
    }
  });

  const total = counts.reduce((sum, count) => sum + count, 0);
  const today = counts[counts.length - 1] || 0;
  const maxValue = Math.max(1, ...counts);
  const plotWidth = CHART_WIDTH - CHART_PADDING.left - CHART_PADDING.right;
  const plotHeight = CHART_HEIGHT - CHART_PADDING.top - CHART_PADDING.bottom;
  const points = counts.map((count, index) => {
    const date = new Date(firstDay);
    date.setDate(firstDay.getDate() + index);
    const x = CHART_PADDING.left + (counts.length === 1 ? 0 : (plotWidth * index) / (counts.length - 1));
    const y = CHART_PADDING.top + plotHeight - (count / maxValue) * plotHeight;
    return {
      label: formatDateLabel(date),
      value: count,
      x,
      y,
    };
  });

  return {
    rangeLabel: `近 ${rangeDays} 天`,
    total,
    today,
    latestLabel: formatTimeLabel(latest),
    points,
    maxValue,
  };
}
