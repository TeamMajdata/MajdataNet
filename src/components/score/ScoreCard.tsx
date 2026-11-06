/**
 * ScoreCard 组件
 * 展示单个成绩的卡片
 */

import { useMemo } from 'react';
import useSWR from 'swr';
import { Link } from 'react-router-dom';
import { CoverPic, Level, LazyLoad } from '@/components';
import { ChartVoteBadge } from '@/components/song/SongInteraction';
import { apiFetcher } from '@/utils/apiClient';
import { endpoints } from '@/config/api';
import { getComboState } from '@/utils';
import { useUsername } from '@/hooks';
import type { Score, ChartScore } from '@/types';

/**
 * 从谱面成绩列表中查找指定用户的排名
 */
function findUserRank(
  payload: { scores?: ChartScore[][] } | null,
  username: string,
  levelIndex: number
): { rank: number; total: number } | null {
  const scores = payload?.scores;
  if (!scores || !Array.isArray(scores)) return null;

  const target = username.trim().toLowerCase();
  const candidateIndexes = [
    levelIndex,
    ...scores.map((_, index) => index).filter((index) => index !== levelIndex),
  ].filter((index) => index >= 0 && index < scores.length);

  for (const index of candidateIndexes) {
    const scoreList = scores[index];
    if (!Array.isArray(scoreList)) continue;

    const rankIndex = scoreList.findIndex(
      (score) => score.player?.username?.trim().toLowerCase() === target
    );
    if (rankIndex !== -1) {
      return { rank: rankIndex + 1, total: scoreList.length };
    }
  }

  return null;
}

export interface ScoreCardProps {
  score: Score;
  showLikeButton?: boolean;
  showComboEffects?: boolean;
  showRank?: boolean;
  rankUsername?: string;
}

/**
 * ScoreCard 组件
 */
