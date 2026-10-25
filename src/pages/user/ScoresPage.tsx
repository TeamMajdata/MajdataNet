import React, { useState, useMemo, useEffect } from 'react';
import useSWR from 'swr';
import { endpoints } from '@/config/api';
import { ScoreCard, PageLayout, LoadingSpinner } from '@/components';
import { useI18n } from '@/hooks';
import type { Score } from '@/types';
import { ComboState } from '@/types';
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

// ---- ComboState 筛选相关 ----

type ComboStateFilter = 'apPlus' | 'ap' | 'fcPlus' | 'fc' | 'notFc';

const COMBO_FILTER_STORAGE_KEY = 'majdata_scores_combo_filter';

const ALL_COMBO_FILTERS: ComboStateFilter[] = ['apPlus', 'ap', 'fcPlus', 'fc', 'notFc'];

const COMBO_FILTER_LABELS: Record<ComboStateFilter, string> = {
  apPlus: 'AP+',
  ap: 'AP',
  fcPlus: 'FC+',
  fc: 'FC',
  notFc: '未FC',
};

/** 筛选芯片激活态颜色，参照 ScoreCard 的 comboBadgeClass */
const COMBO_FILTER_COLORS: Record<ComboStateFilter, string> = {
  apPlus: 'bg-gradient-to-r from-amber-400 to-yellow-300 text-black shadow-[0_0_10px_rgb(251_191_36/0.35)]',
  ap: 'bg-gradient-to-r from-amber-400/80 to-yellow-300/80 text-black shadow-[0_0_8px_rgb(251_191_36/0.25)]',
  fcPlus: 'bg-gradient-to-r from-blue-500 to-sky-300 text-white shadow-[0_0_10px_rgb(56_189_248/0.35)]',
  fc: 'bg-gradient-to-r from-blue-500/80 to-sky-300/80 text-white shadow-[0_0_8px_rgb(56_189_248/0.25)]',
  notFc: 'bg-slate-600 text-white shadow-lg',
};

