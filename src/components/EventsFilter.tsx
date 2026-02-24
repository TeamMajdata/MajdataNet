/**
 * 活动筛选器组件 - 从 legacy/src/app/widgets/EventsFilter.jsx 迁移
 * 使用 TailwindCSS 重现原样式
 */

import { useLoc } from '@/hooks';
import type { EventsFilterProps } from '@/types';
import { getCategoryTranslation } from '@/utils';

const EventsFilter: React.FC<EventsFilterProps> = ({ 
  selectedCategory, 
  onCategoryChange, 
  categories 
}) => {
  const loc = useLoc();

  return (
    <div className="mx-auto my-8 px-4 max-w-(--container-max-width) text-center">
      <div className="drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)] mb-4 font-semibold text-white/90 text-base">
        {loc("FilterEventTypes", "活动类型")}
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        {categories.map((category) => (
          <button
            key={category}
            className={`
              px-4 py-2 rounded-lg text-sm font-medium cursor-pointer
              transition-all duration-300 ease-[cubic-bezier(0.25,0.46,0.45,0.94)]
              backdrop-blur-lg whitespace-nowrap
              ${selectedCategory === category
                ? 'bg-linear-to-br from-blue-500/80 to-blue-700/90 border border-blue-500/60 text-white shadow-[0_4px_16px_rgba(59,130,246,0.4)] -translate-y-0.5 hover:from-blue-500/90 hover:to-blue-700 hover:shadow-[0_6px_20px_rgba(59,130,246,0.5)] hover:-translate-y-1.5'
                : 'bg-[rgb(30,30,35)]/80 border border-white/15 text-white/80 hover:bg-[rgb(40,40,50)]/90 hover:border-white/30 hover:text-white hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(0,0,0,0.3)]'
              }
            `}
            onClick={() => onCategoryChange(category)}
          >
            {getCategoryTranslation(category)}
          </button>
        ))}
      </div>
    </div>
  );
};

export default EventsFilter;
