import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { endpoints } from '@/config/api';
import { getComboState } from '@/utils';
import type { Score } from '@/types';

interface BestScoresProps {
  /** The best chart levels of the rating, best first, in the shape of `GET api/account/scores`. */
  scores: Score[];
}

const COMBO_CLASS: Record<string, string> = {
  'AP+': 'bg-gradient-to-r from-amber-400 to-yellow-300 text-black',
  'AP': 'bg-gradient-to-r from-amber-400/80 to-yellow-300/80 text-black',
  'FC+': 'bg-gradient-to-r from-blue-500 to-sky-300 text-white',
  'FC': 'bg-gradient-to-r from-blue-500/80 to-sky-300/80 text-white',
};

/**
 * The best 50 chart levels of a player, compact enough to sit next to the rating radar.
 */
export default function BestScores({ scores }: BestScoresProps) {
  const { t } = useTranslation();

  if (scores.length === 0) {
    return <p className="py-8 text-center text-white/50 text-sm">{t('space/SpacePage.Best50Empty')}</p>;
  }

  return (
    <ol className="space-y-1.5 m-0 p-0 list-none">
      {scores.map((score, index) => {
        const chart = score.chartInfo;
        const difficulty = chart?.levels?.[score.chartLevel] ?? '';
        const comboState = Number(score.comboState);
        const comboText = comboState > 0 ? getComboState(comboState) : '';
        return (
          <li key={`${chart?.id ?? score.hash}-${score.chartLevel}-${index}`}>
            <Link
              to={chart?.id ? `/song?id=${chart.id}` : '/song'}
              className="flex items-center gap-2 sm:gap-3 bg-white/5 hover:bg-white/10 px-2 sm:px-3 py-1.5 border border-white/8 rounded-lg transition-colors min-w-0"
            >
              <span className="w-6 shrink-0 text-right text-white/40 text-xs tabular-nums">{index + 1}</span>
              {chart?.id && (
                <img
                  src={endpoints.maichart.image(chart.id)}
                  alt=""
                  loading="lazy"
                  // The CDN rejects a localhost referer; the cover needs no referer at all.
                  referrerPolicy="no-referrer"
                  className="rounded w-9 h-9 shrink-0 object-cover"
                />
              )}
              <div className="flex-1 min-w-0">
                <p className="m-0 font-medium text-white text-sm truncate">{chart?.title ?? ''}</p>
                <p className="m-0 text-white/45 text-xs truncate">
                  {[chart?.artist, chart?.designer].filter(Boolean).join(' · ')}
                </p>
              </div>
              {difficulty && (
                <span className="bg-white/10 px-1.5 py-0.5 rounded shrink-0 font-semibold text-white/80 text-xs">{difficulty}</span>
              )}
              {comboText && (
                <span className={`px-1.5 py-0.5 rounded shrink-0 font-bold text-[0.65rem] leading-none ${COMBO_CLASS[comboText] ?? 'bg-white/10 text-white/80'}`}>
                  {comboText}
                </span>
              )}
              <span className="shrink-0 font-semibold text-purple-300 text-sm tabular-nums">{score.acc.dx.toFixed(4)}</span>
            </Link>
          </li>
        );
      })}
    </ol>
  );
}