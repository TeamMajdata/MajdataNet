/**
 * ScoreCard 组件
 * 展示单个成绩的卡片
 */

import { useMemo } from 'react';
import useSWR from 'swr';
import { Link } from 'react-router-dom';
import { CoverPic, Level, LazyLoad } from '@/components';
import MarqueeText from '@/components/ui/MarqueeText';
import { parseTmpRichText } from '@/utils/richTextUtils';
import { apiFetcher } from '@/utils/apiClient';
import { endpoints } from '@/config/api';
import { getComboState } from '@/utils';
import { useUsername } from '@/hooks';
import type { Score, ChartScore, ChartLeaderboardResponse, LevelLeaderboardResponse } from '@/types';

type UserRank = { rank: number; total: number };

/** 后端返回的 level hash 是 64 位小写 hex；迁移期的旧成绩可能缺失或为 null */
function isLevelHash(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{64}$/.test(value);
}

/**
 * 在单个榜单中查找指定用户的排名
 */
function findRankInList(scoreList: ChartScore[] | undefined, target: string): UserRank | null {
  if (!Array.isArray(scoreList)) return null;

  const rankIndex = scoreList.findIndex(
    (score) => score.player?.username?.trim().toLowerCase() === target
  );
  return rankIndex === -1 ? null : { rank: rankIndex + 1, total: scoreList.length };
}

/**
 * 从谱面各难度的成绩列表中查找指定用户的排名：先找 levelIndex 对应的难度，找不到再扫其他难度
 */
function findUserRank(
  payload: { scores?: ChartScore[][] } | null,
  username: string,
  levelIndex: number
): UserRank | null {
  const scores = payload?.scores;
  if (!scores || !Array.isArray(scores)) return null;

  const target = username.trim().toLowerCase();
  const candidateIndexes = [
    levelIndex,
    ...scores.map((_, index) => index).filter((index) => index !== levelIndex),
  ].filter((index) => index >= 0 && index < scores.length);

  for (const index of candidateIndexes) {
    const result = findRankInList(scores[index], target);
    if (result) return result;
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

  // 成绩带有 level hash（来自 account/scores）时直接查该难度的榜；
  // 旧成绩或没有 level hash 的数据（如最近游玩）退回按谱面 Id 查各难度的榜
  const levelHash = isLevelHash(score.levelHash) ? score.levelHash : null;
  const shouldFetchRank = showRank && !!targetUsername;

  const { data: levelScores } = useSWR<LevelLeaderboardResponse>(
    shouldFetchRank && levelHash ? endpoints.maiscore.levelLeaderboard(levelHash) : null,
    apiFetcher
  );
  const { data: chartScores } = useSWR<ChartLeaderboardResponse>(
    shouldFetchRank && !levelHash ? endpoints.maiscore.chartLeaderboard(score.chartInfo.id) : null,
    apiFetcher
  );

  // 计算最终使用的排名信息
  const userRank = useMemo(() => {
    if (!shouldFetchRank) return null;
    if (levelHash) {
      return levelScores ? findRankInList(levelScores.scores, targetUsername.trim().toLowerCase()) : null;
    }
    return chartScores ? findUserRank(chartScores, targetUsername, score.chartLevel) : null;
  }, [shouldFetchRank, levelHash, levelScores, chartScores, targetUsername, score.chartLevel]);

  const resolvedRank = userRank?.rank ?? null;
  const resolvedRankTotal = userRank?.total ?? null;

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
    <LazyLoad height={144} offset={300}>
      <div
        className={`marquee-host relative flex gap-3 bg-[rgb(var(--background-start)/0.8)] ${comboGlowClass} ${comboCardClass} p-2.5 border rounded-2xl w-full h-36 overflow-hidden ring-1 ring-transparent hover:ring-white/30 transition-shadow duration-200`}
      >
        <div className="relative h-full aspect-square shrink-0">
          <CoverPic id={score.chartInfo.id} to={'/song?id=' + score.chartInfo.id} zoomable={false} radiusClassName="rounded-lg" />
          {/* 榜单名次放在封面左上角，不和准确率挤在一行 */}
          {resolvedRank && (
            <span
              className="top-1.5 left-1.5 absolute bg-linear-to-r from-yellow-300 to-amber-500 shadow-[0_2px_8px_rgb(0_0_0/0.4)] px-1.5 py-0.5 rounded font-bold text-[0.7rem] text-black leading-none pointer-events-none"
              title={resolvedRankTotal ? `#${resolvedRank} / ${resolvedRankTotal}` : `#${resolvedRank}`}
            >
              #{resolvedRank}
            </span>
          )}
        </div>

        {/* 文字部分与首页歌曲卡片一致：标题、曲师、上传者@谱师，悬停卡片时被截断的文字循环滚动 */}
        <div className="flex flex-col flex-1 min-w-0">
          <MarqueeText className="font-bold text-base leading-snug">
            <Link to={'/song?id=' + score.chartInfo.id}>{parseTmpRichText(score.chartInfo.title)}</Link>
          </MarqueeText>
          <MarqueeText className="mt-0.5 text-[0.8rem] text-white/70">
            <Link to={'/song?id=' + score.chartInfo.id}>
              {score.chartInfo.artist === '' || score.chartInfo.artist == null ? '-' : score.chartInfo.artist}
            </Link>
          </MarqueeText>
          <MarqueeText className="mt-0.5 text-[0.8rem] text-white/70">
            <Link to={'/space?id=' + score.chartInfo.uploader} className="hover:underline underline-offset-2 decoration-white/60">
              {score.chartInfo.uploader + '@' + score.chartInfo.designer}
            </Link>
          </MarqueeText>

          <div className="flex items-center gap-1.5 mt-1.5 min-w-0 overflow-hidden">
            <Level
              level={score.chartLevel.toString()}
              difficulty={score.chartInfo.levels[score.chartLevel]}
              songid={score.chartInfo.id}
              isPlayer={false}
            />
            <span className={`font-semibold text-[13px] tabular-nums whitespace-nowrap ${scoreTextClass || 'text-white/90'}`} title={`DX: ${score.acc.dx.toFixed(4)}`}>
              {score.acc.dx.toFixed(4)}%
            </span>
            {comboStateText && (
              <span className={`rounded px-1.5 py-0.5 text-[0.65rem] font-bold leading-none shrink-0 ${comboBadgeClass}`}>
                {comboStateText}
              </span>
            )}
          </div>

        </div>
      </div>
    </LazyLoad>
  );
}
