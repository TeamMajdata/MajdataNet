/**
 * 活动筛选器组件 - 从 legacy/src/app/widgets/EventsFilter.jsx 迁移
 * 使用 TailwindCSS 重现原样式
 */

import { useTranslation } from 'react-i18next';
import type { EventsFilterProps } from '@/types';
import { getCategoryTranslation } from '@/utils';

const EventsFilter: React.FC<EventsFilterProps> = ({ 
  selectedCategory, 
  onCategoryChange, 
  categories 
}) => {
  const { t } = useTranslation();

  return (
    <div className="max-w-full overflow-x-auto [scrollbar-width:none]">
      <div
        role="tablist"
        aria-label={t("chart-events/EventsFilter.FilterEventTypes")}
        className="inline-flex gap-1 bg-white/[0.04] p-1 border border-white/10 rounded-xl"
      >
        {categories.map((category) => {
          const selected = selectedCategory === category;
          return (
            <button
              key={category}
              type="button"
              role="tab"
              aria-selected={selected}
              className={`px-3.5 rounded-lg h-9 font-medium text-sm whitespace-nowrap transition-colors cursor-pointer ${
                selected ? 'bg-white/10 text-white shadow-[0_1px_0_rgb(255_255_255/8%)_inset]' : 'text-white/55 hover:text-white'
              }`}
              onClick={() => onCategoryChange(category)}
            >
              {getCategoryTranslation(category)}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default EventsFilter;
