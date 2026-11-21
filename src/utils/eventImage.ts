import type { SyntheticEvent } from 'react';

/**
 * 活动横幅的展示用缩略图：/events/foo.png → /events/thumb/foo.webp（1280px 宽 WebP）。
 * 原图动辄几 MB，列表和轮播只需要缩略图；缩略图由 scripts/gen-event-thumbs.sh 生成。
 */
export function eventThumbSrc(src: string): string {
  const match = /^\/events\/([^/]+)\.(png|jpe?g|webp)$/i.exec(src);
  return match ? `/events/thumb/${match[1]}.webp` : src;
}

/** 缩略图缺失（新活动还没生成）时退回原图，只退一次 */
export function fallbackToOriginal(original: string) {
  return (event: SyntheticEvent<HTMLImageElement>) => {
    const img = event.currentTarget;
    if (img.dataset.fallback) return;
    img.dataset.fallback = '1';
    img.src = original;
  };
}
