import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { endpoints } from '@/config/api';
import { getComboState } from '@/utils';
import { CARD_SURFACE_CLASS } from '@/components/ui/surface';
import EmptyState from '@/components/ui/EmptyState';
import { LEVEL_BG_CLASS } from '@/components/score/levelColors';
import type { Score } from '@/types';

interface BestScoresProps {
  /** The best chart levels of the rating, best first, in the shape of `GET api/account/scores`. */
  scores: Score[];
}

/** 和成绩卡片相同的 AP / FC 配色 */
const COMBO_BADGE_CLASS: Record<string, string> = {
  'AP+': 'bg-gradient-to-r from-amber-400 to-yellow-300 text-black',
  'AP': 'bg-gradient-to-r from-amber-400 to-yellow-300 text-black',
  'FC+': 'bg-gradient-to-r from-blue-500 to-sky-300 text-white',
  'FC': 'bg-gradient-to-r from-blue-500 to-sky-300 text-white',
};
const COMBO_ACC_CLASS: Record<string, string> = {
  'AP+': 'text-amber-300', 'AP': 'text-amber-300', 'FC+': 'text-sky-300', 'FC': 'text-sky-300',
};

/**
 * Best 50：封面小卡片的网格，按所在区域的宽度分 1/2/3 列（外层需要 `@container`）。
 */
export default function BestScores({ scores }: BestScoresProps) {
  const { t } = useTranslation();

  if (scores.length === 0) {
    return <EmptyState>{t('space/SpacePage.Best50Empty')}</EmptyState>;
  }

  return (
    <ol className="gap-2.5 grid grid-cols-1 @xl:grid-cols-2 @4xl:grid-cols-3 m-0 p-0 list-none">
      {scores.map((score, index) => {
        const chart = score.chartInfo;
        const difficulty = chart?.levels?.[score.chartLevel] ?? '';
        const comboState = Number(score.comboState);
        const comboText = comboState > 0 ? getComboState(comboState) : '';
        return (
          <li key={`${chart?.id ?? score.hash}-${score.chartLevel}-${index}`} className="min-w-0">
            <Link
              to={chart?.id ? `/song?id=${chart.id}` : '/song'}
              title={[chart?.title, chart?.artist].filter(Boolean).join(' - ')}
              className={`${CARD_SURFACE_CLASS} flex items-center gap-3 p-2 pr-3 h-full min-w-0 text-inherit no-underline ring-1 ring-transparent hover:ring-white/30 transition-shadow duration-200`}
            >
              <div className="relative shrink-0">
                {chart?.id ? (
                  <img
                    src={endpoints.maichart.image(chart.id)}
                    alt=""
                    loading="lazy"
                    // The CDN rejects a localhost referer; the cover needs no referer at all.
                    referrerPolicy="no-referrer"
                    className="block rounded-lg w-14 h-14 object-cover"
                  />
                ) : (
                  <div className="bg-white/10 rounded-lg w-14 h-14" />
                )}
                <span className="top-1 left-1 absolute bg-black/70 px-1 rounded font-semibold text-[10px] text-white/90 tabular-nums leading-4">
                  #{index + 1}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="m-0 font-medium text-white text-sm truncate">{chart?.title ?? ''}</p>
                <div className="flex items-center gap-1.5 mt-1.5 min-w-0">
                  {difficulty && (
                    <span className={`inline-flex justify-center items-center px-1.5 rounded-md min-w-6 h-5 font-bold text-[0.7rem] text-white leading-none shrink-0 ${LEVEL_BG_CLASS[score.chartLevel] ?? 'bg-white/15'}`}>
                      {difficulty}
                    </span>
                  )}
                  {comboText && (
                    <span className={`px-1.5 py-0.5 rounded font-bold text-[0.65rem] leading-none shrink-0 ${COMBO_BADGE_CLASS[comboText] ?? 'bg-white/15 text-white/85'}`}>
                      {comboText}
                    </span>
                  )}
                  <span className={`ml-auto font-semibold text-sm tabular-nums whitespace-nowrap ${COMBO_ACC_CLASS[comboText] ?? 'text-white/90'}`}>
                    {score.acc.dx.toFixed(4)}%
                  </span>
                </div>
              </div>
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
