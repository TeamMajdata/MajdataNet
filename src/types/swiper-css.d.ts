// Swiper 的分模块样式只以无扩展名路径导出（swiper/css、swiper/css/free-mode……），
// 开着 noUncheckedSideEffectImports 时 TypeScript 找不到它们，这里声明一下（Vite 照常按 exports 解析）
declare module 'swiper/css';
declare module 'swiper/css/*';
