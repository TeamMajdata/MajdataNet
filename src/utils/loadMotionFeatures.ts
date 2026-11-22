/**
 * LazyMotion 的 features：framer-motion 的动画功能单独一个 chunk，第一次用到时才加载。
 *
 * 用 m 组件的界面都必须在 <LazyMotion features={loadMotionFeatures}> 里面，否则动画功能不会加载，
 * 组件停在 initial（比如透明度 0）。App 包住了主界面；用 createRoot 另外挂的界面（下载格式弹窗）要自己再包一层。
 */
export const loadMotionFeatures = () => import('./motionFeatures').then((module) => module.default);
