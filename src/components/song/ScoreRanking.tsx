import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import useSWR from 'swr';
import { endpoints } from '@/config/api';
import { apiFetcher } from '@/utils/apiClient';
import { getComboState } from '@/utils/comboUtils';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import UserAvatar from '@/components/user/UserAvatar';
import type { ChartLeaderboardResponse, ScoreListProps } from '@/types';

export function ScoreRanking({ songid, chartLevel }: ScoreListProps) {
  const { t } = useTranslation();
  const { data, error, isLoading } = useSWR<ChartLeaderboardResponse>(
    endpoints.maiscore.chartLeaderboard(songid),
    apiFetcher,
  );

  if (error) return <p role="alert" className="py-6 text-sm">{t('song/ScoreRanking.FailedToLoad')}</p>;
  if (isLoading) return <div role="status" className="flex justify-center py-12"><LoadingSpinner size={28} /></div>;

  const scores = chartLevel === undefined ? [] : data?.scores?.[chartLevel] ?? [];
  if (!scores.length) {
    return <p className="py-10 text-center text-sm text-white/60">{t('song/ScoreRanking.NoRecords')}</p>;
  }

  return (
    <>
      <p className="mb-3 text-sm text-white/60">{t('song/ScoreRanking.Records', { count: scores.length })}</p>
      <ol className="divide-y divide-white/10 border-y border-white/10">
        {scores.map((score, index) => {
          const result = score.acc < 80 ? 'Failed' : getComboState(score.comboState) || 'Clear';
          return (
            <li key={score.player.username} className="flex items-center gap-3 py-3 tabular-nums">
              <span className="w-7 shrink-0 text-right text-sm text-white/55">{index + 1}</span>
              <Link to={'/space?id=' + encodeURIComponent(score.player.username)} className="flex min-w-0 flex-1 items-center gap-2 hover:underline">
                <UserAvatar username={score.player.username} avatarId={score.player.avatarId} alt="" className="size-7 shrink-0 rounded-full" />
                <span className="truncate">{score.player.nickname || score.player.username}</span>
              </Link>
              <strong className="text-sm">{score.acc.toFixed(4)}%</strong>
              <span className="w-12 text-right text-sm text-white/60">{result}</span>
            </li>
          );
        })}
      </ol>
    </>
  );
}
