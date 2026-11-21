import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import useSWR from 'swr';
import { endpoints } from '@/config/api';
import { apiFetcher } from '@/utils/apiClient';
import { getComboState } from '@/utils/comboUtils';
import SectionLoading from '@/components/ui/SectionLoading';
import EmptyState from '@/components/ui/EmptyState';
import { CARD_SURFACE_CLASS } from '@/components/ui/surface';
import { RANK_BADGE_CLASS } from '@/components/score/rankBadge';
import { getLevelName } from '@/utils/levelUtils';
import UserAvatar from '@/components/user/UserAvatar';
import type { ChartLeaderboardResponse, ChartScore, ScoreListProps } from '@/types';

/** 评级标签和达成率的颜色：AP 金色、FC 蓝色、其余中性，未通过（低于 80%）红色 */
function resultStyle(score: ChartScore) {
  const combo = getComboState(score.comboState);
  if (score.acc < 80) return { text: 'Failed', badge: 'bg-red-500/20 text-red-300', acc: 'text-white/70' };
  if (combo === 'AP' || combo === 'AP+') return { text: combo, badge: 'bg-amber-400/20 text-amber-300', acc: 'text-amber-300' };
  if (combo === 'FC' || combo === 'FC+') return { text: combo, badge: 'bg-sky-400/20 text-sky-300', acc: 'text-sky-300' };
  return { text: combo || 'Clear', badge: 'bg-white/10 text-white/70', acc: 'text-white' };
}

function RankingRow({ score, rank }: { score: ChartScore; rank: number }) {
  const result = resultStyle(score);
  return (
    <li className="items-center gap-3 grid grid-cols-[2rem_minmax(0,1fr)_auto] hover:bg-white/[0.04] px-4 py-2.5 transition-colors">
      {RANK_BADGE_CLASS[rank - 1] ? (
        <span className={`justify-self-start px-1.5 py-0.5 rounded font-bold text-[0.7rem] tabular-nums leading-none ${RANK_BADGE_CLASS[rank - 1]}`}>#{rank}</span>
      ) : (
        <span className="pl-0.5 font-semibold text-white/40 text-xs tabular-nums">#{rank}</span>
      )}
      <Link to={'/space?id=' + encodeURIComponent(score.player.username)} className="group flex items-center gap-2.5 min-w-0 no-underline">
        <UserAvatar username={score.player.username} avatarId={score.player.avatarId} alt="" className="border border-white/15 rounded-full size-8 object-cover shrink-0" />
        <span className="font-medium text-white/90 group-hover:text-white text-sm truncate group-hover:underline underline-offset-2">{score.player.nickname || score.player.username}</span>
      </Link>
      <span className="flex items-center gap-2.5">
        <span className={`px-1.5 py-0.5 rounded font-semibold text-[0.7rem] leading-none ${result.badge}`}>{result.text}</span>
        <strong className={`w-22 font-semibold text-sm text-right tabular-nums ${result.acc}`}>{score.acc.toFixed(4)}%</strong>
      </span>
    </li>
  );
}

export function ScoreRanking({ songid, chartLevel, levels }: ScoreListProps) {
  const { t } = useTranslation();
  const { data, error, isLoading } = useSWR<ChartLeaderboardResponse>(
    endpoints.maiscore.chartLeaderboard(songid),
    apiFetcher,
  );

  if (error) return <p role="alert" className="py-6 text-sm">{t('song/ScoreRanking.FailedToLoad')}</p>;
  if (isLoading) return <SectionLoading />;

  const scores = chartLevel === undefined ? [] : data?.scores?.[chartLevel] ?? [];
  // 排行榜跟着页头选中的难度走，这里注明是哪个难度；人数在页签上
  const levelLabel = chartLevel === undefined ? '' : `${chartLevel === 6 ? 'UTAGE' : getLevelName(chartLevel)} ${levels?.[chartLevel]?.trim() ?? ''}`.trim();
  return (
    <div className="space-y-3">
      <p className="m-0 font-medium text-white/60! text-xs">{levelLabel}</p>
      {scores.length ? (
        <ol className={`${CARD_SURFACE_CLASS} m-0 p-0 py-1 divide-y divide-white/[0.06] overflow-hidden list-none`}>
          {scores.map((score, index) => <RankingRow key={score.player.username} score={score} rank={index + 1} />)}
        </ol>
      ) : (
        <EmptyState>{t('song/ScoreRanking.NoRecords')}</EmptyState>
      )}
    </div>
  );
}
