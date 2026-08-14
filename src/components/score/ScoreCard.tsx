/**
 * ScoreCard 组件
 * 展示单个成绩的卡片
 */

import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import useSWR from 'swr';
import { CoverPic, Level, LazyLoad } from '@/components';
import { endpoints } from '@/config/api';
import { getComboState } from '@/utils';
import { useUsername } from '@/hooks';
import type { Score, ChartScore } from '@/types';

const fetcher = async (...args: Parameters<typeof fetch>) =>
  await fetch(...args).then(async (res) => res.json());

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
  showComboEffects?: boolean;
  showRank?: boolean;
  rankUsername?: string;
}

/**
 * ScoreCard 组件
 */
export function ScoreCard({
  score,
  showComboEffects = false,
  showRank = false,
  rankUsername,
}: ScoreCardProps) {
  const currentUsername = useUsername();
  const targetUsername = rankUsername || currentUsername;

  const { data: chartScores } = useSWR(
    showRank && targetUsername ? endpoints.maichart.score(score.chartInfo.id) : null,
    fetcher
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
    ? 'border-warn/60 shadow-card'
    : showComboEffects && isFc
      ? 'border-primary/60 shadow-card'
      : 'border-line shadow-card';
  const comboGlowClass = '';
  const scoreTextClass = showComboEffects && isAp
    ? 'text-warn'
    : showComboEffects && isFc
      ? 'text-primary'
      : '';
  const comboBadgeClass = showComboEffects && isAp
    ? 'bg-warn text-white'
    : showComboEffects && isFc
      ? 'bg-primary text-white'
      : 'bg-surface-2 text-ink-2';

  return (
    <LazyLoad height={104} offset={300}>
      <div
        className={`
          relative ${comboGlowClass}
          ${comboCardClass}
          m-auto flex items-center gap-4 p-3 border rounded-xl w-full overflow-hidden
          transition-transform md:hover:-translate-y-0.5 duration-250 ease-in-out
        `}
      >
        {/* 封面（方形缩略图，覆盖 CoverPic 的圆形/左浮样式） */}
        <div className="relative shrink-0 w-16 md:w-20 aspect-square [&_img]:!rounded-lg [&_img]:!float-none [&_img]:!border-0">
          <CoverPic id={score.chartInfo.id} />
        </div>

        {/* 歌曲信息区 */}
        <div className="flex flex-col flex-1 min-w-0 gap-0.5">
          <div className="flex items-center gap-2 min-w-0">
            <Level
              level={score.chartLevel.toString()}
              difficulty={score.chartInfo.levels[score.chartLevel]}
              songid={score.chartInfo.id}
              isPlayer={false}
            />
            <div className="font-bold text-base md:text-lg truncate leading-snug">
              <Link to={'/song?id=' + score.chartInfo.id}>
                {score.chartInfo.title}
              </Link>
            </div>
          </div>

          <div className="text-[0.8rem] md:text-sm truncate italic text-ink-2">
            <Link to={'/song?id=' + score.chartInfo.id}>
              {score.chartInfo.artist === '' || score.chartInfo.artist == null
                ? '-'
                : score.chartInfo.artist}
            </Link>
          </div>

          <div className="flex items-center gap-2 text-[0.8rem] md:text-sm truncate text-ink-3">
            <span className="flex items-center gap-1 min-w-0">
              <img
                className="inline-block rounded-full w-[1.1rem] h-[1.1rem] overflow-hidden shrink-0"
                src={endpoints.account.icon(score.chartInfo.uploader)}
                alt={score.chartInfo.uploader}
              />
              <Link to={'/space?id=' + score.chartInfo.uploader} className="no-underline hover:text-primary truncate">
                {score.chartInfo.designer}
              </Link>
            </span>
          </div>
        </div>

        {/* 分数信息区（右侧，类似排行榜） */}
        <div className="flex flex-col items-end gap-1 shrink-0">
          <div
            className={`font-black text-lg md:text-2xl tabular-nums leading-none ${scoreTextClass || 'text-ink'}`}
            title={`DX: ${score.acc.dx.toFixed(4)}`}
          >
            {score.acc.dx.toFixed(4)}%
          </div>
          <div className="flex items-center gap-1.5">
            {comboStateText && (
              <span className={`rounded px-1.5 py-0.5 text-[0.65rem] font-bold leading-none ${comboBadgeClass}`}>
                {comboStateText}
              </span>
            )}
            {resolvedRank && (
              <span
                className="bg-warn px-1.5 py-0.5 rounded font-bold text-[0.65rem] text-white leading-none"
                title={resolvedRankTotal ? `#${resolvedRank} / ${resolvedRankTotal}` : `#${resolvedRank}`}
              >
                #{resolvedRank}
              </span>
            )}
          </div>
        </div>
      </div>
    </LazyLoad>
  );
}
