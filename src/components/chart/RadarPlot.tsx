import { useTranslation } from 'react-i18next';
import { motion, useReducedMotion } from 'framer-motion';
import { radarAxes } from '@/utils/radar';
import type { RadarAxis } from '@/types/radar';
import radarBackground from '@/assets/radar/MajRadarBG.png';

export interface RadarPlotProps {
  /** Radar feature values by key; a missing or null value is drawn as 0. */
  feature: Partial<Record<RadarAxis | 'fitted_constant', number | null>>;
}

// 100 reaches the reference hexagon; drawing stops at 200, while labels
// and dominant-axis colors continue to use the original scores.
const RADAR_CENTER_X = 160;
const RADAR_CENTER_Y = 180;
const REFERENCE_RADIUS = 90;
const REFERENCE_SCORE = 100;
const MAX_RENDERED_SCORE = 200;

/**
 * Draws the six-axis Majdata radar with the fitted chart constant in the centre.
 * Shared by the chart radar on the song page and the rating radar on the profile page.
 */
export default function RadarPlot({ feature }: RadarPlotProps) {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();
  // Access by key: JSON dictionary iteration order is not the visual axis order.
  const values = radarAxes.map(axis => feature[axis.key]);
  const complete = values.every((value): value is number => value !== null && value !== undefined);
  const strongest = complete ? values.indexOf(Math.max(...values)) : 0;
  const color = radarAxes[strongest];
  const points = values.map((value, i) => {
    const angle = (-90 + i * 60) * Math.PI / 180;
    const radius = Math.max(0, Math.min(MAX_RENDERED_SCORE, value ?? 0)) / REFERENCE_SCORE * REFERENCE_RADIUS;
    return `${RADAR_CENTER_X + Math.cos(angle) * radius},${RADAR_CENTER_Y + Math.sin(angle) * radius}`;
  }).join(' ');
  const esti = feature.fitted_constant;
  const labels = radarAxes.map(axis => t(axis.i18nKey));
  const estiLabel = t('song/ChartRadar.FittedConstant');

  return (
    <svg
      viewBox="0 0 320 360"
      className="block w-full overflow-visible text-white/90"
      role="img"
      aria-label={`${labels.map((label, i) => `${label}: ${values[i] ?? '—'}`).join(', ')}; ${estiLabel}: ${esti?.toFixed(2) ?? '—'}`}
    >
      {complete && (
        <motion.polygon
          initial={reduceMotion ? false : { points: Array(6).fill(`${RADAR_CENTER_X},${RADAR_CENTER_Y}`).join(' ') }}
          animate={{ points, fill: color.fill, stroke: color.stroke }}
          transition={{ duration: reduceMotion ? 0 : 0.5, ease: [0.215, 0.61, 0.355, 1] }}
          fillOpacity={0.7843}
          strokeWidth="2"
          strokeLinejoin="round"
        />
      )}
      <image
        href={radarBackground}
        x={RADAR_CENTER_X - REFERENCE_RADIUS}
        y={RADAR_CENTER_Y - REFERENCE_RADIUS}
        width={REFERENCE_RADIUS * 2}
        height={REFERENCE_RADIUS * 2}
        className="invert opacity-85"
      />
      {radarAxes.map((axis, i) => {
        const angle = (-90 + i * 60) * Math.PI / 180;
        const x = RADAR_CENTER_X + Math.cos(angle) * REFERENCE_RADIUS;
        const y = RADAR_CENTER_Y + Math.sin(angle) * REFERENCE_RADIUS;
        return (
          <g key={axis.key} textAnchor="middle" fill="currentColor" stroke="rgb(0 0 0 / 55%)" strokeWidth="2" paintOrder="stroke" strokeLinejoin="round">
            <text x={x} y={y - 2} fontSize="15" fontWeight="600">{labels[i]}</text>
            <text x={x} y={y + 14} fontSize="14" className="tabular-nums">{values[i]?.toFixed(0) ?? '—'}</text>
          </g>
        );
      })}
      <text x={RADAR_CENTER_X} y={RADAR_CENTER_Y + 4} textAnchor="middle" fontSize="26" fontWeight="600" fill="currentColor" stroke="rgb(0 0 0 / 35%)" strokeWidth="3" paintOrder="stroke" className="tabular-nums">
        {esti?.toFixed(2) ?? '—'}
      </text>
      <text x={RADAR_CENTER_X} y={RADAR_CENTER_Y + 24} textAnchor="middle" fontSize="13" fill="currentColor">{estiLabel}</text>
    </svg>
  );
}