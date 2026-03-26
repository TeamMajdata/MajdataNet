/**
 * 个人成绩页面
 * 展示用户所有成绩，支持多种排序方式
 */

import React, { useState, useMemo, useEffect } from 'react';
import useSWR from 'swr';
import { apiroot3 } from '@/config/api';
import { ScoreCard, PageLayout, LoadingSpinner } from '@/components';
import { useLoc } from '@/hooks';
import type { Score } from '@/types';
import { motion, type Variants } from 'framer-motion';

// 动画变体
const slideInUp: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: (delay: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: [0.4, 0, 0.2, 1] as const,
      delay,
    },
  }),
};

const fetcher = async (...args: Parameters<typeof fetch>) =>
  await fetch(...args).then(async (res) => res.json());

type SortOption = 'timestamp' | 'dxAcc' | 'dxScore' | 'comboState' | 'classicAcc';

const ITEMS_PER_PAGE = 18;

/**
 * 个人成绩页面组件
 */
export default function PersonalScoresPage() {
  const loc = useLoc();
  const [sortBy, setSortBy] = useState<SortOption>('timestamp');
  const [currentPage, setCurrentPage] = useState(1);

  const { data, error, isLoading } = useSWR<Score[]>(
    `${apiroot3}/account/scores`,
    fetcher
  );

  // 翻页时滚动到顶部
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentPage]);

  // 排序后的数据
  const sortedData = useMemo(() => {
    if (!data) return [];

    const sorted = [...data];

    switch (sortBy) {
      case 'timestamp':
        // 按最后游玩时间降序（最新的在前）
        return sorted.sort((a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
      case 'dxAcc':
        // 按DX准确率降序
        return sorted.sort((a, b) => b.acc.dx - a.acc.dx);
      case 'classicAcc':
        // 按Classic准确率降序
        return sorted.sort((a, b) => b.acc.classic - a.acc.classic);
      case 'dxScore':
        // 按DX分数降序
        return sorted.sort((a, b) => b.dxScore - a.dxScore);
      case 'comboState':
        // 按Combo状态降序
        return sorted.sort((a, b) => {
          const stateA = typeof a.comboState === 'number' ? a.comboState : 0;
          const stateB = typeof b.comboState === 'number' ? b.comboState : 0;
          return stateB - stateA;
        });
      default:
        return sorted;
    }
  }, [data, sortBy]);

  // 计算总成绩（所有acc.dx的总和）
  const totalScore = useMemo(() => {
    if (!data) return 0;
    return data.reduce((sum, score) => sum + score.acc.dx, 0);
  }, [data]);

  // 分页数据
  const totalPages = Math.ceil(sortedData.length / ITEMS_PER_PAGE);
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return sortedData.slice(startIndex, endIndex);
  }, [sortedData, currentPage]);

  // 切换排序方式时重置到第一页
  const handleSortChange = (newSort: SortOption) => {
    setSortBy(newSort);
    setCurrentPage(1);
  };

  if (error) {
    return (
      <PageLayout>
        <div className="m-auto w-full text-[50px] text-center">
          {loc('ServerError', '服务器错误')}
        </div>
      </PageLayout>
    );
  }

  if (isLoading) {
    return (
      <PageLayout>
        <div className="flex justify-center items-center h-screen">
          <LoadingSpinner size="50px" />
        </div>
      </PageLayout>
    );
  }

  if (!data || data.length === 0) {
    return (
      <PageLayout>
        <div className="flex justify-center items-center min-h-screen">
          <p className="text-xl">{loc('NoScores', '暂无成绩记录')}</p>
        </div>
      </PageLayout>
    );
  }


  return (
    <PageLayout className="pb-8">
      <motion.section
        className="mt-(--content-top-spacing) mb-8"
        initial="hidden"
        animate="visible"
        custom={0.2}
        variants={slideInUp}
      >
        <h1 className="my-8 font-semibold text-white text-4xl text-center [text-shadow:0_2px_4px_rgb(0_0_0/30%)]">
          {loc('PersonalScores', '我的成绩')}
        </h1>

        {/* 总成绩显示 */}
        <div className="mb-6 text-center">
          <div className="inline-block bg-linear-to-r from-purple-500/20 to-blue-500/20 shadow-lg backdrop-blur-sm px-8 py-4 border border-white/20 rounded-2xl">
            <div className="mb-1 text-gray-300 text-sm">{loc('TotalDxScore', '总成绩')}</div>
            <div className="font-bold text-white text-3xl">{totalScore.toFixed(4)}</div>
          </div>
        </div>

        {/* 排序选择器 */}
        <div className="flex flex-wrap justify-center items-center gap-4 mx-auto mb-8 max-w-4xl">
          <span className="font-medium text-white">
            {loc('SortBy', '排序方式')}
          </span>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleSortChange('timestamp')}
              className={`px-4 py-2 rounded-lg transition-all duration-200 ${sortBy === 'timestamp'
                  ? 'bg-blue-500 text-white shadow-lg'
                  : 'bg-[rgb(var(--background-start)/0.6)] text-gray-300 hover:bg-[rgb(var(--background-start)/0.8)]'
                }`}
            >
              {loc('SortByTime', '游玩时间')}
            </button>
            <button
              onClick={() => handleSortChange('dxAcc')}
              className={`px-4 py-2 rounded-lg transition-all duration-200 ${sortBy === 'dxAcc'
                  ? 'bg-blue-500 text-white shadow-lg'
                  : 'bg-[rgb(var(--background-start)/0.6)] text-gray-300 hover:bg-[rgb(var(--background-start)/0.8)]'
                }`}
            >
              {loc('SortByDxAcc', 'DX准确率')}
            </button>
            <button
              onClick={() => handleSortChange('classicAcc')}
              className={`px-4 py-2 rounded-lg transition-all duration-200 ${sortBy === 'classicAcc'
                  ? 'bg-blue-500 text-white shadow-lg'
                  : 'bg-[rgb(var(--background-start)/0.6)] text-gray-300 hover:bg-[rgb(var(--background-start)/0.8)]'
                }`}
            >
              {loc('SortByClassicAcc', 'Classic准确率')}
            </button>
            <button
              onClick={() => handleSortChange('dxScore')}
              className={`px-4 py-2 rounded-lg transition-all duration-200 ${sortBy === 'dxScore'
                  ? 'bg-blue-500 text-white shadow-lg'
                  : 'bg-[rgb(var(--background-start)/0.6)] text-gray-300 hover:bg-[rgb(var(--background-start)/0.8)]'
                }`}
            >
              {loc('SortByDxScore', 'DX分数')}
            </button>
            <button
              onClick={() => handleSortChange('comboState')}
              className={`px-4 py-2 rounded-lg transition-all duration-200 ${sortBy === 'comboState'
                  ? 'bg-blue-500 text-white shadow-lg'
                  : 'bg-[rgb(var(--background-start)/0.6)] text-gray-300 hover:bg-[rgb(var(--background-start)/0.8)]'
                }`}
            >
              {loc('SortByCombo', 'Combo状态')}
            </button>
          </div>
        </div>

        <div
          className="relative mx-auto my-8 border-0 w-[70%] h-px"
          style={{
            background: 'linear-gradient(90deg, transparent 0%, rgb(255 255 255 / 20%) 15%, rgb(255 255 255 / 40%) 30%, rgb(255 255 255 / 60%) 50%, rgb(255 255 255 / 40%) 70%, rgb(255 255 255 / 20%) 85%, transparent 100%)'
          }}
        />

        {/* 成绩卡片列表 */}
        <div className="justify-center gap-[0.6rem] grid grid-cols-[repeat(auto-fit,minmax(20rem,20.6rem))] mx-auto p-2 w-full max-w-350">
          {paginatedData.map((score) => (
            <motion.div
              key={`${score.hash}-${score.timestamp}`}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className="flex max-[480px]:flex-[1_1_100%] max-[768px]:flex-[1_1_150px] justify-center w-full"
            >
              <ScoreCard score={score} showLikeButton={true} />
            </motion.div>
          ))}
        </div>

        {/* 分页控件 */}
        {totalPages > 1 && (
          <motion.div
            className="flex flex-col gap-4 mx-auto mt-8 max-w-4xl"
            initial="hidden"
            animate="visible"
            custom={0.3}
            variants={slideInUp}
          >
            {/* 显示当前范围 */}
            <div className="text-gray-400 text-sm text-center">
              显示 {(currentPage - 1) * ITEMS_PER_PAGE + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, sortedData.length)} / {sortedData.length} 条成绩
            </div>

            <div className="flex flex-wrap justify-center items-center gap-2">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="flex justify-center items-center bg-[rgb(var(--background-start)/0.6)] hover:bg-[rgb(var(--background-start)/0.8)] disabled:opacity-40 px-3 py-2 rounded-lg font-medium text-white text-sm transition-all disabled:cursor-not-allowed"
              >
                «
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="flex justify-center items-center bg-[rgb(var(--background-start)/0.6)] hover:bg-[rgb(var(--background-start)/0.8)] disabled:opacity-40 px-3 py-2 rounded-lg font-medium text-white text-sm transition-all disabled:cursor-not-allowed"
              >
                ‹
              </button>

              {/* 页码按钮 */}
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(page => {
                  // 显示首页、末页、当前页及其前后各2页
                  if (page === 1 || page === totalPages) return true;
                  if (Math.abs(page - currentPage) <= 2) return true;
                  return false;
                })
                .map((page, index, arr) => {
                  // 添加省略号
                  const prevPage = arr[index - 1];
                  const showEllipsis = prevPage && page - prevPage > 1;

                  return (
                    <React.Fragment key={page}>
                      {showEllipsis && (
                        <span className="px-2 text-gray-400">...</span>
                      )}
                      <button
                        onClick={() => setCurrentPage(page)}
                        className={`flex justify-center items-center px-4 py-2 rounded-lg font-medium text-sm transition-all min-w-10 ${currentPage === page
                            ? 'bg-blue-500 text-white shadow-lg'
                            : 'bg-[rgb(var(--background-start)/0.6)] text-gray-300 hover:bg-[rgb(var(--background-start)/0.8)]'
                          }`}
                      >
                        {page}
                      </button>
                    </React.Fragment>
                  );
                })}

              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="flex justify-center items-center bg-[rgb(var(--background-start)/0.6)] hover:bg-[rgb(var(--background-start)/0.8)] disabled:opacity-40 px-3 py-2 rounded-lg font-medium text-white text-sm transition-all disabled:cursor-not-allowed"
              >
                ›
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="flex justify-center items-center bg-[rgb(var(--background-start)/0.6)] hover:bg-[rgb(var(--background-start)/0.8)] disabled:opacity-40 px-3 py-2 rounded-lg font-medium text-white text-sm transition-all disabled:cursor-not-allowed"
              >
                »
              </button>
            </div>
          </motion.div>
        )}

        {/* 统计信息 */}
        <motion.div
          className="flex justify-center gap-8 mx-auto mt-8 max-w-4xl"
          initial="hidden"
          animate="visible"
          custom={0.3}
          variants={slideInUp}
        >
          <div className="bg-[rgb(var(--background-start)/0.6)] px-6 py-4 rounded-lg text-center">
            <div className="font-bold text-white text-2xl">{data.length}</div>
            <div className="text-gray-400 text-sm">{loc('TotalScores', '总成绩数')}</div>
          </div>
        </motion.div>
      </motion.section>
    </PageLayout>
  );
}
