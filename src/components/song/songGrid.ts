/** 谱面卡片网格：手机 1 列，平板 2 列，桌面 3 列，宽屏 4 列；卡片撑满列宽 */
export const SONG_GRID_CLASS = 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 mx-auto w-full max-w-350 min-w-0';

/** 排行榜固定 10 条：用两列排成 5 行，任何宽度下都不会剩半行 */
export const RANKING_GRID_CLASS = 'grid grid-cols-1 sm:grid-cols-2 gap-3 mx-auto w-full max-w-350 min-w-0';

/** 谱面列表/搜索接口每页固定返回的条数 */
export const API_PAGE_SIZE = 30;

/**
 * 每屏合并的接口页数。2 × 30 = 60 条，能被 1/2/3/4 列整除，
 * 网格最后一行不会缺卡片（单页 30 条在 4 列下会剩 2 张）。
 */
export const API_PAGES_PER_VIEW = 2;

/** 第 `page` 屏对应的接口页码 */
export function apiPagesForView(page: number): number[] {
  return Array.from({ length: API_PAGES_PER_VIEW }, (_, index) => page * API_PAGES_PER_VIEW + index);
}
