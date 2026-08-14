import { useMemo } from 'react';
import { useLoc } from '@/hooks';
import type { RecentPlayedData } from '@/types';

// ─── Types ────────────────────────────────────────────────────────────────────

type ActivityPoint = {
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

const CHART_WIDTH = 920;
const CHART_HEIGHT = 260;
const CHART_PADDING = { top: 34, right: 28, bottom: 44, left: 44 };
const ACTIVITY_LINE_COLOR = '#5c8dc1';

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

function buildSmoothPath(points: ActivityPoint[]): string {
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

// ─── Component ────────────────────────────────────────────────────────────────

export default function RecentActivityChart({ records }: { records: RecentPlayedData[] }) {
  const loc = useLoc();
  const activity = useMemo(() => buildActivityData(records), [records]);

  if (activity.points.length === 0) return null;

  const linePath = buildSmoothPath(activity.points);
  const baselineY = CHART_HEIGHT - CHART_PADDING.bottom;
  const areaPath = `${linePath} L ${activity.points[activity.points.length - 1].x} ${baselineY} L ${activity.points[0].x} ${baselineY} Z`;
  const labelInterval = activity.points.length > 14 ? 3 : 1;
  const gridLines = Array.from({ length: Math.min(activity.maxValue, 4) + 1 }, (_, index) => {
    const value = Math.round((activity.maxValue * index) / Math.min(activity.maxValue, 4));
    const y = CHART_PADDING.top + (CHART_HEIGHT - CHART_PADDING.top - CHART_PADDING.bottom) * (1 - value / activity.maxValue);
    return { value, y };
  });

  return (
    <div className="mb-8 w-full">
      <div className="relative rounded-xl p-5">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-sm font-bold text-primary">
              {loc('RecentPlayActivity', '最近游玩活跃度')}
            </div>
            <div className="mt-1 text-2xl font-bold text-ink">
              {activity.rangeLabel} · {activity.total} {loc('Times', '次')}
            </div>
          </div>
          <div className="text-left text-sm text-ink-2 sm:text-right">
            <div>{loc('Today', '今日')} {activity.today} {loc('Times', '次')}</div>
            <div>{loc('LatestPlay', '最近')} {activity.latestLabel}</div>
          </div>
        </div>

        <svg className="block h-auto w-full overflow-visible" viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`} role="img">
          <defs>
            <linearGradient id="recentActivityArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={ACTIVITY_LINE_COLOR} stopOpacity="0.76" />
              <stop offset="100%" stopColor={ACTIVITY_LINE_COLOR} stopOpacity="0" />
            </linearGradient>
          </defs>

          {gridLines.map((line) => (
            <g key={line.value}>
              <line
                x1={CHART_PADDING.left}
                y1={line.y}
                x2={CHART_WIDTH - CHART_PADDING.right}
                y2={line.y}
                stroke="#e5e7eb"
                strokeDasharray="6 8"
              />
              <text x={CHART_PADDING.left - 12} y={line.y + 5} textAnchor="end" className="fill-[#9ca3af] text-[13px]">
                {line.value}
              </text>
            </g>
          ))}

          <path d={areaPath} fill="url(#recentActivityArea)" />
          <path d={linePath} fill="none" stroke={ACTIVITY_LINE_COLOR} strokeWidth="5" strokeLinecap="round" />

          {activity.points.map((point, index) => (
            <g key={`${point.label}-${index}`}>
              {point.value > 0 && (
                <>
                  <circle cx={point.x} cy={point.y} r="5.5" fill={ACTIVITY_LINE_COLOR} stroke="#ffffff" strokeWidth="2" />
                  <text x={point.x} y={point.y - 12} textAnchor="middle" className="fill-[#1f2937] text-[15px] font-bold">
                    {point.value}
                  </text>
                </>
              )}
              {index % labelInterval === 0 && (
                <text
                  x={point.x}
                  y={CHART_HEIGHT - 13}
                  textAnchor="middle"
                  transform={activity.points.length > 14 ? `rotate(35 ${point.x} ${CHART_HEIGHT - 13})` : undefined}
                  className="fill-[#6b7280] text-[13px]"
                >
                  {point.label}
                </text>
              )}
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}
