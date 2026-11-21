/**
 * 滚动相关工具函数
 */

/**
 * 平滑滚动到页面顶部
 */
export const scrollToTop = (): void => {
  const sTop = document.documentElement.scrollTop || document.body.scrollTop;
  
  if (sTop > 10) {
    window.requestAnimationFrame(scrollToTop);
    window.scrollTo(0, sTop - sTop / 9);
  }
};
