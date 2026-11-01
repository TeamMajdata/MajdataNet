import { useTranslation } from 'react-i18next';
import { useLanguage } from '@/i18n';
import { useState } from 'react';
import { ScoreCard as TotalScoreCard } from '@/components/score/ScoreCount';
import { useSeasonRanking } from '@/hooks/useSeasonRanking';
import { useSeasonLastPlayed } from '@/hooks/useSeasonLastPlayed';
import SeasonScoreDetails from './SeasonScoreDetails';
import type { SeasonChartsState } from '@/hooks/useSeasonCharts';
import type { Event } from '@/types/event';

const PAGE_SIZE = 50;

interface SeasonLeaderboardProps {
  event: Event;
  status: 'upcoming' | 'ongoing' | 'ended';
  chartState: SeasonChartsState;
}

export default function SeasonLeaderboard({ event, status, chartState }: SeasonLeaderboardProps) {
  const { t } = useTranslation();
  const ranking = useSeasonRanking(event, status, chartState.songhashes ?? null);
  const { entries } = ranking;
  const error = chartState.error ?? ranking.error;
  const isLoading = chartState.isLoading || ranking.isLoading;
  const [pagination, setPagination] = useState({ eventId: event.id, page: 0 });
  const totalPages = Math.max(1, Math.ceil((entries?.length ?? 0) / PAGE_SIZE));
  const page = pagination.eventId === event.id ? Math.min(pagination.page, totalPages - 1) : 0;
  const visibleEntries = entries?.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  async function retry() {
    if (chartState.error) await chartState.retry();
    else await ranking.retry();
  }

  return (
    <section aria-labelledby="season-ranking-title" className="mx-auto mt-5 sm:mt-8 p-3 sm:p-6 md:p-8 max-w-5xl" style={{
      background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.03))',
      backdropFilter: 'blur(10px)',
      borderRadius: '16px',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
    }}>
      <div className="mb-6 text-center">
        <h2 id="season-ranking-title" className="mb-2 font-bold text-white text-3xl" style={{ textShadow: '0 2px 8px rgba(0, 0, 0, 0.3)' }}>{t('season/SeasonLeaderboard.Title')}</h2>
      </div>

      <div aria-live="polite">
        {status === 'upcoming' ? (
          <p className="py-8 text-white/70 text-center">{t('season/SeasonLeaderboard.Upcoming')}</p>
        ) : isLoading && !entries ? (
          <p className="py-8 text-white/70 text-center">{t('season/SeasonLeaderboard.Loading')}</p>
        ) : error && !entries ? (
          <p role="alert" className="py-8 text-red-300 text-center">{t('season/SeasonLeaderboard.LoadFailed')}</p>
        ) : (
          <>
            {error && <p role="alert" className="mb-4 text-amber-200 text-center">{t('season/SeasonLeaderboard.UpdateFailed')}</p>}
            {entries?.length === 0 ? (
              <p className="py-8 text-white/70 text-center">{t('season/SeasonLeaderboard.Empty')}</p>
            ) : (
                <ol className="gap-3 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5" start={page * PAGE_SIZE + 1}>
                  {visibleEntries?.map(player => (
                    <li key={player.playerId} data-season-rank={player.rank} className="min-w-0">
                      <p className="mb-2 text-white/70 text-sm text-center"><span className="sr-only">{t('season/SeasonLeaderboard.Rank')} </span>#{player.rank}</p>
                      <SeasonScoreDetails event={event} chartState={chartState} player={player} status={status}>
                        <TotalScoreCard rank={player.rank} username={player.username} scoresum={player.score} maxscore={entries?.[0]?.score ?? 0}
                          footer={<SeasonLastPlayed username={player.username} event={event} chartState={chartState} status={status} />} />
                      </SeasonScoreDetails>
                    </li>
                  ))}
                </ol>
            )}
          </>
        )}
      </div>

      {status !== 'upcoming' && error && (
        <div className="mt-4 text-center">
          <button type="button" onClick={() => void retry()} disabled={chartState.isLoading || ranking.isValidating}
            className="bg-white/10 px-6 py-2 border border-white/20 rounded-lg text-white cursor-pointer disabled:cursor-not-allowed disabled:opacity-50">
            {t('season/SeasonLeaderboard.Retry')}
          </button>
        </div>
      )}

      {status !== 'upcoming' && entries && (
        <p className="mt-6 text-white/70 text-sm text-center">{t('season/SeasonLeaderboard.Participants', { count: entries.length })}</p>
      )}
      {status !== 'upcoming' && totalPages > 1 && (
        <nav className="flex flex-wrap justify-center items-center gap-3 mt-6 text-sm" aria-label={t('season/SeasonLeaderboard.Title')}>
          <button type="button" disabled={page === 0} onClick={() => setPagination({ eventId: event.id, page: page - 1 })} className="bg-white/10 px-6 py-2 border border-white/20 rounded-lg text-white cursor-pointer disabled:cursor-not-allowed disabled:opacity-50">{t('season/SeasonLeaderboard.Previous')}</button>
          <span className="text-white/60">{t('season/SeasonLeaderboard.Page', { page: page + 1, total: totalPages })}</span>
          <button type="button" disabled={page + 1 >= totalPages} onClick={() => setPagination({ eventId: event.id, page: page + 1 })} className="bg-white/10 px-6 py-2 border border-white/20 rounded-lg text-white cursor-pointer disabled:cursor-not-allowed disabled:opacity-50">{t('season/SeasonLeaderboard.Next')}</button>
        </nav>
      )}
    </section>
  );
}

interface SeasonLastPlayedProps {
  username: string;
  event: Event;
  chartState: SeasonChartsState;
  status: 'upcoming' | 'ongoing' | 'ended';
}

function SeasonLastPlayed({ username, event, chartState, status }: SeasonLastPlayedProps) {
  const { t } = useTranslation();
  const language = useLanguage();
  const { timestamp, error, isLoading, unavailable } = useSeasonLastPlayed(username, event, chartState, status);
  const locale = { zh: 'zh-CN', en: 'en-GB', ja: 'ja-JP', ko: 'ko-KR' }[language];
  const date = timestamp ? new Date(timestamp) : undefined;
  const validDate = date && Number.isFinite(date.getTime()) ? date : undefined;
  const fullTimeLabel = validDate ? new Intl.DateTimeFormat(locale, {
    timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  }).format(validDate) : undefined;
  const timeLabel = validDate ? new Intl.DateTimeFormat(locale, {
    timeZone: 'Asia/Shanghai', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).format(validDate) : undefined;

  return (
    <div className="space-y-1 py-1 font-normal" title={t('season/SeasonLastPlayed.Scope')}>
      <span className="block text-white/45">{t('season/SeasonLastPlayed.Title')}</span>
      {error || unavailable ? (
        <span>{t('season/SeasonLastPlayed.Unavailable')}</span>
      ) : timeLabel ? (
        <time className="block whitespace-nowrap font-medium tabular-nums tracking-wide text-white/75" dateTime={validDate!.toISOString()}
          title={`${fullTimeLabel} (UTC+8)`} aria-label={`${fullTimeLabel} (UTC+8)`}>{timeLabel}</time>
      ) : isLoading ? (
        <span>{t('season/SeasonLastPlayed.Loading')}</span>
      ) : (
        <span>{t('season/SeasonLastPlayed.Empty')}</span>
      )}
    </div>
  );
}
