import { useTranslation } from 'react-i18next';
import { useId } from 'react';
import { RadarRequestError, useChartRadar } from '@/hooks/useChartRadar';
import RadarPlot from '@/components/chart/RadarPlot';

interface ChartRadarProps {
  id: string;
  hash: string;
  chartLevel: number | undefined;
}

export default function ChartRadar({ id, hash, chartLevel }: ChartRadarProps) {
  const { t } = useTranslation();
  const titleId = useId();
  const { data, error, isLoading, isValidating, mutate } = useChartRadar(id, hash, chartLevel);
  let message: string | undefined;
  if (chartLevel === undefined) message = t('song/ChartRadar.NoDifficulty');
  else if (error instanceof RadarRequestError && error.status === 404) message = t('song/ChartRadar.Unavailable');
  else if (error instanceof RadarRequestError && error.status === 422) message = t('song/ChartRadar.AnalysisFailed');
  else if (error) message = t('song/ChartRadar.LoadFailed');
  else if (isLoading) message = t('song/ChartRadar.Loading');

  return (
    <section aria-labelledby={titleId} className="song-radar">
      <h3 id={titleId} className="song-label">{t('song/ChartRadar.Title')}</h3>
      {message ? (
        <div className="flex flex-col justify-center items-center gap-3 aspect-square text-center text-white/70 text-sm" aria-live="polite" aria-busy={isLoading || isValidating}>
          <p role={error ? 'alert' : 'status'}>{message}</p>
          {error && <button type="button" disabled={isValidating} onClick={() => { void mutate().catch(() => {}); }} className="bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg disabled:opacity-50">
            {t('song/ChartRadar.Retry')}
          </button>}
        </div>
      ) : data ? (
        <div className="rounded-xl">
          <RadarPlot feature={data.feature} />
        </div>
      ) : null}
    </section>
  );
}