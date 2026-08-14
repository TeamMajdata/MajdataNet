import { endpoints } from '@/config/api';
import useSWR from 'swr';
import { useLoc } from '@/hooks';
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
  const loc = useLoc();

  // 获取 mmfc_bot 用户的分数总和数据
  const { data, error, isLoading } = useSWR<ScoreData[]>(
    endpoints.stats.scoreSums('mmfc_bot', 0, 1000),
    fetcher,
    { refreshInterval: 30000 } // 每30秒刷新一次
  );

  if (error) {
    return (
      <div className="flex justify-center items-center p-8 text-danger">
        {loc('FailedToLoad', '加载失败')}
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-100">
        <LoadingSpinner className="w-12 h-12" />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex justify-center items-center p-8 text-ink-2">
        <p>{loc('NoMMFCRankingData', '暂无MMFC排名数据')}</p>
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
      <div className="flex justify-center items-center p-8 text-ink-2">
        <p>{loc('NoMMFCRankingData', '暂无MMFC排名数据')}</p>
      </div>
    );
  }

  return (
    <div
      className="mx-auto px-4 max-w-4xl"
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

  // 根据排名确定边框和文字颜色（扁平化）
  let borderColorClass = 'border-line';
  let borderColorHex = '#e5e7eb';
  let rankColorClass = 'text-ink-3';

  if (isFirst) {
    // 第一名：金色（warn）
    borderColorClass = 'border-warn/50';
    borderColorHex = 'rgba(245, 158, 11, 0.5)';
    rankColorClass = 'text-warn';
  } else if (isSecond || isThird) {
    // 第二、第三名：品牌蓝
    borderColorClass = 'border-primary/50';
    borderColorHex = 'rgba(92, 141, 193, 0.5)';
    rankColorClass = 'text-primary';
  }

  return (
    <Link
      to={`/space?id=${username}`}
      className="block text-inherit no-underline"
    >
      <div
        className={`relative flex items-center gap-4 px-6 py-4 rounded-lg transition-all duration-300 ease-out ${isTopThree ? `border-2 ${borderColorClass}` : ''}`}
        onMouseEnter={(e) => {
          const el = e.currentTarget as HTMLElement;
          el.style.transform = 'translateY(-2px)';
          el.style.boxShadow = '0 8px 24px rgb(16 24 40 / 0.08)';
          if (isFirst) {
            el.style.borderColor = 'rgba(245, 158, 11, 0.65)';
          } else if (isSecond || isThird) {
            el.style.borderColor = 'rgba(92, 141, 193, 0.65)';
          } else {
            el.style.borderColor = '#d1d5db';
          }
        }}
        onMouseLeave={(e) => {
          const el = e.currentTarget as HTMLElement;
          el.style.transform = 'translateY(0)';
          el.style.borderColor = borderColorHex;
          el.style.boxShadow = '0 1px 2px rgb(16 24 40 / 0.05)';
        }}
      >
        {/* 排名显示 */}
        <div className="flex justify-center items-center min-w-20 shrink-0">
          <span
            className={`font-bold transition-all duration-300 ${rankColorClass}`}
            style={{
              fontSize: isFirst ? '1.8rem' : isSecond ? '1.7rem' : isThird ? '1.65rem' : '1.4rem',
            }}
          >
            #{rank}
          </span>
        </div>

        {/* 玩家信息 */}
        <div className="flex flex-1 items-center gap-3 min-w-0">
          <img
            className={`border-2 rounded-full w-12 h-12 object-cover transition-all duration-300 shrink-0 ${isTopThree ? (isFirst ? 'border-warn/40' : 'border-primary/40') : 'border-line'}`}
            style={{
              aspectRatio: '1',
            }}
            src={endpoints.account.icon(username)}
            alt={username}
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLElement;
              el.style.borderColor = isTopThree ? (isFirst ? 'rgba(245, 158, 11, 0.6)' : 'rgba(92, 141, 193, 0.6)') : '#d1d5db';
              el.style.boxShadow = '0 4px 12px rgb(16 24 40 / 0.1)';
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLElement;
              el.style.borderColor = isTopThree ? (isFirst ? 'rgba(245, 158, 11, 0.4)' : 'rgba(92, 141, 193, 0.4)') : '#e5e7eb';
              el.style.boxShadow = 'none';
            }}
          />

          <div className="flex flex-col flex-1 gap-1 min-w-0 overflow-hidden">
            <span className="overflow-hidden font-semibold text-ink text-lg text-ellipsis whitespace-nowrap">
              {username}
            </span>
          </div>
        </div>

        {/* 分数显示 */}
        <div className="flex flex-col items-end gap-1 text-right shrink-0">
          <div className="font-bold text-ink text-2xl">
            {scoresum.toFixed(4)}%
          </div>
        </div>
      </div>
    </Link>
  );
}
