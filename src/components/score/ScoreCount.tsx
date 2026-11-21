import { useTranslation } from 'react-i18next';
import SectionLoading from '@/components/ui/SectionLoading';
import EmptyState from '@/components/ui/EmptyState';
import { endpoints } from '@/config/api';
import useSWR from 'swr';
import UserAvatar from '@/components/user/UserAvatar';
import type { ScoreCardProps, ScoreCountProps, ScoreSumResponse } from '@/types';
import { Link } from 'react-router-dom';
import { CARD_SURFACE_CLASS } from '@/components/ui/surface';


import { apiFetcher as fetcher } from '@/utils/apiClient';

/**
 * 分数统计组件
 * 显示指定上传者的谱面评分排行榜
 */
export default function ScoreCount({ uploader, page = 0, pageSize = 10 }: ScoreCountProps) {
  const { t } = useTranslation();

  const { data: response, error, isLoading } = useSWR<ScoreSumResponse>(
    endpoints.maiscore.scoreSums(uploader, page, pageSize),
    fetcher,
    // 总达成率变化很慢，不再每 30 秒轮询；切回页面时 SWR 会自动刷新
    { revalidateOnFocus: true }
  );

  const data = response?.players;

  if (error) {
    return <div>{t("shared/ScoreCount.FailedToLoad")}</div>;
  }

  if (isLoading) {
    return <SectionLoading />;
  }

  if (!data || data.length === 0) {
    return <EmptyState>{t("shared/ScoreCount.EmptyData")}</EmptyState>;
  }

  const maxScore = data[0].acc.dx;

  return (
    // 按所在区域的宽度分列，放在个人空间的右栏里也不会挤
    <div className="@container w-full">
      <div className="gap-3 grid grid-cols-2 @xl:grid-cols-3 @3xl:grid-cols-4 @5xl:grid-cols-5">
        {data.map((player, index) => (
          <ScoreCard
            key={player.username}
            rank={page * pageSize + index + 1}
            username={player.username}
            avatarId={player.player?.avatarId}
            scoresum={player.acc.dx}
            maxscore={maxScore}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * 单个分数卡片组件：和谱面卡片同样的底色和悬停描边，第一名用金色强调
 */
export function ScoreCard({ rank, username, avatarId, scoresum, maxscore, footer }: ScoreCardProps) {
  const percentage = maxscore > 0 ? (scoresum / maxscore) * 100 : 0;
  const isFirst = rank === 1;

  return (
    <Link
      to={`/space?id=${encodeURIComponent(username)}`}
      className={`${CARD_SURFACE_CLASS} relative block p-3 h-full text-inherit no-underline ring-1 transition-shadow duration-200 ${isFirst ? 'ring-amber-300/50 hover:ring-amber-300/80' : 'ring-transparent hover:ring-white/30'}`}
    >
      <span className={`top-2 left-2 absolute px-1.5 rounded-md font-semibold text-xs tabular-nums leading-5 ${isFirst ? 'bg-amber-400 text-black' : 'bg-white/10 text-white/70'}`}>
        #{rank}
      </span>

      <div className="flex justify-center mb-2">
        <UserAvatar
          className={`border rounded-full w-14 h-14 object-cover aspect-square ${isFirst ? 'border-amber-300/60' : 'border-white/15'}`}
          username={username}
          avatarId={avatarId}
        />
      </div>

      <div className="mb-1 px-1 font-medium text-white text-sm text-center truncate">{username}</div>

      <div className={`font-semibold text-base text-center tabular-nums ${isFirst ? 'text-amber-300' : 'text-white'}`}>
        {scoresum.toFixed(4)}%
      </div>

      {footer && <div className="mt-2 text-white/60 text-xs text-center">{footer}</div>}

      <div className="bg-white/10 mt-2 rounded-full h-1 overflow-hidden">
        <div
          className={`rounded-full h-full ${isFirst ? 'bg-amber-300' : 'bg-white/45'}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </Link>
  );
}
