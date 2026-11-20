import { useTranslation } from 'react-i18next';
import React, { useState, useMemo, useEffect } from 'react';
import useSWR from 'swr';
import { endpoints } from '@/config/api';
import { ScoreCard, PageLayout, LoadingSpinner } from '@/components';
import SortMenu from '@/components/ui/SortMenu';
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
  notFc: 'Not FC',
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
  const { t } = useTranslation();
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

  const sortOptions: SortOption[] = ['timestamp', 'dxAcc', 'classicAcc', 'dxScore', 'comboState'];
  const sortLabels: Record<SortOption, string> = {
    timestamp: t("user/scores/ScoresPage.SortByTime"),
    dxAcc: t("user/scores/ScoresPage.SortByDxAcc"),
    classicAcc: t("user/scores/ScoresPage.SortByClassicAcc"),
    dxScore: t("user/scores/ScoresPage.SortByDxScore"),
    comboState: t("user/scores/ScoresPage.SortByCombo"),
  };

  const header = (
    <header className="mb-5 sm:mb-6">
      <h1 className="m-0 font-semibold text-white! text-2xl! sm:text-3xl! text-left! tracking-tight">
        {t("user/scores/ScoresPage.PersonalScores")}
      </h1>
      {data && data.length > 0 && (
        <p className="m-0 mt-1.5 text-white/55! text-sm">{t("user/scores/ScoresPage.TotalCount", { count: data.length })}</p>
      )}
    </header>
  );

  if (error || isLoading || !data || data.length === 0) {
    return (
      <PageLayout showBackToHome={false}>
        <div className="mx-auto py-5 sm:py-8 w-full max-w-350 min-w-0">
          {header}
          {isLoading ? (
            <div className="flex justify-center items-center py-24"><LoadingSpinner size="50px" /></div>
          ) : (
            <p className="m-0 py-24 text-white/45! text-base text-center">
              {error ? t("user/scores/ScoresPage.ServerError") : t("user/scores/ScoresPage.NoScores")}
            </p>
          )}
        </div>
      </PageLayout>
    );
  }

  const stats = [
    { label: t("user/scores/ScoresPage.TotalDxAcc"), value: totalDxAcc.toFixed(4), color: 'text-purple-300' },
    { label: t("user/scores/ScoresPage.TotalClassicAcc"), value: totalClassicAcc.toFixed(4), color: 'text-emerald-300' },
    { label: t("user/scores/ScoresPage.TotalDxScore"), value: totalDxScoreSum.toFixed(0), color: 'text-amber-300' },
    { label: t("user/scores/ScoresPage.FilteredCount"), value: String(filteredData.length), color: 'text-white' },
  ];

  return (
    <PageLayout showBackToHome={false}>
      <div className="mx-auto py-5 sm:py-8 w-full max-w-350 min-w-0">
        {header}

        {/* 统计：基于筛选后的成绩 */}
        <div className="gap-3 grid grid-cols-2 lg:grid-cols-4 mb-5">
          {stats.map(({ label, value, color }) => (
            <div key={label} className="bg-white/[0.03] px-4 py-3 border border-white/10 rounded-2xl min-w-0">
              <div className="text-white/50 text-xs">{label}</div>
              <div className={`mt-1 font-semibold text-xl sm:text-2xl tabular-nums truncate ${color}`}>{value}</div>
            </div>
          ))}
        </div>

        {/* 工具栏：左边 Combo 筛选（可多选），右边排序 */}
        <div className="z-30 relative flex flex-wrap justify-between items-center gap-3 mb-5">
          <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label={t("user/scores/ScoresPage.FilterByCombo")}>
            <span className="mr-1 text-white/50 text-sm">{t("user/scores/ScoresPage.FilterByCombo")}</span>
            {ALL_COMBO_FILTERS.map((filter) => {
              const isActive = comboFilter.includes(filter);
              return (
                <button
                  key={filter}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => handleFilterToggle(filter)}
                  className={`px-3 rounded-full h-8 text-xs font-semibold border transition-colors cursor-pointer ${isActive
                    ? COMBO_FILTER_COLORS[filter] + ' border-transparent'
                    : 'bg-white/[0.03] border-white/10 text-white/45 hover:text-white/75 hover:border-white/20'
                    }`}
                >
                  {filter === 'notFc' ? t("user/scores/ScoresPage.NotFc") : COMBO_FILTER_LABELS[filter]}
                </button>
              );
            })}
          </div>
          <SortMenu
            label={t("user/scores/ScoresPage.SortBy")}
            options={sortOptions.map((option) => sortLabels[option])}
            value={sortOptions.indexOf(sortBy)}
            onChange={(index) => handleSortChange(sortOptions[index])}
          />
        </div>

        {/* 成绩卡片列表 / 无筛选结果提示 */}
        {filteredData.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-gray-400 text-lg">
              {t("user/scores/ScoresPage.NoFilterResults")}
            </p>
            <p className="mt-2 text-gray-500 text-sm">
              {t("user/scores/ScoresPage.NoFilterResultsHint")}
            </p>
          </div>
        ) : (
          <>
            <div className="justify-center gap-3 sm:gap-[0.6rem] grid grid-cols-[minmax(0,20.6rem)] sm:grid-cols-[repeat(auto-fit,minmax(20rem,20.6rem))] mx-auto p-0 sm:p-2 w-full max-w-350 min-w-0">
              {paginatedData.map((score) => (
                <motion.div
                  key={score.levelHash || `${score.hash}-${score.timestamp}`}
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

      </div>
    </PageLayout>
  );
}
