/**
 * EventBanner 组件 - 活动横幅展示
 */

import { useTranslation } from 'react-i18next';
import React, { memo } from 'react';
import EnhancedDescription from './EnhancedDescription';
import type { EventBannerProps } from '@/types';
import { getCategoryTranslation, getTimeAgo } from '@/utils/eventsData';
import { eventThumbSrc, fallbackToOriginal } from '@/utils/eventImage';

const EventBanner: React.FC<EventBannerProps> = memo(({ event, containerClassName }) => {
  // Subscribe to language changes for the shared event text formatters.
  useTranslation();

  if (!event) return null;
  const timeAgo = getTimeAgo(event.createDate);

  return (
    <div className={containerClassName ?? 'mx-auto my-4 md:my-6 lg:my-8 px-2 md:px-3 lg:px-4 max-w-[95%] md:max-w-[90%] lg:max-w-[80%]'}>
      {/* 静态横幅：说明一直显示在底部，没有悬停放大 */}
      <div className="relative bg-[rgb(20,20,25)]/90 shadow-[0_12px_40px_rgba(0,0,0,0.3),0_4px_16px_rgba(0,0,0,0.2)] border border-white/10 rounded-xl md:rounded-2xl overflow-hidden" style={{ aspectRatio: '1279 / 372' }}>
        {/* 活动背景图片 */}
        <img
          className="absolute inset-0 w-full h-full object-cover"
          src={eventThumbSrc(event.src)}
          onError={fallbackToOriginal(event.src)}
          alt={event.alt}
          loading="eager"
        />

        {/* 底部信息遮罩层 - 从50%高度开始 */}
        <div className="top-[50%] right-0 bottom-0 left-0 absolute flex flex-col justify-end p-5 md:p-6" style={{ background: 'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.05) 10%, rgba(0,0,0,0.15) 20%, rgba(0,0,0,0.3) 30%, rgba(0,0,0,0.5) 40%, rgba(0,0,0,0.7) 55%, rgba(0,0,0,0.85) 75%, rgba(0,0,0,0.95) 100%)' }}>
          <div className="text-left">
            <div className="mb-2 md:mb-3">
              <h2 className="m-0 font-bold text-white text-xl md:text-2xl leading-tight" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.7)' }}>
                {event.title}
              </h2>
            </div>
            <EnhancedDescription
              text={event.description}
              className="m-0 mb-3 md:mb-4 text-white/90 text-sm md:text-base wrap-break-word leading-relaxed"
            />
            <div className="flex flex-wrap items-center gap-2 md:gap-3 text-white/80 text-xs md:text-sm" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
              <span className="font-medium whitespace-nowrap">
                {getCategoryTranslation(event.category)}
              </span>
              <span className="whitespace-nowrap">
                • {timeAgo}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

// 设置displayName用于调试
EventBanner.displayName = 'EventBanner';

export default EventBanner;