export function ScoreCard({
  score,
  showLikeButton = true,
  showComboEffects = false,
  showRank = false,
  rankUsername,
}: ScoreCardProps) {
  const currentUsername = useUsername();
  const targetUsername = rankUsername || currentUsername;

  const { data: chartScores } = useSWR(
    showRank && targetUsername ? endpoints.maichart.score(score.chartInfo.id) : null,
    apiFetcher
  );

  // 计算最终使用的排名信息
  const resolvedRank = useMemo(() => {
    if (!showRank || !chartScores || !targetUsername) return null;
    const result = findUserRank(chartScores, targetUsername, score.chartLevel);
    return result?.rank ?? null;
  }, [showRank, chartScores, targetUsername, score.chartLevel]);

  const resolvedRankTotal = useMemo(() => {
    if (!showRank || !chartScores || !targetUsername) return null;
    const result = findUserRank(chartScores, targetUsername, score.chartLevel);
    return result?.total ?? null;
  }, [showRank, chartScores, targetUsername, score.chartLevel]);

  const comboStateNumber = typeof score.comboState === 'number' ? score.comboState : Number(score.comboState);
  const comboStateText = comboStateNumber > 0 ? getComboState(comboStateNumber) : '';
  const isAp = comboStateText === 'AP' || comboStateText === 'AP+';
  const isFc = comboStateText === 'FC' || comboStateText === 'FC+';
  const comboCardClass = showComboEffects && isAp
    ? 'border-amber-400/60 shadow-[0_20px_60px_rgb(0_0_0/40%),0_8px_32px_rgb(0_0_0/20%),0_0_22px_rgb(251_191_36/0.28),0_0_42px_rgb(251_191_36/0.14),inset_0_0_18px_rgb(251_191_36/0.16)]'
    : showComboEffects && isFc
      ? 'border-blue-400/60 shadow-[0_20px_60px_rgb(0_0_0/40%),0_8px_32px_rgb(0_0_0/20%),0_0_20px_rgb(56_189_248/0.26),0_0_40px_rgb(59_130_246/0.14),inset_0_0_18px_rgb(56_189_248/0.14)]'
      : 'border-white/10 shadow-[0_20px_60px_rgb(0_0_0/40%),0_8px_32px_rgb(0_0_0/20%),0_2px_0_rgb(255_255_255/8%)_inset]';
  const comboGlowClass = showComboEffects && isAp
    ? 'bg-[radial-gradient(circle_at_88%_15%,rgb(251_191_36/0.24),transparent_34%)]'
    : showComboEffects && isFc
      ? 'bg-[radial-gradient(circle_at_88%_15%,rgb(56_189_248/0.22),transparent_34%)]'
      : '';
  const scoreTextClass = showComboEffects && isAp
    ? 'text-amber-300 drop-shadow-[0_0_10px_rgb(251_191_36/0.45)]'
    : showComboEffects && isFc
      ? 'text-sky-300 drop-shadow-[0_0_10px_rgb(56_189_248/0.42)]'
      : '';
  const comboBadgeClass = showComboEffects && isAp
    ? 'bg-gradient-to-r from-amber-400 to-yellow-300 text-black shadow-[0_0_12px_rgb(251_191_36/0.44)]'
    : showComboEffects && isFc
      ? 'bg-gradient-to-r from-blue-500 to-sky-300 text-white shadow-[0_0_12px_rgb(56_189_248/0.42)]'
      : 'bg-white/15 text-white/85';

  return (
    <LazyLoad height={165} width={352} offset={300}>
      <div
        className={`
          relative bg-[rgb(var(--background-start)/0.8)] ${comboGlowClass}
          ${comboCardClass}
          m-auto p-[0.8rem] border rounded-[10px] w-full max-w-[20rem] h-40 overflow-hidden
          transition-transform md:hover:-translate-y-1.25 duration-250 ease-in-out
        `}
      >
        <CoverPic id={score.chartInfo.id} />
        <div className="ml-[8.9rem]">
          <div className="mb-1.25 font-bold text-base truncate">
            <Link to={'/song?id=' + score.chartInfo.id}>
              {score.chartInfo.title}
            </Link>
          </div>

          <div className="mb-[0.3rem] text-[0.8rem] truncate italic">
            <Link to={'/song?id=' + score.chartInfo.id}>
              {score.chartInfo.artist === '' || score.chartInfo.artist == null
                ? '-'
                : score.chartInfo.artist}
            </Link>
          </div>

          <div className="mb-2 text-[0.8rem] truncate">
            <Link to={'/space?id=' + score.chartInfo.uploader}>
              <img
                className="inline-block mx-[0.1rem] rounded-[1.3rem] w-[1.3rem] h-[1.3rem] overflow-hidden cursor-pointer select-none"
                src={endpoints.account.icon(score.chartInfo.uploader)}
                alt={score.chartInfo.uploader}
              />
              {score.chartInfo.designer}
            </Link>
          </div>

          <Level
            level={score.chartLevel.toString()}
            difficulty={score.chartInfo.levels[score.chartLevel]}
            songid={score.chartInfo.id}
            isPlayer={false}
          />

          <div className="flex flex-wrap items-center gap-1 mt-1">
            <div
              className={`float-left m-[0.1rem] h-[1.3rem] overflow-hidden text-[0.8rem] text-center leading-[1.2rem] select-none ${scoreTextClass}`}
              title={`DX: ${score.acc.dx.toFixed(4)}`}
            >
              {score.acc.dx.toFixed(4)}
            </div>
            {comboStateText && (
              <span className={`rounded px-1.5 py-0.5 text-[0.65rem] font-bold leading-none ${comboBadgeClass}`}>
                {comboStateText}
              </span>
            )}
            {resolvedRank && (
              <span
                className="bg-linear-to-r from-yellow-300 to-amber-500 shadow-[0_0_12px_rgb(251_191_36/0.35)] px-1.5 py-0.5 rounded font-bold text-[0.65rem] text-black leading-none"
                title={resolvedRankTotal ? `#${resolvedRank} / ${resolvedRankTotal}` : `#${resolvedRank}`}
              >
                #{resolvedRank}
              </span>
            )}
          </div>

          {showLikeButton && (
            <div className="flex flex-wrap gap-1 mt-1">
              <ChartVoteBadge songid={score.chartInfo.id} />
            </div>
          )}
        </div>
      </div>
    </LazyLoad>
  );
}
