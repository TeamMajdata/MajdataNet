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
      <div className="mb-4 font-semibold text-ink-2 text-base">
        {loc("FilterEventTypes", "活动类型")}
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        {categories.map((category) => (
          <button
            key={category}
            className={`
              px-4 py-2 rounded-md text-sm font-medium cursor-pointer
              transition-colors duration-200 whitespace-nowrap border
              ${selectedCategory === category
                ? 'bg-primary border-primary text-white'
                : 'bg-surface border-line text-ink-2 hover:text-primary hover:border-primary/40'
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
