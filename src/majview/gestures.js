// 判定盘上的触摸手势参数。网页版没有独立的播放页，手势都放在判定盘上：
// 双击播放/暂停、长按 2 倍速、左右拖动调整进度，右半边上下拖动调音量、左半边上下拖动调背景亮度。
export const TAP_SLOP_PX = 10; // 移动不超过这个距离才算点按
export const DOUBLE_TAP_MS = 300; // 两次点按的间隔上限
export const DOUBLE_TAP_SLOP_PX = 24; // 两次点按的位置差上限
export const LONG_PRESS_MS = 450; // 按住多久开始 2 倍速
export const SCRUB_SLOP_PX = 14; // 横向移动超过这个距离才算拖动进度
export const SCRUB_SECONDS_PER_WIDTH = 60; // 拖过整个判定盘宽度的时长
export const KEY_SEEK_SECONDS = 5; // 左右方向键一次前进 / 后退的秒数

/**
 * 拖动进度时的目标时间：手指向右是前进，向左是后退。
 * 拖过整个判定盘宽度对应 60 秒；歌比这短时整首歌铺满宽度，免得轻轻一拖就到底。
 */
export function seekTarget(start, dx, width, begin, duration) {
  if (!(width > 0) || !(duration > begin)) return start;
  const span = Math.min(SCRUB_SECONDS_PER_WIDTH, duration - begin);
  return Math.min(duration, Math.max(begin, start + (dx / width) * span));
}

/**
 * 上下拖动调数值：往上拖变大，拖过整个判定盘高度正好走完整个范围，结果按步长取整并限制在范围内。
 * 背景亮度要“往上更亮”，调用方传反过来的 dy 去调暗度。
 */
export function swipeValue(start, dy, height, min, max, step) {
  if (!(height > 0)) return start;
  const value = start - (dy / height) * (max - min);
  // 0.1 的倍数直接乘会得到 1.5000000000000002 这种值，再按小数位收一下
  const rounded = Number((Math.round(value / step) * step).toFixed(6));
  return Math.min(max, Math.max(min, rounded));
}
