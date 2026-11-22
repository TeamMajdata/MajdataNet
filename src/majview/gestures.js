// 判定盘上的手势参数。网页版没有独立的播放页，所有操作都放在播放器上：
// 触摸：双击播放/暂停、长按 2 倍速、左右拖动调进度、右半屏上下调音量、左半屏上下调亮度。
// 桌面：空格播放/暂停、左右键快进快退、长按右键 2 倍速、双击全屏，拖动和触摸一致。
export const TAP_SLOP_PX = 10; // 移动不超过这个距离才算点按
export const DOUBLE_TAP_MS = 300; // 两次点按的间隔上限
export const DOUBLE_TAP_SLOP_PX = 24; // 两次点按的位置差上限
export const LONG_PRESS_MS = 450; // 按住多久开始 2 倍速
export const SCRUB_SLOP_PX = 14; // 横向移动超过这个距离才算拖动进度
export const SCRUB_SECONDS_PER_WIDTH = 60; // 拖过整个判定盘宽度的时长

// 竖向手势：先要盖过点按的抖动，之后按距离换算音量和亮度
export const VERTICAL_SLOP_PX = 12;
export const VOLUME_DRAG_PX = 200; // 竖直拖动这么多像素 = 总音量 1.0
export const BRIGHT_DRAG_PX = 200; // 竖直拖动这么多像素 = 背景暗度 10（整档）

// 键盘
export const ARROW_STEP_SEC = 0.01; // 暂停时按一下左右键前进/后退的步长
export const ARROW_SEEK_SEC = 5; // 播放时按一下左右键跳的秒数
export const KEY_FAST_RATE = 2; // 长按右箭头时的倍速

/**
 * 拖动进度时的目标时间：手指向右是前进，向左是后退。
 * 拖过整个判定盘宽度对应 60 秒；歌比这短时整首歌铺满宽度，免得轻轻一拖就到底。
 */
export function seekTarget(start, dx, width, begin, duration) {
  if (!(width > 0) || !(duration > begin)) return start;
  const span = Math.min(SCRUB_SECONDS_PER_WIDTH, duration - begin);
  return Math.min(duration, Math.max(begin, start + (dx / width) * span));
}
