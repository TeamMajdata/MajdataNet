import { useTranslation } from 'react-i18next';
import { useLanguage } from '@/i18n';
import { useState } from 'react';
import { ScoreCard as TotalScoreCard } from '@/components/score/ScoreCount';
import { useSeasonRanking } from '@/hooks/useSeasonRanking';
import { useSeasonLastPlayed } from '@/hooks/useSeasonLastPlayed';
import SeasonScoreDetails from './SeasonScoreDetails';
import Pager from '@/components/ui/Pager';
import EmptyState from '@/components/ui/EmptyState';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { SECTION_HEADING_CLASS } from '@/components/ui/surface';
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
  const ranking = useSeasonRanking(event, status, chartState.songIds ?? null);
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
    <section aria-labelledby="season-ranking-title" className="@container">
      {/* 小标题居左，参赛人数在右 */}
      <div className="flex justify-between items-baseline gap-3 mb-3">
        <h2 id="season-ranking-title" className={`${SECTION_HEADING_CLASS} mb-0!`}>{t('season/SeasonLeaderboard.Title')}</h2>
        {status !== 'upcoming' && entries && (
          <span className="text-white/50 text-sm">{t('season/SeasonLeaderboard.Participants', { count: entries.length })}</span>
        )}
      </div>

      <div aria-live="polite">
        {status === 'upcoming' ? (
          <EmptyState>{t('season/SeasonLeaderboard.Upcoming')}</EmptyState>
        ) : isLoading && !entries ? (
          <div className="flex justify-center py-10" role="status" aria-label={t('season/SeasonLeaderboard.Loading')}><LoadingSpinner size={32} /></div>
        ) : error && !entries ? (
          <p role="alert" className="py-8 text-red-300 text-center">{t('season/SeasonLeaderboard.LoadFailed')}</p>
        ) : (
          <>
            {error && <p role="alert" className="mb-4 text-amber-200 text-center">{t('season/SeasonLeaderboard.UpdateFailed')}</p>}
            {entries?.length === 0 ? (
              <EmptyState>{t('season/SeasonLeaderboard.Empty')}</EmptyState>
            ) : (
                // 名次已经印在卡片左上角，这里不再单独写一行
                <ol className="gap-3 grid grid-cols-2 @xl:grid-cols-3 @3xl:grid-cols-4 @5xl:grid-cols-5 m-0 p-0 list-none" start={page * PAGE_SIZE + 1}>
                  {visibleEntries?.map(player => (
                    <li key={player.playerId} data-season-rank={player.rank} className="min-w-0">
                      <SeasonScoreDetails event={event} chartState={chartState} player={player} status={status}>
                        <TotalScoreCard rank={player.rank} username={player.username} avatarId={player.player?.avatarId} scoresum={player.score} maxscore={entries?.[0]?.score ?? 0}
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
            className="bg-white/[0.06] hover:bg-white/10 disabled:opacity-50 px-4 border border-white/10 hover:border-white/20 rounded-xl h-10 font-medium text-white/85 text-sm transition-colors cursor-pointer disabled:cursor-not-allowed">
            {t('season/SeasonLeaderboard.Retry')}
          </button>
        </div>
      )}

      {status !== 'upcoming' && totalPages > 1 && (
        <div className="flex justify-center mt-8">
          <Pager
            page={page}
            hasNext={page + 1 < totalPages}
            totalPages={totalPages}
            onPageChange={(next) => setPagination({ eventId: event.id, page: next })}
          />
        </div>
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
