/**
 * EventBanner 组件 - 活动横幅展示
 * 迁移自 legacy/src/app/widgets/EventBanner.jsx
 */

import React, { memo, useMemo } from 'react';
import EnhancedDescription from './EnhancedDescription';
import type { EventBannerProps } from '@/types';
import { getCategoryTranslation } from '@/utils/eventsData';

const EventBanner: React.FC<EventBannerProps> = memo(({ event }) => {
  // 使用useMemo缓存计算结果，避免重复计算
  const { timeAgo } = useMemo(() => {
    if (!event) return { categoryTranslation: '', timeAgo: '' };

    // 计算创建时间的"xx天前"格式
    const getTimeAgo = (dateString: string) => {
      const eventDate = new Date(dateString);
      const currentDate = new Date();
      const diffTime = Math.abs(currentDate.getTime() - eventDate.getTime());
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays < 1) {
        return '今天';
      } else if (diffDays === 1) {
        return '1天前';
      } else if (diffDays < 30) {
        return `${diffDays}天前`;
      } else if (diffDays < 365) {
        const months = Math.floor(diffDays / 30);
        return `${months}个月前`;
      } else {
        const years = Math.floor(diffDays / 365);
        return `${years}年前`;
      }
    };

    const createTimeAgo = getTimeAgo(event.createDate);

    return {
      timeAgo: createTimeAgo,
    };
  }, [event]); // 添加 loc 作为依赖，确保语言变化时重新计算

  if (!event) return null;

  return (
    <div className="mx-auto my-4 md:my-6 lg:my-8 px-2 md:px-3 lg:px-4 max-w-[95%] md:max-w-[90%] lg:max-w-[80%]">
      <div className="group rounded-xl md:rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-card-hover">
        {/* 活动背景图片 */}
        <div className="overflow-hidden">
          <img
            className="block w-full aspect-[1279/372] object-cover transition-transform duration-500 group-hover:scale-[1.02]"
            src={event.src}
            alt={event.alt}
            loading="eager"
          />
        </div>

        {/* 信息区 */}
        <div className="p-5 md:p-6 text-left">
          <div className="mb-2 md:mb-3">
            <h2 className="m-0 font-bold text-ink text-xl md:text-2xl leading-tight">
              {event.title}
            </h2>
          </div>
          <EnhancedDescription
            text={event.description}
            className="m-0 mb-3 md:mb-4 text-ink-2 text-sm md:text-base wrap-break-word leading-relaxed"
          />
          <div className="flex flex-wrap items-center gap-2 md:gap-3 text-xs md:text-sm text-ink-3">
            <span className="font-medium text-primary whitespace-nowrap">
              {getCategoryTranslation(event.category)}
            </span>
            <span className="whitespace-nowrap">
              • {timeAgo}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
});

// 设置displayName用于调试
EventBanner.displayName = 'EventBanner';

export default EventBanner;
