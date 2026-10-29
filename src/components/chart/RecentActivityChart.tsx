import { useMemo } from 'react';
import { useI18n } from '@/hooks';
import type { RecentPlayedData } from '@/types';
import {
  ACTIVITY_LINE_COLOR,
  CHART_HEIGHT,
  CHART_PADDING,
  CHART_WIDTH,
  buildActivityData,
  buildSmoothPath,
} from '@/utils/recentActivity';

export default function RecentActivityChart({ records }: { records: RecentPlayedData[] }) {
  const { i18n } = useI18n();
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
              {i18n("shared/RecentActivityChart.RecentPlayActivity", '最近游玩活跃度')}
            </div>
            <div className="mt-1 text-2xl font-bold text-white">
              {activity.rangeLabel} · {activity.total} {i18n("shared/RecentActivityChart.Times", '次')}
            </div>
          </div>
          <div className="text-left text-sm text-white/60 sm:text-right">
            <div>{i18n("shared/RecentActivityChart.Today", '今日')} {activity.today} {i18n("shared/RecentActivityChart.Times", '次')}</div>
            <div>{i18n("shared/RecentActivityChart.LatestPlay", '最近')} {activity.latestLabel}</div>
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