const loadComboFilter = (): ComboStateFilter[] => {
  try {
    const stored = localStorage.getItem(COMBO_FILTER_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch { return [...ALL_COMBO_FILTERS]; }
  return [...ALL_COMBO_FILTERS];
};

const saveComboFilter = (filters: ComboStateFilter[]) => {
  localStorage.setItem(COMBO_FILTER_STORAGE_KEY, JSON.stringify(filters));
};

/** 将 comboState 数值映射到筛选分组 */
const toFilterKey = (comboState: number): ComboStateFilter | null => {
  if (comboState === ComboState.APPlus) return 'apPlus';
  if (comboState === ComboState.AP) return 'ap';
  if (comboState === ComboState.FCPlus) return 'fcPlus';
  if (comboState === ComboState.FC) return 'fc';
  if (comboState === ComboState.None) return 'notFc';
  return null;
};

/**
 * 个人成绩页面组件
 */
export default function PersonalScoresPage() {
  const { i18n } = useI18n();
  const [sortBy, setSortBy] = useState<SortOption>('timestamp');
  const [currentPage, setCurrentPage] = useState(1);
  const [comboFilter, setComboFilter] = useState<ComboStateFilter[]>(loadComboFilter);

  const { data, error, isLoading } = useSWR<Score[]>(
    endpoints.account.scores,
    fetcher
  );

  // 翻页时滚动到顶部
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentPage]);

  // 按 Combo 状态筛选后的数据
  const filteredData = useMemo(() => {
    if (!data) return [];
    return data.filter((score) => {
      const state = typeof score.comboState === 'number' ? score.comboState : Number(score.comboState);
      const key = toFilterKey(state);
      return key !== null && comboFilter.includes(key);
    });
  }, [data, comboFilter]);

  // 排序后的数据
  const sortedData = useMemo(() => {
    if (!filteredData.length) return [];

    const sorted = [...filteredData];

    switch (sortBy) {
      case 'timestamp':
        return sorted.sort((a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
      case 'dxAcc':
        return sorted.sort((a, b) => b.acc.dx - a.acc.dx);
      case 'classicAcc':
        return sorted.sort((a, b) => b.acc.classic - a.acc.classic);
      case 'dxScore':
        return sorted.sort((a, b) => b.dxScore - a.dxScore);
      case 'comboState':
        return sorted.sort((a, b) => {
          const stateA = typeof a.comboState === 'number' ? a.comboState : 0;
          const stateB = typeof b.comboState === 'number' ? b.comboState : 0;
          return stateB - stateA;
        });
      default:
        return sorted;
    }
  }, [filteredData, sortBy]);

  // 统计：筛选后数据的各项合计
  const totalDxAcc = useMemo(() => {
    if (!filteredData.length) return 0;
    return filteredData.reduce((sum, score) => sum + score.acc.dx, 0);
  }, [filteredData]);

  const totalClassicAcc = useMemo(() => {
    if (!filteredData.length) return 0;
    return filteredData.reduce((sum, score) => sum + score.acc.classic, 0);
  }, [filteredData]);

  const totalDxScoreSum = useMemo(() => {
    if (!filteredData.length) return 0;
    return filteredData.reduce((sum, score) => sum + score.dxScore, 0);
  }, [filteredData]);

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

  // 切换筛选条件时重置到第一页，并持久化到 localStorage
  const handleFilterToggle = (filter: ComboStateFilter) => {
    setComboFilter((prev) => {
      const next = prev.includes(filter)
        ? prev.filter((f) => f !== filter)
        : [...prev, filter];
      saveComboFilter(next);
      return next;
    });
    setCurrentPage(1);
  };

  if (error) {
    return (
      <PageLayout>
        <div className="m-auto w-full text-[50px] text-center">
          {i18n("user/scores/ScoresPage.ServerError", '服务器错误')}
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
          <p className="text-xl">{i18n("user/scores/ScoresPage.NoScores", '暂无成绩记录')}</p>
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
        <h1 className="my-5 sm:my-8 font-semibold text-white text-3xl sm:text-4xl text-center [text-shadow:0_2px_4px_rgb(0_0_0/30%)]">
          {i18n("user/scores/ScoresPage.PersonalScores", '我的成绩')}
        </h1>

        {/* 统计数据卡片 — 基于筛选后数据 */}
        <div className="gap-3 grid grid-cols-2 lg:grid-cols-4 mx-auto mb-6 max-w-3xl">
          <div className="flex flex-col justify-center bg-[rgb(var(--background-start)/0.5)] backdrop-blur-sm px-4 py-4 border border-white/10 rounded-xl text-center">
            <div className="mb-1 text-gray-400 text-xs tracking-wide">{i18n("user/scores/ScoresPage.TotalDxAcc", 'DX准确率合计')}</div>
            <div className="font-bold tabular-nums text-purple-400 text-xl sm:text-2xl">{totalDxAcc.toFixed(4)}</div>
          </div>
          <div className="flex flex-col justify-center bg-[rgb(var(--background-start)/0.5)] backdrop-blur-sm px-4 py-4 border border-white/10 rounded-xl text-center">
            <div className="mb-1 text-gray-400 text-xs tracking-wide">{i18n("user/scores/ScoresPage.TotalClassicAcc", 'Classic准确率合计')}</div>
            <div className="font-bold tabular-nums text-emerald-400 text-xl sm:text-2xl">{totalClassicAcc.toFixed(4)}</div>
          </div>
          <div className="flex flex-col justify-center bg-[rgb(var(--background-start)/0.5)] backdrop-blur-sm px-4 py-4 border border-white/10 rounded-xl text-center">
            <div className="mb-1 text-gray-400 text-xs tracking-wide">{i18n("user/scores/ScoresPage.TotalDxScore", 'DX分数合计')}</div>
            <div className="font-bold tabular-nums text-amber-400 text-xl sm:text-2xl">{totalDxScoreSum.toFixed(0)}</div>
          </div>
          <div className="flex flex-col justify-center bg-[rgb(var(--background-start)/0.5)] backdrop-blur-sm px-4 py-4 border border-white/10 rounded-xl text-center">
            <div className="mb-1 text-gray-400 text-xs tracking-wide">{i18n("user/scores/ScoresPage.FilteredCount", '筛选结果')}</div>
            <div className="font-bold tabular-nums text-white text-xl sm:text-2xl">{filteredData.length}</div>
          </div>
        </div>

        {/* 第一行：排序依据 */}
        <div className="flex flex-col sm:flex-row flex-wrap justify-center items-stretch sm:items-center gap-3 sm:gap-4 mx-auto mb-4 max-w-4xl">
          <span className="font-medium text-white text-sm">
            {i18n("user/scores/ScoresPage.SortBy", '排序依据')}
          </span>
          <div className="flex flex-wrap justify-center gap-2">
            <button
              onClick={() => handleSortChange('timestamp')}
              className={`px-4 py-2 rounded-lg transition-all duration-200 ${sortBy === 'timestamp'
                ? 'bg-blue-500 text-white shadow-lg'
                : 'bg-[rgb(var(--background-start)/0.6)] text-gray-300 hover:bg-[rgb(var(--background-start)/0.8)]'
                }`}
            >
              {i18n("user/scores/ScoresPage.SortByTime", '游玩时间')}
            </button>
            <button
              onClick={() => handleSortChange('dxAcc')}
              className={`px-4 py-2 rounded-lg transition-all duration-200 ${sortBy === 'dxAcc'
                ? 'bg-blue-500 text-white shadow-lg'
                : 'bg-[rgb(var(--background-start)/0.6)] text-gray-300 hover:bg-[rgb(var(--background-start)/0.8)]'
                }`}
            >
              {i18n("user/scores/ScoresPage.SortByDxAcc", 'DX准确率')}
            </button>
            <button
              onClick={() => handleSortChange('classicAcc')}
              className={`px-4 py-2 rounded-lg transition-all duration-200 ${sortBy === 'classicAcc'
                ? 'bg-blue-500 text-white shadow-lg'
                : 'bg-[rgb(var(--background-start)/0.6)] text-gray-300 hover:bg-[rgb(var(--background-start)/0.8)]'
                }`}
            >
              {i18n("user/scores/ScoresPage.SortByClassicAcc", 'Classic准确率')}
            </button>
            <button
              onClick={() => handleSortChange('dxScore')}
              className={`px-4 py-2 rounded-lg transition-all duration-200 ${sortBy === 'dxScore'
                ? 'bg-blue-500 text-white shadow-lg'
                : 'bg-[rgb(var(--background-start)/0.6)] text-gray-300 hover:bg-[rgb(var(--background-start)/0.8)]'
                }`}
            >
              {i18n("user/scores/ScoresPage.SortByDxScore", 'DX分数')}
            </button>
            <button
              onClick={() => handleSortChange('comboState')}
              className={`px-4 py-2 rounded-lg transition-all duration-200 ${sortBy === 'comboState'
                ? 'bg-blue-500 text-white shadow-lg'
                : 'bg-[rgb(var(--background-start)/0.6)] text-gray-300 hover:bg-[rgb(var(--background-start)/0.8)]'
                }`}
            >
              {i18n("user/scores/ScoresPage.SortByCombo", 'Combo状态')}
            </button>
          </div>
        </div>

        {/* 第二行：Combo状态筛选 */}
        <div className="flex flex-col sm:flex-row flex-wrap justify-center items-stretch sm:items-center gap-3 sm:gap-4 mx-auto mb-8 max-w-4xl">
          <span className="font-medium text-white text-sm">
            {i18n("user/scores/ScoresPage.FilterByCombo", 'Combo筛选')}
          </span>
          <div className="flex flex-wrap justify-center gap-2">
            {ALL_COMBO_FILTERS.map((filter) => {
              const isActive = comboFilter.includes(filter);
              return (
                <button
                  key={filter}
                  onClick={() => handleFilterToggle(filter)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${isActive
                    ? COMBO_FILTER_COLORS[filter]
                    : 'bg-[rgb(var(--background-start)/0.6)] text-gray-300 hover:bg-[rgb(var(--background-start)/0.8)]'
                    }`}
                >
                  {COMBO_FILTER_LABELS[filter]}
                </button>
              );
            })}
          </div>
        </div>

        <div
          className="relative mx-auto my-8 border-0 w-[70%] h-px"
          style={{
            background: 'linear-gradient(90deg, transparent 0%, rgb(255 255 255 / 20%) 15%, rgb(255 255 255 / 40%) 30%, rgb(255 255 255 / 60%) 50%, rgb(255 255 255 / 40%) 70%, rgb(255 255 255 / 20%) 85%, transparent 100%)'
          }}
        />

        {/* 成绩卡片列表 / 无筛选结果提示 */}
        {filteredData.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-gray-400 text-lg">
              {i18n("user/scores/ScoresPage.NoFilterResults", '没有符合筛选条件的成绩')}
            </p>
            <p className="mt-2 text-gray-500 text-sm">
              {i18n("user/scores/ScoresPage.NoFilterResultsHint", '请尝试调整上方的 Combo 筛选条件')}
            </p>
          </div>
        ) : (
          <>
            <div className="justify-center gap-3 sm:gap-[0.6rem] grid grid-cols-[minmax(0,20.6rem)] sm:grid-cols-[repeat(auto-fit,minmax(20rem,20.6rem))] mx-auto p-0 sm:p-2 w-full max-w-350 min-w-0">
              {paginatedData.map((score) => (
                <motion.div
                  key={`${score.hash}-${score.timestamp}`}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                  className="flex justify-center w-full min-w-0"
                >
                  <ScoreCard
                    score={score}
                    showLikeButton={true}
                    showComboEffects={true}
                    showRank={true}
                  />
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

                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(page => {
                      if (page === 1 || page === totalPages) return true;
                      if (Math.abs(page - currentPage) <= 2) return true;
                      return false;
                    })
                    .map((page, index, arr) => {
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
          </>
        )}

      </motion.section>
    </PageLayout>
  );
}
