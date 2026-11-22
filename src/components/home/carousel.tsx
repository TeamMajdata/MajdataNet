import type { ReactNode } from 'react';
import { SECTION_HEADING_CLASS } from '@/components/ui/surface';

/**
 * 展柜标题行：标题和下面一行说明。横栏都可以直接左右滑（触屏手指、鼠标拖、触控板横滑），不再放翻页按钮。
 */
export function CarouselHeader({ id, title, hint }: {
  id: string;
  title: string;
  hint: ReactNode;
}) {
  return (
    <div className="mb-4 min-w-0">
      <h2 id={id} className={`${SECTION_HEADING_CLASS} mb-0! text-lg!`}>{title}</h2>
      <div className="mt-1 text-white/50 text-xs">{hint}</div>
    </div>
  );
}
