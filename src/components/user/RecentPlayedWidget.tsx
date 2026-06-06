import { useMemo } from 'react';
import useSWR from 'swr';
import { endpoints } from '@/config/api';
import { ScoreCard, LoadingSpinner } from '@/components';
import { useLoc } from '@/hooks';
import type { ChartScore, RecentPlayedWidgetProps, RecentPlayedData, Score } from '@/types';
import { motion } from 'framer-motion';
import RecentActivityChart, { parseRecentTime } from '@/components/chart/RecentActivityChart';

// ─── Types ────────────────────────────────────────────────────────────────────

type RecentRank = {
  rank: number;
  total: number;
};

type ChartScorePayload = {
  scores?: ChartScore[][];
};

// ─── Fetcher ──────────────────────────────────────────────────────────────────

const fetcher = async (...args: Parameters<typeof fetch>) =>
  await fetch(...args).then(async (res) => res.json());

// ─── Rank helpers ─────────────────────────────────────────────────────────────

function findUserRank(
  payload: ChartScorePayload | null,
  username: string,
  levelIndex: number
): RecentRank | null {
  if (!payload?.scores || !Array.isArray(payload.scores)) return null;

  const target = username.trim().toLowerCase();
  const candidateIndexes = [
    levelIndex,
    ...payload.scores.map((_, index) => index).filter((index) => index !== levelIndex),
  ].filter((index) => index >= 0 && index < payload.scores!.length);

  for (const index of candidateIndexes) {
    const scoreList = payload.scores[index];
    if (!Array.isArray(scoreList)) continue;

    const rankIndex = scoreList.findIndex((score) =>
      score.player?.username?.trim().toLowerCase() === target
    );
    if (rankIndex !== -1) {
      return {
        rank: rankIndex + 1,
        total: scoreList.length,
      };
    }
  }

  return null;
}

async function fetchRecentRanks(
  username: string,
  records: RecentPlayedData[]
): Promise<Record<string, RecentRank>> {
  const uniqueRecords = Array.from(
    new Map(records.map((record) => [`${record.chartId}:${record.level}`, record])).values()
  );
  const rankEntries = await Promise.all(
    uniqueRecords.map(async (record) => {
      try {
        const payload = await fetch(endpoints.maichart.score(record.chartId), {
          mode: 'cors',
          credentials: 'include',
        }).then((res) => res.json() as Promise<ChartScorePayload>);
        const rank = findUserRank(payload, username, parseInt(record.level));
        return [`${record.chartId}:${record.level}`, rank] as const;
      } catch {
        return [`${record.chartId}:${record.level}`, null] as const;
      }
    })
  );

  return rankEntries.reduce<Record<string, RecentRank>>((acc, [key, rank]) => {
    if (rank) acc[key] = rank;
    return acc;
  }, {});
}

// ─── Data conversion ─────────────────────────────────────────────────────────

/**
 * 将 RecentPlayedData 转换为 Score 类型
 */
function convertToScore(data: RecentPlayedData): Score {
  const chartLevel = parseInt(data.level);
  const levels = new Array(chartLevel + 1).fill('');
  levels[chartLevel] = data.difficulty;

  return {
    acc: {
      dx: data.acc,
      classic: data.acc
    },
    dxScore: 0,
    comboState: data.comboState,
    chartLevel: chartLevel,
    hash: '',
    chartInfo: {
      id: data.chartId,
      title: data.title,
      artist: data.artist,
      designer: data.designer,
      description: '',
      levels: levels,
      uploader: data.uploader,
      timestamp: data.timestamp || '',
      hash: '',
      tags: [],
      publicTags: []
    },
    timestamp: data.timestamp || ''
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * 最近游玩记录组件
 * 显示指定用户最近游玩的谱面、成绩与活跃度折线图
 */
export default function RecentPlayedWidget({ username, onDataLoaded }: RecentPlayedWidgetProps) {
  const loc = useLoc();

  const { data, error, isLoading } = useSWR<RecentPlayedData[]>(
    endpoints.account.recent(username),
    fetcher,
    {
      onSuccess: (data) => {
        onDataLoaded?.(!!data && data.length > 0);
      },
    }
  );

  const sortedData = useMemo(() => {
    if (!data) return [];
    return [...data].sort((a, b) => {
      const timeA = parseRecentTime(a.timestamp)?.getTime() ?? 0;
      const timeB = parseRecentTime(b.timestamp)?.getTime() ?? 0;
      return timeB - timeA;
    });
  }, [data]);

  const displayData = useMemo(() => sortedData.slice(0, 9), [sortedData]);

  const rankKey = displayData.map((record) => `${record.chartId}:${record.level}`).join('|');
  const { data: rankMap } = useSWR(
    displayData.length > 0 ? ['recent-ranks', username, rankKey] : null,
    () => fetchRecentRanks(username, displayData),
    { revalidateOnFocus: false }
  );

  // ── Loading / Error / Empty ──────────────────────────────────────────────

  if (error) {
    return (
      <div className="m-auto w-full text-[50px] text-center">
        {loc('ServerError', '服务器错误')}
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-10 w-full">
        <LoadingSpinner size="50px" />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return <p>{loc('NoRecentRecords', '暂无最近游玩记录')}</p>;
  }

  // ── Score cards ──────────────────────────────────────────────────────────

  const scoreCards = displayData.map((recentData, index) => {
    const score = convertToScore(recentData);
    const rank = rankMap?.[`${recentData.chartId}:${recentData.level}`] ?? null;

    return (
      <motion.div
        key={`${recentData.chartId}-${recentData.timestamp || index}`}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="flex max-[480px]:flex-[1_1_100%] max-[768px]:flex-[1_1_150px] justify-center w-full"
      >
        <ScoreCard
          score={score}
          showLikeButton={true}
          showComboEffects={true}
          rank={rank?.rank}
          rankTotal={rank?.total}
        />
      </motion.div>
    );
  });

  return (
    <>
      <RecentActivityChart records={sortedData} />
      <div className="justify-center gap-[0.6rem] grid grid-cols-[repeat(auto-fit,minmax(20rem,20.6rem))] mx-auto p-2 w-full max-w-350">
        {scoreCards}
      </div>
    </>
  );
}
