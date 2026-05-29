import useSWR from 'swr';
import { endpoints } from '@/config/api';
import { ScoreCard } from '@/components';
import { useLoc } from '@/hooks';
import type { RecentPlayedWidgetProps, RecentPlayedData, Score } from '@/types';
import { motion } from 'framer-motion';
import { LoadingSpinner } from '@/components';


const fetcher = async (...args: Parameters<typeof fetch>) =>
  await fetch(...args).then(async (res) => res.json());

/**
 * 将 RecentPlayedData 转换为 Score 类型
 */
function convertToScore(data: RecentPlayedData): Score {
  const chartLevel = parseInt(data.level);

  // 构造 levels 数组，确保 levels[chartLevel] = difficulty
  const levels = new Array(chartLevel + 1).fill('');
  levels[chartLevel] = data.difficulty;

  return {
    acc: {
      dx: data.acc,
      classic: data.acc
    },
    dxScore: 0, // RecentPlayedData 中没有 dxScore
    comboState: data.comboState,
    chartLevel: chartLevel,
    hash: '', // RecentPlayedData 中没有 hash
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

/**
 * 最近游玩记录组件
 * 显示指定用户最近游玩的谱面及成绩
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

  if (error) return <div className="m-auto w-full text-[50px] text-center">{loc('ServerError', '服务器错误')}</div>;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-10 w-full"><LoadingSpinner size="50px" /></div>
    );
  }

  if (!data || data.length === 0) return <p>{loc('NoRecentRecords', '暂无最近游玩记录')}</p>;
  const filter_data = data.slice(0,9);
  const list = filter_data.map((recentData) => {
    const score = convertToScore(recentData);

    return (
      <motion.div
        key={recentData.chartId}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="flex max-[480px]:flex-[1_1_100%] max-[768px]:flex-[1_1_150px] justify-center w-full"
      >
        <ScoreCard score={score} showLikeButton={true} />
      </motion.div>
    );
  });

  return <div className="justify-center gap-[0.6rem] grid grid-cols-[repeat(auto-fit,minmax(20rem,20.6rem))] mx-auto p-2 w-full max-w-350">{list}</div>;
}
