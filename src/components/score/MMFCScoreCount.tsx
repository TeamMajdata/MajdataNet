import { endpoints } from '@/config/api';
import useSWR from 'swr';
import { useI18n } from '@/hooks';
import { LoadingSpinner } from '@/components';
import type { ScoreData } from '@/types';
import mmfcParticipants from '@/assets/data/mmfc-participants.json';
import { Link } from 'react-router-dom';

const fetcher = (url: string) =>
  fetch(url, { mode: 'cors', credentials: 'include' }).then((res) => res.json());

/**
 * MMFC打榜排名组件
 * 显示指定参与者对 mmfc_bot 谱面的游玩总分排名
 */
export default function MMFCScoreCount() {
  const { i18n } = useI18n();

  // 获取 mmfc_bot 用户的分数总和数据
  const { data, error, isLoading } = useSWR<ScoreData[]>(
    endpoints.stats.scoreSums('mmfc_bot', 0, 1000),
    fetcher,
    { refreshInterval: 30000 } // 每30秒刷新一次
  );

  if (error) {
    return (
      <div className="flex justify-center items-center p-8 text-red-400">
        {i18n("shared/MMFCScoreCount.FailedToLoad", '加载失败')}
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-100">
        <LoadingSpinner className="border-white border-b-2 rounded-full w-12 h-12" />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex justify-center items-center p-8 text-white/70">
        <p>{i18n("shared/MMFCScoreCount.NoMMFCRankingData", '暂无MMFC排名数据')}</p>
      </div>
    );
  }

  // 从 JSON 文件获取参与者列表
  const participantsList = mmfcParticipants.participants || [];

  // 过滤出指定的参与者
  const filteredData = data.filter(p => participantsList.includes(p.username));

  // 按分数降序排序
  const sortedData = filteredData.sort((a, b) => b.dxAccSum - a.dxAccSum);

  if (sortedData.length === 0) {
    return (
      <div className="flex justify-center items-center p-8 text-white/70">
        <p>{i18n("shared/MMFCScoreCount.NoMMFCRankingData", '暂无MMFC排名数据')}</p>
      </div>
    );
  }

  return (
    <div
      className="mx-auto px-0 sm:px-4 max-w-4xl"
      style={{
        marginTop: '2rem',
      }}
    >
      <div className="flex flex-col gap-4">
        {sortedData.map((player, index) => (
          <MMFCScoreCard
            key={player.username}
            rank={index + 1}
            username={player.username}
            scoresum={player.dxAccSum}
          />
        ))}
      </div>
    </div>
  );
}

interface MMFCScoreCardProps {
  rank: number;
  username: string;
  scoresum: number;
}

/**
 * MMFC分数卡片组件
 */
