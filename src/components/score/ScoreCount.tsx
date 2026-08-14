import { endpoints } from '@/config/api';
import useSWR from 'swr';
import { useLoc } from '@/hooks';
import { LoadingSpinner } from '@/components';
import type { ScoreCardProps, ScoreCountProps, ScoreData } from '@/types';
import { Link } from 'react-router-dom';


const fetcher = (url: string) =>
  fetch(url, { mode: 'cors', credentials: 'include' }).then((res) => res.json());

/**
 * 分数统计组件
 * 显示指定上传者的谱面评分排行榜
 */
export default function ScoreCount({ uploader, page = 0, pageSize = 10 }: ScoreCountProps) {
  const loc = useLoc();

  const { data, error, isLoading } = useSWR<ScoreData[]>(
    endpoints.stats.scoreSums(uploader, page, pageSize),
    fetcher,
    { refreshInterval: 30000 } // 每30秒刷新一次
  );

  if (error) {
    return <div>{loc('FailedToLoad', '加载失败')}</div>;
  }

  if (isLoading) {
    return <div className="flex justify-center items-center min-h-20">
      <LoadingSpinner className="w-8 h-8" />
    </div>;
  }

  if (!data || data.length === 0) {
    return <div className="py-8 text-center">{loc('EmptyData', '空的')}</div>;
  }

  const maxScore = data[0].dxAccSum;

  return (
    <div
      style={{
        maxWidth: 'var(--container-max-width)',
        margin: 'var(--container-margin)',
        marginTop: '2rem',
        padding: 'var(--container-padding)',
      }}
    >
      <div className="gap-3 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {data.map((player, index) => (
          <ScoreCard
            key={player.username}
            rank={index + 1}
            username={player.username}
            scoresum={player.dxAccSum}
            maxscore={maxScore}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * 单个分数卡片组件
 */
function ScoreCard({ rank, username, scoresum, maxscore }: ScoreCardProps) {
  const percentage = (scoresum / maxscore) * 100;
  const isFirst = rank === 1;

  return (
    <div className="relative">
      <Link
        to={`/space?id=${username}`}
        className="block text-inherit no-underline"
      >
        <div
          className={`relative p-3 h-full rounded-lg transition-all duration-300 ease-out ${isFirst ? 'border-2 border-warn/50' : ''}`}
          onMouseEnter={(e) => {
            const el = e.currentTarget as HTMLElement;
            el.style.transform = 'translateY(-4px) scale(1.02)';
            el.style.boxShadow = '0 8px 24px rgb(16 24 40 / 0.08)';
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget as HTMLElement;
            el.style.transform = 'translateY(0) scale(1)';
            el.style.boxShadow = '0 1px 2px rgb(16 24 40 / 0.05)';
          }}
        >
          {/* 第一名标记 */}
          {isFirst && (
            <div
              className="top-2 right-2 absolute px-2 py-1 rounded font-bold text-sm bg-warn text-white"
            >
              1st
            </div>
          )}

          {/* 玩家头像 */}
          <div className="flex justify-center mb-2">
            <img
              className={`border-2 rounded-full w-16 h-16 object-cover transition-all duration-300 ${isFirst ? 'border-warn/60' : 'border-line'}`}
              style={{
                aspectRatio: '1',
              }}
              src={endpoints.account.icon(username)}
              alt={username}
            />
          </div>

          {/* 用户名 */}
          <div className="mb-2 px-1 font-semibold text-ink text-sm text-center truncate">
            {username}
          </div>

          {/* 分数 */}
          <div className={`font-bold text-lg text-center ${isFirst ? 'text-warn' : 'text-ink'}`}>
            {scoresum.toFixed(4)}%
          </div>

          {/* 进度条 */}
          <div
            className="mt-2 rounded-full overflow-hidden bg-surface-2"
            style={{
              height: '4px',
            }}
          >
            <div
              className={`h-full transition-all duration-300 ${isFirst ? 'bg-warn' : 'bg-primary'}`}
              style={{
                width: `${percentage}%`,
              }}
            />
          </div>
        </div>
      </Link>
    </div>
  );
}
