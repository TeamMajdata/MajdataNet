/**
 * ScoreRanking 组件 - 排行榜（重设计版）
 * 包含等级选择 TabBar 和排行榜展示
 */

import React, { useState, useMemo } from 'react';
import useSWR from 'swr';
import { motion, AnimatePresence } from 'framer-motion';
import { endpoints } from '@/config/api';
import { useI18n } from '@/hooks';
import { getComboState, getLevelName } from '@/utils';
import { LoadingSpinner } from '@/components';
import { Link } from 'react-router-dom';
import type { ChartScore, ScoreListProps } from '@/types';

const fetcher = (url: string) =>
  fetch(url, { mode: 'cors', credentials: 'include' }).then((res) => res.json());

const listSwapVariants = {
  enter: (direction: number) => ({
    opacity: 0.34,
    x: direction > 0 ? 82 : -82,
    scale: 0.92,
    rotateX: 0,
    rotateY: direction > 0 ? -10 : 10,
    filter: 'blur(3px)'
  }),
  center: {
    opacity: 1,
    x: 0,
    scale: 1,
    rotateX: 0,
    rotateY: 0,
    filter: 'blur(0px)'
  },
  exit: (direction: number) => ({
    opacity: 0.26,
    x: direction > 0 ? -78 : 78,
    scale: 0.91,
    rotateX: 0,
    rotateY: direction > 0 ? 9 : -9,
    filter: 'blur(3px)'
  })
};

