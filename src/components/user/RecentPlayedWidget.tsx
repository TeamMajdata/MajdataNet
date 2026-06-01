import { useMemo } from 'react';
import useSWR from 'swr';
import { endpoints } from '@/config/api';
import { ScoreCard } from '@/components';
import { useLoc } from '@/hooks';
import type { RecentPlayedWidgetProps, RecentPlayedData, Score } from '@/types';
import { motion } from 'framer-motion';
import { LoadingSpinner } from '@/components';

type ActivityPoint = {
  label: string;
  value: number;
  x: number;
  y: number;
};

type ActivityData = {
  rangeLabel: string;
  total: number;
  today: number;
  latestLabel: string;
  points: ActivityPoint[];
  maxValue: number;
};

const fetcher = async (...args: Parameters<typeof fetch>) =>
  await fetch(...args).then(async (res) => res.json());

const CHART_WIDTH = 920;
const CHART_HEIGHT = 260;
const CHART_PADDING = { top: 34, right: 28, bottom: 44, left: 44 };
const ACTIVITY_LINE_COLOR = '#FFD166';

function parseRecentTime(value?: string): Date | null {
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

function buildActivityData(records: RecentPlayedData[]): ActivityData {
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

function RecentActivityChart({ records }: { records: RecentPlayedData[] }) {
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
    <div className="mx-auto mb-8 w-full max-w-350">
      <div className="relative overflow-hidden rounded-2xl border border-white/12 bg-[rgba(20,20,25,0.72)] p-5 shadow-[0_14px_40px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-sm font-bold text-pink-300">
              {loc('RecentPlayActivity', '最近游玩活跃度')}
            </div>
            <div className="mt-1 text-2xl font-bold text-white">
              {activity.rangeLabel} · {activity.total} {loc('Times', '次')}
            </div>
          </div>
          <div className="text-left text-sm text-white/60 sm:text-right">
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
            <filter id="recentActivityGlow" x="-20%" y="-40%" width="140%" height="180%">
              <feGaussianBlur stdDeviation="5" result="blur" />
              <feColorMatrix
                in="blur"
                type="matrix"
                values="1 0 0 0 1  0 0.75 0 0 0.62  0 0 0.25 0 0.12  0 0 0 0.65 0"
                result="glow"
              />
              <feMerge>
                <feMergeNode in="glow" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {gridLines.map((line) => (
            <g key={line.value}>
              <line
                x1={CHART_PADDING.left}
                y1={line.y}
                x2={CHART_WIDTH - CHART_PADDING.right}
                y2={line.y}
                stroke="rgba(255,255,255,0.14)"
                strokeDasharray="6 8"
              />
              <text x={CHART_PADDING.left - 12} y={line.y + 5} textAnchor="end" className="fill-white/45 text-[13px]">
                {line.value}
              </text>
            </g>
          ))}

          <path d={areaPath} fill="url(#recentActivityArea)" />
          <path d={linePath} fill="none" stroke={ACTIVITY_LINE_COLOR} strokeWidth="5" strokeLinecap="round" filter="url(#recentActivityGlow)" />

          {activity.points.map((point, index) => (
            <g key={`${point.label}-${index}`}>
              {point.value > 0 && (
                <>
                  <circle cx={point.x} cy={point.y} r="5.5" fill={ACTIVITY_LINE_COLOR} stroke="#fff7cf" strokeWidth="2" />
                  <text x={point.x} y={point.y - 12} textAnchor="middle" className="fill-[#fff7cf] text-[15px] font-bold">
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
                  className="fill-white/62 text-[13px]"
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

/**
 * 将 RecentPlayedData 转换为 Score 类型
 */
function convertToScore(data: RecentPlayedData): Score {
  const chartLevel = parseInt(data.level);

  // 构造 levels 数组，确保 levels[chartLevel] = difficulty
  const levels = new Array(chartLevel + 1).fill('');
  levels[chartLevel] = data.difficulty;

  return {
    acc: {
      dx: data.acc,
      classic: data.acc
    },
    dxScore: 0, // RecentPlayedData 中没有 dxScore
    comboState: data.comboState,
    chartLevel: chartLevel,
    hash: '', // RecentPlayedData 中没有 hash
    chartInfo: {
      id: data.chartId,
      title: data.title,
      artist: data.artist,
      designer: data.designer,
      description: '',
      levels: levels,
      uploader: data.uploader,
      timestamp: data.timestamp || '',
      hash: '',
      tags: [],
      publicTags: []
    },
    timestamp: data.timestamp || ''
  };
}

/**
 * 最近游玩记录组件
 * 显示指定用户最近游玩的谱面及成绩
 */
export default function RecentPlayedWidget({ username, onDataLoaded }: RecentPlayedWidgetProps) {
  const loc = useLoc();

  const { data, error, isLoading } = useSWR<RecentPlayedData[]>(
    endpoints.account.recent(username),
    fetcher,
    {
      onSuccess: (data) => {
        onDataLoaded?.(!!data && data.length > 0);
      },
    }
  );

  if (error) return <div className="m-auto w-full text-[50px] text-center">{loc('ServerError', '服务器错误')}</div>;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-10 w-full"><LoadingSpinner size="50px" /></div>
    );
  }

  if (!data || data.length === 0) return <p>{loc('NoRecentRecords', '暂无最近游玩记录')}</p>;
  const sortedData = [...data].sort((a, b) => {
    const timeA = parseRecentTime(a.timestamp)?.getTime() ?? 0;
    const timeB = parseRecentTime(b.timestamp)?.getTime() ?? 0;
    return timeB - timeA;
  });
  const filter_data = sortedData.slice(0, 9);
  const list = filter_data.map((recentData) => {
    const score = convertToScore(recentData);

    return (
      <motion.div
        key={recentData.chartId}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="flex max-[480px]:flex-[1_1_100%] max-[768px]:flex-[1_1_150px] justify-center w-full"
      >
        <ScoreCard score={score} showLikeButton={true} />
      </motion.div>
    );
  });

  return (
    <>
      <RecentActivityChart records={sortedData} />
      <div className="justify-center gap-[0.6rem] grid grid-cols-[repeat(auto-fit,minmax(20rem,20.6rem))] mx-auto p-2 w-full max-w-350">
        {list}
      </div>
    </>
  );
}
