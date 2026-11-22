/**
 * 触屏设备上首页横栏用原生滚动（Swiper 的 cssMode）：iOS 自带的惯性、回弹和横竖方向判断比 JS 模拟的跟手得多，
 * JS 拖动在 Safari 里容易和页面竖向滚动抢手势。鼠标设备保留 Swiper 的拖动（原生滚动不能用鼠标拖）。
 * 只在挂载时判断一次，够用了。
 */
export const NATIVE_SCROLL = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;
