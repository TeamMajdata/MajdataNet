import { useState } from 'react';
import { ScoreCard as TotalScoreCard } from '@/components/score/ScoreCount';
import { useI18n } from '@/hooks/useI18n';
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
  const { i18n } = useI18n();
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
        <h2 id="season-ranking-title" className="mb-2 font-bold text-white text-3xl" style={{ textShadow: '0 2px 8px rgba(0, 0, 0, 0.3)' }}>{i18n('season/SeasonLeaderboard.Title', '排行榜')}</h2>
      </div>

      <div aria-live="polite">
        {status === 'upcoming' ? (
          <p className="py-8 text-white/70 text-center">{i18n('season/SeasonLeaderboard.Upcoming', '开赛后将在这里展示排行榜。')}</p>
        ) : isLoading && !entries ? (
          <p className="py-8 text-white/70 text-center">{i18n('season/SeasonLeaderboard.Loading', '正在加载排行榜…')}</p>
        ) : error && !entries ? (
          <p role="alert" className="py-8 text-red-300 text-center">{i18n('season/SeasonLeaderboard.LoadFailed', '排行榜加载失败，请稍后重试。')}</p>
        ) : (
          <>
            {error && <p role="alert" className="mb-4 text-amber-200 text-center">{i18n('season/SeasonLeaderboard.UpdateFailed', '更新失败，以下保留上次成功获取的结果。')}</p>}
            {entries?.length === 0 ? (
              <p className="py-8 text-white/70 text-center">{i18n('season/SeasonLeaderboard.Empty', '还没有参赛成绩，来提交本季的第一份成绩吧。')}</p>
            ) : (
                <ol className="gap-3 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5" start={page * PAGE_SIZE + 1}>
                  {visibleEntries?.map(player => (
                    <li key={player.playerId} data-season-rank={player.rank} className="min-w-0">
                      <p className="mb-2 text-white/70 text-sm text-center"><span className="sr-only">{i18n('season/SeasonLeaderboard.Rank', '名次')} </span>#{player.rank}</p>
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
            {i18n('season/SeasonLeaderboard.Retry', '重试')}
          </button>
        </div>
      )}

      {status !== 'upcoming' && entries && (
        <p className="mt-6 text-white/70 text-sm text-center">{i18n('season/SeasonLeaderboard.Participants', '参与者：')}{entries.length}</p>
      )}
      {status !== 'upcoming' && totalPages > 1 && (
        <nav className="flex flex-wrap justify-center items-center gap-3 mt-6 text-sm" aria-label={i18n('season/SeasonLeaderboard.Title', '排行榜')}>
          <button type="button" disabled={page === 0} onClick={() => setPagination({ eventId: event.id, page: page - 1 })} className="bg-white/10 px-6 py-2 border border-white/20 rounded-lg text-white cursor-pointer disabled:cursor-not-allowed disabled:opacity-50">{i18n('season/SeasonLeaderboard.Previous', '上一页')}</button>
          <span className="text-white/60">{page + 1} / {totalPages} {i18n('season/SeasonLeaderboard.Page', '页')}</span>
          <button type="button" disabled={page + 1 >= totalPages} onClick={() => setPagination({ eventId: event.id, page: page + 1 })} className="bg-white/10 px-6 py-2 border border-white/20 rounded-lg text-white cursor-pointer disabled:cursor-not-allowed disabled:opacity-50">{i18n('season/SeasonLeaderboard.Next', '下一页')}</button>
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
  const { i18n, language } = useI18n();
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
    <div className="space-y-1 py-1 font-normal" title={i18n('season/SeasonLastPlayed.Scope', '本季曲池在赛期内的最近游玩；仅可查询近 30 天记录。')}>
      <span className="block text-white/45">{i18n('season/SeasonLastPlayed.Title', '最近游玩时间')}</span>
      {error || unavailable ? (
        <span>{i18n('season/SeasonLastPlayed.Unavailable', '暂不可用')}</span>
      ) : timeLabel ? (
        <time className="block whitespace-nowrap font-medium tabular-nums tracking-wide text-white/75" dateTime={validDate!.toISOString()}
          title={`${fullTimeLabel} (UTC+8)`} aria-label={`${fullTimeLabel} (UTC+8)`}>{timeLabel}</time>
      ) : isLoading ? (
        <span>{i18n('season/SeasonLastPlayed.Loading', '加载中…')}</span>
      ) : (
        <span>{i18n('season/SeasonLastPlayed.Empty', '近 30 天无记录')}</span>
      )}
    </div>
  );
}
