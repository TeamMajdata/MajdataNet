/**
 * 首次打开网页的阶段：第一个真正的页面（带 PageLayout 的页头和页脚）出来之前都算。
 *
 * 这段时间的加载界面是盖满窗口的纯色背景、正中转圈（和 index.html 里 JS 加载前的那屏一样），
 * 之后站内跳转的加载才放进带页头页脚的页面外壳里。
 */
let booted = false;

export function isBooted() {
  return booted;
}

/** 第一个页面挂上时调用（PageLayout 里），之后的加载界面都用页面外壳版 */
export function markBooted() {
  booted = true;
}
