import { useEffect, useState, useSyncExternalStore } from 'react';

const INTERVAL_MS = 7000;

export interface Carousel {
  page: number;
  pages: number;
  setPage: (page: number) => void;
  /** 挂到整个区块上：鼠标停在上面时不自动翻页 */
  hoverProps: { onMouseEnter: () => void; onMouseLeave: () => void };
}

/**
 * 首页展柜的翻页状态：count 个条目每页 perPage 个，每隔几秒自动翻到下一页；
 * 鼠标停在区块上、页面在后台、或用户开了“减少动态效果”时不自动翻。
 */
export function useCarousel(count: number, perPage: number): Carousel {
  const [page, setPage] = useState(0);
  const [hovered, setHovered] = useState(false);
  const pages = Math.max(1, Math.ceil(count / perPage));

  useEffect(() => {
    if (hovered || pages <= 1) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timer = window.setInterval(() => {
      if (!document.hidden) setPage(p => (p + 1) % pages);
    }, INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [hovered, pages]);

  return {
    page: Math.min(page, pages - 1),
    pages,
    setPage: next => setPage(((next % pages) + pages) % pages),
    hoverProps: { onMouseEnter: () => setHovered(true), onMouseLeave: () => setHovered(false) },
  };
}

/** 按窗口宽度决定每页几个：传入从小到大的断点，例如 [[0, 2], [640, 3], [1024, 5]] */
export function usePerPage(breakpoints: [number, number][]): number {
  const query = () => breakpoints.reduce((n, [min, count]) => (window.innerWidth >= min ? count : n), breakpoints[0][1]);
  return useSyncExternalStore(
    listener => {
      window.addEventListener('resize', listener);
      return () => window.removeEventListener('resize', listener);
    },
    query,
    () => breakpoints[0][1],
  );
}
