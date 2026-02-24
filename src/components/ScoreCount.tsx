import { apiroot3 } from '@/config/api';
import useSWR from 'swr';
import { useLoc } from '@/hooks';

export interface ScoreCountProps {
  /** 上传者用户名 */
  uploader: string;
  /** 页码（从0开始） */
  page?: number;
  /** 每页数量 */
  pageSize?: number;
}

interface ScoreData {
  username: string;
  dxAccSum: number;
}

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
    return <div className="loading"></div>;
  }

  if (!data || data.length === 0) {
    return <div>{loc('EmptyData', '空的')}</div>;
  }

  const maxScore = data[0].dxAccSum;

  return (
    <div className="song-score-list">
      <div className="theList">
        {data.map((player) => (
          <ScoreCard
            key={player.username}
            username={player.username}
            scoresum={player.dxAccSum}
            maxscore={maxScore}
          />
        ))}
      </div>
    </div>
  );
}

interface ScoreCardProps {
  username: string;
  scoresum: number;
  maxscore: number;
}

/**
 * 单个分数卡片组件
 */
function ScoreCard({ username, scoresum, maxscore }: ScoreCardProps) {
  const percentage = (scoresum / maxscore) * 100;

  return (
    <div style={{ width: '100%' }}>
      <div className="score-card modern-score-card">
        {/* 玩家信息 */}
        <div className="score-player-info">
          <a href={`/space?id=${username}`} className="player-link">
            <img
              className="player-avatar"
              src={`${apiroot3}/account/Icon?username=${username}`}
              alt={username}
            />
            <div className="player-details">
              <span className="player-username">{username}</span>
            </div>
          </a>
        </div>

        {/* 分数显示 */}
        <div className="score-results">
          <div className="score-accuracy">{scoresum.toFixed(4)}%</div>
        </div>

        {/* 进度条 */}
        <div
          style={{
            width: `${percentage}%`,
            height: '2px',
            position: 'fixed',
            backgroundColor: 'rgba(255,255,255,50)',
            left: '0',
            bottom: '10px',
          }}
        ></div>
      </div>
    </div>
  );
}