// TabBar 组件 - 等级选择
function LevelTabBar({
  levels,
  scoreLevels,
  activeLevel,
  onSelect
}: {
  levels: string[];
  scoreLevels: ChartScore[][];
  activeLevel: number;
  onSelect: (level: number) => void;
}) {

  // 获取有效等级的索引（排除空成绩）
  const validLevels = useMemo(() => {
    return scoreLevels.reduce<number[]>((acc, scoreList, index) => {
      if (scoreList && scoreList.length > 0) {
        acc.push(index);
      }
      return acc;
    }, []);
  }, [scoreLevels]);

  if (validLevels.length <= 1) {
    return null;
  }

  return (
    <div className="relative">
      {/* 背景装饰 */}
      <div className="absolute inset-0 bg-linear-to-b from-white/5 to-transparent rounded-xl" />

      {/* TabBar 容器 */}
      <div className="relative flex items-center gap-1 p-1.5 overflow-x-auto scrollbar-hide">
        {validLevels.map((levelIndex) => {
          const isActive = levelIndex === activeLevel;
          const levelValue = levels[levelIndex] || '';

          return (
            <button
              key={levelIndex}
              onClick={() => onSelect(levelIndex)}
              className={`
                relative flex flex-col items-center justify-center min-w-14 px-3 py-2 rounded-lg
                transition-all duration-200 ease-out whitespace-nowrap shrink-0
                ${isActive
                  ? 'bg-white/20 shadow-[0_4px_12px_rgb(0_0_0/0.25),inset_0_1px_0_rgb(255_255_255/0.15)] border border-white/25'
                  : 'bg-white/8 hover:bg-white/12 border border-transparent hover:border-white/15'
                }
              `}
            >
              {/* 等级名称 */}
              <span
                className={`
                  text-xs font-semibold tracking-wide transition-colors duration-200
                  ${isActive ? 'text-white' : 'text-white/60'}
                `}
              >
                {getLevelName(levelIndex)}
              </span>

              {/* 等级数值 */}
              <span
                className={`
                  text-sm font-bold transition-colors duration-200 mt-0.5
                  ${isActive ? 'text-white' : 'text-white/50'}
                `}
              >
                {levelValue}
              </span>

              {/* 选中指示器 */}
              {isActive && (
                <motion.div
                  layoutId="activeTabIndicator"
                  className="bottom-0 left-1/2 absolute bg-linear-to-r from-transparent via-white/80 to-transparent rounded-full w-8 h-0.5 -translate-x-1/2"
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// 排行榜卡片组件
function RankingCard({
  score,
  rank
}: {
  score: ChartScore;
  rank: number;
}) {
  const comboState = getComboState(score.comboState);

  // 根据 combo state 确定样式
  const getComboStyles = () => {
    if (comboState === 'AP+' || comboState === 'AP') {
      return {
        border: 'border-amber-500/50',
        shadow: 'shadow-[0_4px_16px_rgb(251_191_36/0.25),0_0_20px_rgb(251_191_36/0.15)]',
        badge: 'bg-gradient-to-r from-amber-500 to-amber-400',
        textClass: 'text-amber-400'
      };
    } else if (comboState === 'FC+' || comboState === 'FC') {
      return {
        border: 'border-blue-400/50',
        shadow: 'shadow-[0_4px_16px_rgb(59_130_246/0.25),0_0_20px_rgb(59_130_246/0.15)]',
        badge: 'bg-gradient-to-r from-blue-500 to-blue-400',
        textClass: 'text-blue-400'
      };
    }
    return {
      border: 'border-white/10',
      shadow: '',
      badge: 'bg-white/20',
      textClass: 'text-white/80'
    };
  };

  const styles = getComboStyles();

  const topThreeAvatarClass =
    rank === 1
      ? 'border-amber-400 shadow-[0_0_0_1px_rgb(251_191_36/0.35),0_0_12px_rgb(251_191_36/0.45),0_0_22px_rgb(251_191_36/0.2)]'
      : rank === 2
        ? 'border-gray-300 shadow-[0_0_0_1px_rgb(209_213_219/0.35),0_0_12px_rgb(209_213_219/0.4),0_0_22px_rgb(209_213_219/0.18)]'
        : 'border-amber-600 shadow-[0_0_0_1px_rgb(217_119_6/0.35),0_0_12px_rgb(217_119_6/0.4),0_0_22px_rgb(217_119_6/0.2)]';

  // 显示状态文本
  const getDisplayText = () => {
    if (score.acc < 80) return 'Failed';
    if (comboState && comboState !== '') return comboState;
    return 'Clear';
  };

  // Top 3 特殊样式
  const getRankBadgeStyle = () => {
    if (rank === 1) return 'bg-gradient-to-br from-yellow-400 to-amber-500 text-black';
    if (rank === 2) return 'bg-gradient-to-br from-gray-300 to-gray-400 text-black';
    if (rank === 3) return 'bg-gradient-to-br from-amber-600 to-amber-700 text-white';
    return 'bg-white/15 text-white/70';
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.985 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.985 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      layout
    >
      <div
        className={`
          group relative flex items-center gap-3 p-3 rounded-xl
          bg-white/8 hover:bg-white/12 backdrop-blur-md
          border ${styles.border} ${styles.shadow}
          transition-all duration-200 ease-out
          hover:shadow-[0_8px_25px_rgb(0_0_0/0.3)]
          hover:-translate-y-0.5
        `}
      >
        {/* 排名标记 */}
        <div
          className={`
            flex items-center justify-center min-w-9 h-9 rounded-lg
            font-bold text-sm ${getRankBadgeStyle()}
            transition-transform duration-200 group-hover:scale-105
          `}
        >
          #{rank}
        </div>

        {/* 玩家信息 */}
        <Link
          to={'/space?id=' + score.player.username}
          className="flex flex-1 items-center gap-2.5 min-w-0 no-underline"
        >
          {/* 头像 */}
          <div className="relative shrink-0">
            <img
              className={`
                w-10 h-10 rounded-full object-cover
                border-2 transition-all duration-200
                group-hover:scale-105
                ${rank <= 3 ? topThreeAvatarClass : 'border-white/20 group-hover:border-white/40'}
              `}
              src={endpoints.account.icon(score.player.username)}
              alt={score.player.username}
            />
          </div>

          {/* 用户名 */}
          <div className="flex flex-col flex-1 min-w-0">
            <span
              className={`
                font-semibold text-sm truncate
                transition-colors duration-200
                group-hover:text-white
                ${rank <= 3 ? 'text-white' : 'text-white/90'}
              `}
            >
              {score.player.username}
            </span>
            {rank <= 3 && (
              <span className="font-medium text-[10px] text-white/50">
                {rank === 1 ? '1st Place' : rank === 2 ? '2nd Place' : '3rd Place'}
              </span>
            )}
          </div>
        </Link>

        {/* 成绩信息 */}
        <div className="flex flex-col items-end gap-0.5 shrink-0">
          <span
            className={`
              text-lg font-bold tabular-nums
              ${styles.textClass}
            `}
          >
            {score.acc.toFixed(4)}%
          </span>
          <span
            className={`
              text-[10px] font-semibold px-1.5 py-0.5 rounded
              ${score.acc < 80
                ? 'bg-red-500/30 text-red-300'
                : styles.badge + ' text-white/90'
              }
            `}
          >
            {getDisplayText()}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

// 空状态组件
function EmptyState() {
  const { i18n } = useI18n();

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col justify-center items-center px-4 py-16"
    >
      <div className="flex justify-center items-center bg-white/5 mb-4 rounded-full w-16 h-16">
        <svg
          className="w-8 h-8 text-white/30"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      </div>
      <p className="font-medium text-white/50 text-sm text-center">
        {i18n("song/ScoreRanking.NoRecords", '暂无成绩记录')}
      </p>
    </motion.div>
  );
}

// 单个等级排行榜
function RankingList({
  scores,
  level
}: {
  scores: ChartScore[];
  level: number;
}) {
  if (!scores || scores.length === 0) {
    return <EmptyState />;
  }

  return (
    <motion.div
      key={level}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="flex flex-col gap-2"
    >
      {scores.map((score, index) => (
        <RankingCard
          key={`${score.player.username}-${index}`}
          score={score}
          rank={index + 1}
        />
      ))}
    </motion.div>
  );
}

// ======================== 主组件 ========================
export function ScoreRanking({ songid }: ScoreListProps) {
  const { i18n } = useI18n();
  const [activeLevel, setActiveLevel] = useState<number>(0);
  const [transitionDirection, setTransitionDirection] = useState<1 | -1>(1);

  const { data, error, isLoading } = useSWR(
    endpoints.maichart.score(songid),
    fetcher,
    { revalidateOnFocus: true }
  );

  // 获取所有有效等级
  const levels = useMemo(() => data?.levels || [], [data?.levels]);
  const scoreLevels = useMemo(() => data?.scores || [], [data?.scores]);

  // 确保 activeLevel 在有效范围内
  const validLevels = useMemo(() => {
    const result: number[] = [];
    scoreLevels.forEach((scoreList: ChartScore[], index: number) => {
      if (scoreList && scoreList.length > 0) {
        result.push(index);
      }
    });
    return result;
  }, [scoreLevels]);

  // 如果当前 activeLevel 没有数据，切换到第一个有效等级
  const currentLevelScores = scoreLevels[activeLevel] || [];
  const hasActiveData = currentLevelScores.length > 0;
  const resolvedActiveLevel = hasActiveData ? activeLevel : (validLevels[0] ?? 0);

  React.useEffect(() => {
    if (!hasActiveData && validLevels.length > 0) {
      setActiveLevel(validLevels[0]);
    }
  }, [hasActiveData, validLevels]);

  // 获取当前等级对应的数据
  const displayScores = scoreLevels[resolvedActiveLevel] || [];

  // 处理加载状态
  if (error) {
    return (
      <div className="bg-white/5 p-4 border border-white/10 rounded-xl w-full">
        <p className="text-white/60 text-sm text-center">{i18n("song/ScoreRanking.FailedToLoad", '加载失败')}</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="bg-white/5 p-4 border border-white/10 rounded-xl w-full">
        <div className="flex justify-center items-center py-12">
          <LoadingSpinner className="border-2 border-white/20 border-t-white/60 rounded-full w-8 h-8" />
        </div>
      </div>
    );
  }

  if (!data || !data.scores) {
    return (
      <div className="bg-white/5 p-4 border border-white/10 rounded-xl w-full">
        <EmptyState />
      </div>
    );
  }

  return (
    <div className="space-y-4 w-full">
      {/* 标题 */}
      <div className="flex justify-between items-center">
        <h2 className="flex items-center gap-2 font-bold text-white text-xl">
          <svg
            className="w-5 h-5 text-white/70"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
          {i18n("song/ScoreRanking.RankingList", '排行榜')}
        </h2>

        {/* 统计信息 */}
        <span className="font-medium text-white/40 text-xs">
          {displayScores.length} {i18n("song/ScoreRanking.Records", '条记录')}
        </span>
      </div>

      {/* 等级 TabBar */}
      <LevelTabBar
        levels={levels}
        scoreLevels={scoreLevels}
        activeLevel={resolvedActiveLevel}
        onSelect={(level) => {
          if (level === resolvedActiveLevel) {
            return;
          }
          setTransitionDirection(level > resolvedActiveLevel ? 1 : -1);
          setActiveLevel(level);
        }}
      />

      {/* 当前选中等级的标题 */}
      <div className="flex items-center gap-2 px-1">
        <div className="bg-linear-to-b from-white/60 to-white/20 rounded-full w-1 h-4" />
        <span className="font-semibold text-white/70 text-sm">
          {getLevelName(resolvedActiveLevel)}
          {' · '}
          <span className="text-white/50">{levels[resolvedActiveLevel] || '-'}</span>
        </span>
      </div>

      {/* 排行榜内容 */}
      <div className="relative mx-auto w-full max-w-4xl min-h-50" style={{ perspective: 1400 }}>
        <div className="relative overflow-hidden">
          <AnimatePresence mode="wait" custom={transitionDirection}>
            {validLevels.length > 0 ? (
              <motion.div
                key={resolvedActiveLevel}
                custom={transitionDirection}
                variants={listSwapVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{
                  x: { type: 'spring', stiffness: 260, damping: 28 },
                  opacity: { duration: 0.18 },
                  scale: { duration: 0.22 },
                  rotateY: { duration: 0.24 },
                  filter: { duration: 0.2 }
                }}
                className="relative origin-top"
              >
                <RankingList
                  scores={scoreLevels[resolvedActiveLevel] || []}
                  level={resolvedActiveLevel}
                />
              </motion.div>
            ) : (
              <motion.div
                key="empty-state"
                variants={listSwapVariants}
                initial="enter"
                animate="center"
                exit="exit"
                custom={transitionDirection}
                className="relative"
              >
                <EmptyState />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
