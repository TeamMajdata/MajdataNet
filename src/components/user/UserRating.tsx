import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import EmptyState from '@/components/ui/EmptyState';
import { RatingRequestError, useUserRating } from '@/hooks/useUserRating';
import RadarPlot from '@/components/chart/RadarPlot';
import BestScores from '@/components/user/BestScores';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { ComboState } from '@/types';
import { CARD_SURFACE_CLASS, SECTION_HEADING_CLASS } from '@/components/ui/surface';

interface UserRatingProps {
  username: string;
}

/**
 * The rating radar of a player and the best 50 chart levels it averages, loaded from the rating endpoint.
 */
export default function UserRating({ username }: UserRatingProps) {
  const { t } = useTranslation();
  const { data, error, isLoading, isValidating, mutate } = useUserRating(username);

  if (error) {
    const message = error instanceof RatingRequestError && error.status === 404
      ? t('space/SpacePage.UserNotFound')
      : t('space/SpacePage.RatingFailed');
    return (
      <RatingSection>
        <div className="flex flex-col justify-center items-center gap-3 py-10 text-center" aria-live="polite">
          <p role="alert" className="text-white/70">{message}</p>
          <button
            type="button"
            disabled={isValidating}
            onClick={() => { void mutate().catch(() => {}); }}
            className="bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg disabled:opacity-50"
          >
            {t('space/SpacePage.Retry')}
          </button>
        </div>
      </RatingSection>
    );
  }

  if (isLoading) {
    return (
      <RatingSection>
        <div className="flex justify-center items-center py-12">
          <LoadingSpinner size={40} />
        </div>
      </RatingSection>
    );
  }

  if (!data || data.chartCount === 0 || data.best.length === 0) {
    return <RatingSection><EmptyState>{t('space/SpacePage.RatingEmpty')}</EmptyState></RatingSection>;
  }

  const apCount = data.best.filter(score => Number(score.comboState) >= ComboState.AP).length;
  const fcCount = data.best.filter(score => Number(score.comboState) === ComboState.FC || Number(score.comboState) === ComboState.FCPlus).length;
  const accs = data.best.map(score => score.acc.dx);
  const stats = [
    { label: t('space/SpacePage.AverageAcc'), value: `${(accs.reduce((sum, acc) => sum + acc, 0) / accs.length).toFixed(4)}%`, color: 'text-white' },
    { label: t('space/SpacePage.BestAcc'), value: `${Math.max(...accs).toFixed(4)}%`, color: 'text-white' },
    { label: 'AP / AP+', value: apCount, color: 'text-amber-300' },
    { label: 'FC / FC+', value: fcCount, color: 'text-sky-300' },
  ];

  return (
    // 按所在区域的宽度排版：上面是雷达图和统计，下面是 Best 50 网格
    <div className="@container w-full">
      <RatingSection>
        <div className={`${CARD_SURFACE_CLASS} flex flex-col @3xl:flex-row items-center gap-6 p-5`}>
          <div className="w-full max-w-64 shrink-0">
            <RadarPlot feature={data.feature} />
            <p className="m-0 text-white/50 text-xs text-center">
              {t('space/SpacePage.RatingCharts', { count: data.chartCount })}
            </p>
          </div>
          <div className="flex-1 w-full min-w-0">
            <dl className="gap-3 grid grid-cols-2 m-0">
              {stats.map(({ label, value, color }) => (
                <div key={label} className="bg-white/[0.03] px-4 py-3 border border-white/10 rounded-2xl min-w-0">
                  <dt className="text-white/50 text-xs">{label}</dt>
                  <dd className={`m-0 mt-1 font-semibold text-xl tabular-nums truncate ${color}`}>{value}</dd>
                </div>
              ))}
            </dl>
            <p className="m-0 mt-4 text-white/40 text-xs text-left leading-relaxed">
              {t('space/SpacePage.RatingFormula')}
            </p>
          </div>
        </div>
      </RatingSection>
      <section aria-labelledby="user-best50-title" className="mt-10">
        <h3 id="user-best50-title" className={SECTION_HEADING_CLASS}>{t('space/SpacePage.Best50')}</h3>
        <BestScores scores={data.best} />
      </section>
    </div>
  );
}

/** “评分”区块：加载中、失败、没有数据和有数据时都带着同一个小标题，和概览里其他区块一致 */
function RatingSection({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  return (
    <section aria-labelledby="user-rating-title">
      <h2 id="user-rating-title" className={SECTION_HEADING_CLASS}>{t('space/SpacePage.Rating')}</h2>
      {children}
    </section>
  );
}
