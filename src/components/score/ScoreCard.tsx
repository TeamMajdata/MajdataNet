/**
 * ScoreCard 组件
 * 展示单个成绩的卡片
 */

import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import useSWR from 'swr';
import { toast } from 'react-toastify';
import { LoadingSpinner } from '@/components';
import { CoverPic, Level, LazyLoad } from '@/components';
import { endpoints } from '@/config/api';
import { getComboState } from '@/utils';
import { useI18n, useUsername } from '@/hooks';
import type { Score, ChartScore } from '@/types';

const fetcher = async (...args: Parameters<typeof fetch>) =>
  await fetch(...args).then(async (res) => res.json());

function SimpleLikeButton({ songid }: { songid: string }) {
  const { i18n } = useI18n();
  const [isLoading, setIsLoading] = useState(false);
  const { data, error, isLoading: isFetching, mutate } = useSWR(
    endpoints.maichart.interact(songid),
    fetcher
  );

  if (error || isFetching) return null;
  if (!data || data.likes === undefined) return null;

  const likecount = data.likes.length;
  const isLiked = data.isLiked;

  const handleLike = async () => {
    if (isLoading) return;

    const formData = new FormData();
    formData.set('type', 'like');
    formData.set('content', 'like');
    setIsLoading(true);

    try {
      const response = await fetch(
        endpoints.maichart.interact(songid),
        {
          method: 'POST',
          body: formData,
          mode: 'cors',
          credentials: 'include',
        }
      );

      if (response.status === 200) {
        toast.success(isLiked ? i18n("shared/ScoreCard.CancelSuccess") : i18n("shared/ScoreCard.LikeAction") + i18n("shared/ScoreCard.Success"));
        mutate();
      } else {
        toast.error(i18n("shared/ScoreCard.LikeAction") + i18n("shared/ScoreCard.FailedLoginPrompt"));
      }
    } catch {
      toast.error(i18n("shared/ScoreCard.LikeAction") + i18n("shared/ScoreCard.FailedLoginPrompt"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleLike}
      disabled={isLoading}
      className={`flex items-center gap-1.5 px-2 py-1 border rounded-md font-semibold text-xs transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed ${isLiked
        ? 'bg-ok border-ok text-white'
        : 'bg-surface border-line text-ink-2 hover:text-primary hover:border-primary/40'
        }`}
    >
      {isLoading ? (
        <LoadingSpinner className="w-3.5 h-3.5" />
      ) : (
        <svg
          className="w-3.5 h-3.5"
          xmlns="http://www.w3.org/2000/svg"
          height="14"
          viewBox="0 -960 960 960"
          width="14"
          fill="currentColor"
        >
          <path d="M720-120H280v-520l280-280 50 50q7 7 11.5 19t4.5 23v14l-44 174h258q32 0 56 24t24 56v80q0 7-2 15t-4 15L794-168q-9 20-30 34t-44 14Zm-360-80h360l120-280v-80H480l54-220-174 174v406Zm0-406v406-406Zm-80-34v80H160v360h120v80H80v-520h200Z" />
        </svg>
      )}
      <span className="text-xs">{likecount}</span>
    </button>
  );
}

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
    <LazyLoad height={165} width={352} offset={300}>
      <div
        className={`
          relative ${comboGlowClass}
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
                className="bg-warn px-1.5 py-0.5 rounded font-bold text-[0.65rem] text-white leading-none"
                title={resolvedRankTotal ? `#${resolvedRank} / ${resolvedRankTotal}` : `#${resolvedRank}`}
              >
                #{resolvedRank}
              </span>
            )}
          </div>

          {showLikeButton && (
            <div className="flex flex-wrap gap-1 mt-1">
              <SimpleLikeButton songid={score.chartInfo.id} />
            </div>
          )}
        </div>
      </div>
    </LazyLoad>
  );
}
