import { apiroot3 } from '@/config/api';
import useSWR from 'swr';
import { useLoc } from '@/hooks';
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
    `${apiroot3}/stats/score-sums?uploader=${encodeURIComponent(uploader)}&page=${page}&pageSize=${pageSize}`,
    fetcher,
    { refreshInterval: 30000 } // 每30秒刷新一次
  );

  if (error) {
    return <div>{loc('FailedToLoad', '加载失败')}</div>;
  }

  if (isLoading) {
    return <div className="flex justify-center items-center min-h-20">
      <div className="border-white border-b-2 rounded-full w-8 h-8 animate-spin"></div>
    </div>;
  }

  if (!data || data.length === 0) {
    return <div>{loc('EmptyData', '空的')}</div>;
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
          className="relative p-3 h-full transition-all duration-300 ease-out"
          style={{
            background: 'var(--glassmorphism-bg-secondary)',
            backdropFilter: 'var(--glassmorphism-backdrop)',
            border: isFirst ? '2px solid rgba(255, 215, 0, 0.5)' : 'var(--glassmorphism-border)',
            borderRadius: 'var(--glassmorphism-border-radius)',
            boxShadow: isFirst 
              ? '0 4px 20px rgba(255, 215, 0, 0.3), var(--glassmorphism-shadow)'
              : 'var(--glassmorphism-shadow)',
          }}
          onMouseEnter={(e) => {
            const el = e.currentTarget as HTMLElement;
            el.style.transform = 'translateY(-4px) scale(1.02)';
            el.style.boxShadow = isFirst
              ? '0 8px 30px rgba(255, 215, 0, 0.4), 0 4px 12px rgb(0 0 0 / 20%)'
              : '0 8px 25px rgb(0 0 0 / 30%), 0 4px 12px rgb(0 0 0 / 20%)';
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget as HTMLElement;
            el.style.transform = 'translateY(0) scale(1)';
            el.style.boxShadow = isFirst
              ? '0 4px 20px rgba(255, 215, 0, 0.3), var(--glassmorphism-shadow)'
              : 'var(--glassmorphism-shadow)';
          }}
        >
          {/* 第一名标记 */}
          {isFirst && (
            <div
              className="top-2 right-2 absolute px-2 py-1 rounded font-bold text-sm"
              style={{
                background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
                color: '#000',
                textShadow: '0 1px 2px rgba(255, 255, 255, 0.3)',
                boxShadow: '0 2px 8px rgba(255, 215, 0, 0.5)',
              }}
            >
              1st
            </div>
          )}

          {/* 玩家头像 */}
          <div className="flex justify-center mb-2">
            <img
              className="border-2 rounded-full w-16 h-16 object-cover transition-all duration-300"
              style={{
                borderColor: isFirst ? 'rgba(255, 215, 0, 0.6)' : 'rgb(255 255 255 / 20%)',
                aspectRatio: '1',
              }}
              src={`${apiroot3}/account/Icon?username=${username}`}
              alt={username}
            />
          </div>

          {/* 用户名 */}
          <div 
            className="mb-2 px-1 font-semibold text-white text-sm text-center truncate"
            style={{
              textShadow: '0 1px 2px rgb(0 0 0 / 30%)',
            }}
          >
            {username}
          </div>

          {/* 分数 */}
          <div 
            className="font-bold text-white text-lg text-center"
            style={{
              textShadow: '0 1px 2px rgb(0 0 0 / 30%)',
              color: isFirst ? '#FFD700' : 'white',
            }}
          >
            {scoresum.toFixed(4)}%
          </div>

          {/* 进度条 */}
          <div
            className="mt-2 rounded-full overflow-hidden"
            style={{
              height: '4px',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
            }}
          >
            <div
              style={{
                width: `${percentage}%`,
                height: '100%',
                background: isFirst
                  ? 'linear-gradient(90deg, #FFD700 0%, #FFA500 100%)'
                  : 'rgba(255, 255, 255, 0.5)',
                transition: 'width 0.3s ease',
              }}
            />
          </div>
        </div>
      </Link>
    </div>
  );
}
