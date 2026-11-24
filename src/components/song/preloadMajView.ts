/**
 * 谱面预览的预取。
 *
 * 打开谱面页时，`MajView` 要等 summary 回来才被渲染，然后才开始下载
 * PixiJS 代码块 → 谱面文本 → 皮肤图集，串起来就是一两秒的空白。
 * 这里在拿到歌曲 id 的当下就把这三样并行取上，和 summary / 侧栏请求重叠。
 *
 * 注意：这是“谱面页”这一层的预取策略（知道接口地址和路由的时机），所以放在
 * components/song 而不是 src/majview —— 引擎本身不依赖应用，任何页面都能直接用它。
 */
import { endpoints } from '@/config/api';
import { loadChartText } from '@/majview/chartCache';

const SKIN_BASE = '/majview/skin/';

/** 皮肤图集只取一次；顺便把每页 webp 解码进图片缓存 */
let skinRequest: Promise<void> | null = null;

function preloadSkin(): Promise<void> {
  skinRequest ??= (async () => {
    try {
      const base = new URL(SKIN_BASE, document.baseURI);
      const response = await fetch(new URL('atlas.json', base));
      if (!response.ok) return;
      const { pages } = await response.json();
      await Promise.all(Array.from({ length: pages }, (_, i) => decodeImage(new URL(`atlas-${i}.webp`, base).href)));
    } catch {
      /* 预取失败不影响正常加载 */
    }
  })();
  return skinRequest;
}

function decodeImage(url: string): Promise<void> {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = image.onerror = () => resolve();
    image.src = url;
  });
}

export function preloadMajView(songId: string) {
  // PixiJS 代码块：import 本身有缓存，MajView 真正的 lazy 加载会直接命中
  void import('./MajView');
  void loadChartText(endpoints.maichart.prefix(songId) + '/chart').catch(() => {});
  void preloadSkin();
}
