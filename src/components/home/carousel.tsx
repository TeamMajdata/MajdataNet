import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { LuChevronLeft, LuChevronRight } from 'react-icons/lu';
import { SECTION_HEADING_CLASS } from '@/components/ui/surface';
import type { Carousel } from './useCarousel';

const CONTROL_CLASS = 'grid place-items-center bg-white/[0.04] hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-lg w-8 h-8 text-white/70 hover:text-white transition-colors cursor-pointer';

/**
 * 展柜标题行：标题和说明在左，右边是翻页按钮。
 * 分页展柜传 carousel，显示页码；横向自由滑动的展柜传 onStep，只有左右按钮（滑动一段）。
 */
export function CarouselHeader({ id, title, hint, carousel, onStep }: {
  id: string;
  title: string;
  hint: ReactNode;
  carousel?: Carousel;
  onStep?: (direction: -1 | 1) => void;
}) {
  const { t } = useTranslation();
  const step = onStep ?? (carousel && carousel.pages > 1 ? (direction: -1 | 1) => carousel.setPage(carousel.page + direction) : undefined);
  return (
    <div className="flex justify-between items-end gap-3 mb-4">
      <div className="min-w-0">
        <h2 id={id} className={`${SECTION_HEADING_CLASS} mb-0! text-lg!`}>{title}</h2>
        <div className="mt-1 text-white/50 text-xs">{hint}</div>
      </div>
      {step && (
        <div className="flex items-center gap-1.5 shrink-0">
          <button type="button" className={CONTROL_CLASS} onClick={() => step(-1)} aria-label={t('home/HomeHighlights.Previous')}>
            <LuChevronLeft aria-hidden="true" className="w-4 h-4" />
          </button>
          {carousel && <span className="min-w-10 text-white/55 text-xs text-center tabular-nums" aria-live="polite">{carousel.page + 1} / {carousel.pages}</span>}
          <button type="button" className={CONTROL_CLASS} onClick={() => step(1)} aria-label={t('home/HomeHighlights.Next')}>
            <LuChevronRight aria-hidden="true" className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