function MMFCScoreCard({ rank, username, scoresum }: MMFCScoreCardProps) {
  // 根据排名确定样式
  const isFirst = rank === 1;
  const isSecond = rank === 2;
  const isThird = rank === 3;
  const isTopThree = isFirst || isSecond || isThird;

  // 根据排名确定边框和光效颜色
  let borderColor = 'rgba(255, 255, 255, 0.1)';
  let glowColor = 'rgba(255, 255, 255, 0)';
  let rankColor = 'rgba(255, 255, 255, 0.8)';
  let rankGradient = '';

  if (isFirst) {
    // 第一名：金色
    borderColor = 'rgba(251, 191, 36, 0.45)';
    glowColor = 'rgba(251, 191, 36, 0.32)';
    rankColor = '#fbbf24';
    rankGradient = 'linear-gradient(135deg, #fbbf24 0%, #fcd34d 50%, #fbbf24 100%)';
  } else if (isSecond || isThird) {
    // 第二、第三名：蓝色
    borderColor = 'rgba(59, 130, 246, 0.45)';
    glowColor = 'rgba(59, 130, 246, 0.32)';
    rankColor = '#3b82f6';
    rankGradient = 'linear-gradient(135deg, #3b82f6 0%, #60a5fa 50%, #3b82f6 100%)';
  }

  return (
    <Link
      to={`/space?id=${username}`}
      className="block text-inherit no-underline"
    >
      <div
        className="relative flex items-center gap-2 sm:gap-4 px-3 sm:px-6 py-3 sm:py-4 min-w-0 transition-all duration-300 ease-out"
        style={{
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.05))',
          backdropFilter: 'blur(10px)',
          border: `1.5px solid ${borderColor}`,
          borderRadius: '12px',
          boxShadow: isTopThree
            ? `0 2px 8px rgba(0, 0, 0, 0.12), 0 0 10px 2px ${glowColor}, 0 0 6px 1px ${glowColor}, inset 0 0 8px 1px ${glowColor}`
            : '0 4px 15px rgba(0, 0, 0, 0.2), 0 2px 8px rgba(0, 0, 0, 0.1)',
        }}
        onMouseEnter={(e) => {
          const el = e.currentTarget as HTMLElement;
          el.style.transform = 'translateY(-2px)';
          if (isFirst) {
            el.style.borderColor = 'rgba(251, 191, 36, 0.65)';
            el.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.3), 0 4px 12px rgba(0, 0, 0, 0.2), 0 0 20px rgba(251, 191, 36, 0.25), inset 0 0 20px rgba(251, 191, 36, 0.12)';
          } else if (isSecond || isThird) {
            el.style.borderColor = 'rgba(59, 130, 246, 0.65)';
            el.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.18), 0 0 16px 3px rgba(59, 130, 246, 0.45), 0 0 10px 2px rgba(59, 130, 246, 0.32), inset 0 0 12px 2px rgba(59, 130, 246, 0.22)';
          } else {
            el.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.3), 0 4px 12px rgba(0, 0, 0, 0.2)';
            el.style.borderColor = 'rgba(255, 255, 255, 0.2)';
          }
        }}
        onMouseLeave={(e) => {
          const el = e.currentTarget as HTMLElement;
          el.style.transform = 'translateY(0)';
          el.style.borderColor = borderColor;
          el.style.boxShadow = isTopThree
            ? `0 2px 8px rgba(0, 0, 0, 0.12), 0 0 10px 2px ${glowColor}, 0 0 6px 1px ${glowColor}, inset 0 0 8px 1px ${glowColor}`
            : '0 4px 15px rgba(0, 0, 0, 0.2), 0 2px 8px rgba(0, 0, 0, 0.1)';
        }}
      >
        {/* 排名显示 */}
        <div className="flex justify-center items-center min-w-12 sm:min-w-20 shrink-0">
          <span
            className="font-bold transition-all duration-300"
            style={{
              fontSize: isFirst ? '1.8rem' : isSecond ? '1.7rem' : isThird ? '1.65rem' : '1.4rem',
              color: rankColor,
              ...(isTopThree && {
                background: rankGradient,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                filter: isFirst
                  ? 'drop-shadow(0 0 8px rgba(251, 191, 36, 0.6))'
                  : 'drop-shadow(0 0 6px rgba(59, 130, 246, 0.5))',
                textShadow: isFirst
                  ? '0 0 12px rgba(251, 191, 36, 0.7), 0 0 20px rgba(251, 191, 36, 0.5), 0 2px 4px rgba(0, 0, 0, 0.5)'
                  : '0 0 10px rgba(59, 130, 246, 0.6), 0 0 18px rgba(59, 130, 246, 0.4), 0 2px 4px rgba(0, 0, 0, 0.5)',
              }),
              ...(!isTopThree && {
                textShadow: '0 2px 4px rgba(0, 0, 0, 0.4)',
              })
            }}
          >
            #{rank}
          </span>
        </div>

        {/* 玩家信息 */}
        <div className="flex flex-1 items-center gap-3 min-w-0">
          <img
            className="border-2 rounded-full w-10 sm:w-12 h-10 sm:h-12 object-cover transition-all duration-300 shrink-0"
            style={{
              borderColor: isTopThree ? (isFirst ? 'rgba(251, 191, 36, 0.4)' : 'rgba(59, 130, 246, 0.4)') : 'rgba(255, 255, 255, 0.2)',
              aspectRatio: '1',
            }}
            src={endpoints.account.icon(username)}
            alt={username}
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLElement;
              el.style.borderColor = isTopThree ? (isFirst ? 'rgba(251, 191, 36, 0.6)' : 'rgba(59, 130, 246, 0.6)') : 'rgba(255, 255, 255, 0.4)';
              el.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.3)';
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLElement;
              el.style.borderColor = isTopThree ? (isFirst ? 'rgba(251, 191, 36, 0.4)' : 'rgba(59, 130, 246, 0.4)') : 'rgba(255, 255, 255, 0.2)';
              el.style.boxShadow = 'none';
            }}
          />

          <div className="flex flex-col flex-1 gap-1 min-w-0 overflow-hidden">
            <span
              className="overflow-hidden font-semibold text-white text-sm sm:text-lg text-ellipsis whitespace-nowrap"
              style={{
                textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)',
              }}
            >
              {username}
            </span>
          </div>
        </div>

        {/* 分数显示 */}
        <div className="flex flex-col items-end gap-1 text-right min-w-0 shrink-0">
          <div
            className="font-bold text-white text-base sm:text-2xl"
            style={{
              textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)',
            }}
          >
            {scoresum.toFixed(4)}%
          </div>
        </div>
      </div>
    </Link>
  );
}
