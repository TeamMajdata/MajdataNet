import { useTranslation } from 'react-i18next';
import { PiChartBar, PiFileText } from 'react-icons/pi';
import { Link } from 'react-router-dom';
import useSWR from 'swr';
import { endpoints } from '@/config/api';
import { apiFetcher } from '@/utils/apiClient';
import { getComboState } from '@/utils/comboUtils';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import UserAvatar from '@/components/user/UserAvatar';
import type { ChartLeaderboardResponse, ChartScore, ScoreListProps } from '@/types';

const podium = [
  {
    label: '1st Place',
    badge: 'bg-linear-to-br from-yellow-400 to-amber-500 text-black',
    avatar: 'border-amber-400 shadow-[0_0_0_1px_rgb(251_191_36/0.35),0_0_12px_rgb(251_191_36/0.45),0_0_22px_rgb(251_191_36/0.2)]',
  },
  {
    label: '2nd Place',
    badge: 'bg-linear-to-br from-gray-300 to-gray-400 text-black',
    avatar: 'border-gray-300 shadow-[0_0_0_1px_rgb(209_213_219/0.35),0_0_12px_rgb(209_213_219/0.4),0_0_22px_rgb(209_213_219/0.18)]',
  },
  {
    label: '3rd Place',
    badge: 'bg-linear-to-br from-amber-600 to-amber-700 text-white',
    avatar: 'border-amber-600 shadow-[0_0_0_1px_rgb(217_119_6/0.35),0_0_12px_rgb(217_119_6/0.4),0_0_22px_rgb(217_119_6/0.2)]',
  },
];

function comboStyles(combo: string) {
  if (combo === 'AP' || combo === 'AP+') {
    return {
      row: 'border-amber-500/50 shadow-[0_4px_16px_rgb(251_191_36/0.25),0_0_20px_rgb(251_191_36/0.15)]',
      badge: 'bg-linear-to-r from-amber-500 to-amber-400 text-white/90',
      accuracy: 'text-amber-400',
    };
  }
  if (combo === 'FC' || combo === 'FC+') {
    return {
      row: 'border-blue-400/50 shadow-[0_4px_16px_rgb(59_130_246/0.25),0_0_20px_rgb(59_130_246/0.15)]',
      badge: 'bg-linear-to-r from-blue-500 to-blue-400 text-white/90',
      accuracy: 'text-blue-400',
    };
  }
  return { row: 'border-white/10', badge: 'bg-white/20 text-white/90', accuracy: 'text-white/80' };
}

function RankingCard({ score, rank }: { score: ChartScore; rank: number }) {
  const medal = podium[rank - 1];
  const combo = getComboState(score.comboState);
  const styles = comboStyles(combo);
  const failed = score.acc < 80;

  return (
    <li className={`group flex items-center gap-2.5 rounded-xl border bg-white/8 px-2.5 py-2 backdrop-blur-md transition duration-200 hover:bg-white/12 hover:shadow-[0_8px_25px_rgb(0_0_0/0.3)] motion-safe:hover:-translate-y-0.5 ${styles.row}`}>
      <span className={`grid h-8 min-w-8 shrink-0 place-items-center rounded-lg text-xs font-bold ${medal?.badge ?? 'bg-white/15 text-white/70'}`}>
        #{rank}
      </span>
      <Link to={'/space?id=' + encodeURIComponent(score.player.username)} className="flex min-w-0 flex-1 items-center gap-2.5 no-underline">
        <UserAvatar
          username={score.player.username}
          avatarId={score.player.avatarId}
          alt=""
          className={`size-8 shrink-0 rounded-full border-2 object-cover transition-transform motion-safe:group-hover:scale-105 ${medal?.avatar ?? 'border-white/20 group-hover:border-white/40'}`}
        />
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-sm font-semibold text-white/90 group-hover:text-white">{score.player.nickname || score.player.username}</span>
          {medal && <span className="text-[10px] font-medium text-white/50">{medal.label}</span>}
        </span>
      </Link>
      <span className="flex shrink-0 flex-col items-end gap-0.5">
        <strong className={`text-base tabular-nums ${styles.accuracy}`}>{score.acc.toFixed(4)}%</strong>
        <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${failed ? 'bg-red-500/30 text-red-300' : styles.badge}`}>
          {failed ? 'Failed' : combo || 'Clear'}
        </span>
      </span>
    </li>
  );
}

export function ScoreRanking({ songid, chartLevel }: ScoreListProps) {
  const { t } = useTranslation();
  const { data, error, isLoading } = useSWR<ChartLeaderboardResponse>(
    endpoints.maiscore.chartLeaderboard(songid),
    apiFetcher,
  );

  if (error) return <p role="alert" className="py-6 text-sm">{t('song/ScoreRanking.FailedToLoad')}</p>;
  if (isLoading) return <div role="status" className="flex justify-center py-12"><LoadingSpinner size={28} /></div>;

  const scores = chartLevel === undefined ? [] : data?.scores?.[chartLevel] ?? [];
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="m-0 flex items-center gap-2 text-left! text-lg! font-semibold text-white!">
          <PiChartBar aria-hidden="true" className="size-5 text-white/70" />
          {t('song/ScoreRanking.RankingList')}
        </h2>
        <span className="text-xs font-medium text-white/40">{t('song/ScoreRanking.Records', { count: scores.length })}</span>
      </div>
      {scores.length ? (
        <ol className="flex flex-col gap-2">
          {scores.map((score, index) => <RankingCard key={score.player.username} score={score} rank={index + 1} />)}
        </ol>
      ) : (
        <div className="flex flex-col items-center px-4 py-16">
          <span className="mb-4 grid size-16 place-items-center rounded-full bg-white/5">
            <PiFileText aria-hidden="true" className="size-8 text-white/30" />
          </span>
          <p className="text-center text-sm font-medium text-white/50">{t('song/ScoreRanking.NoRecords')}</p>
        </div>
      )}
    </div>
  );
}
