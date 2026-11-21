import { useTranslation } from 'react-i18next';
import { RatingRequestError, useUserRating } from '@/hooks/useUserRating';
import RadarPlot from '@/components/chart/RadarPlot';
import BestScores from '@/components/user/BestScores';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { CARD_SURFACE_CLASS } from '@/components/ui/surface';

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
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <LoadingSpinner size={40} />
      </div>
    );
  }

  if (!data || data.chartCount === 0 || data.best.length === 0) {
    return <p className="py-8 text-center text-white/50 text-sm">{t('space/SpacePage.RatingEmpty')}</p>;
  }

  return (
    // 按所在区域的宽度排版：够宽时雷达图在左、B50 在右
    <div className="@container w-full">
      <div className="items-start gap-5 grid grid-cols-1 @4xl:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] w-full">
        <section
          aria-label={t('space/SpacePage.Rating')}
          className={`${CARD_SURFACE_CLASS} mx-auto w-full max-w-[17rem] sm:max-w-[20rem] @4xl:max-w-none p-3 sm:p-4 min-w-0`}
        >
          <RadarPlot feature={data.feature} />
          <p className="m-0 text-center text-white/50 text-xs">
            {t('space/SpacePage.RatingCharts', { count: data.chartCount })}
          </p>
          <p className="m-0 mt-2 text-center text-white/40 text-[0.7rem] leading-relaxed">
            {t('space/SpacePage.RatingFormula')}
          </p>
        </section>
        <section aria-label={t('space/SpacePage.Best50')} className="min-w-0">
          <h3 className="m-0 mb-3 font-bold text-white text-sm">{t('space/SpacePage.Best50')}</h3>
          <BestScores scores={data.best} />
        </section>
      </div>
    </div>
  );
}