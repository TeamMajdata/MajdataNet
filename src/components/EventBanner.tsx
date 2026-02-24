/**
 * EventBanner 组件 - 活动横幅展示
 * 迁移自 legacy/src/app/widgets/EventBanner.jsx
 */

import React, { memo, useMemo } from 'react';
import { IoChevronUpOutline } from 'react-icons/io5';
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
      <div className="group relative bg-[rgb(20,20,25)]/90 hover:shadow-[0_24px_80px_rgba(0,0,0,0.5),0_8px_32px_rgba(0,0,0,0.3)] border border-white/10 hover:border-white/30 rounded-xl md:rounded-2xl overflow-hidden hover:scale-[1.02] transition-all hover:-translate-y-2 duration-500 ease-out" style={{ aspectRatio: '1279 / 372', boxShadow: '0 12px 40px rgba(0,0,0,0.3), 0 4px 16px rgba(0,0,0,0.2)' }}>
        {/* 活动背景图片 */}
        <img
          className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
          src={event.src}
          alt={event.alt}
          loading="eager"
        />

        {/* 未hover时的提示栏 */}
        <div className="right-0 bottom-0 left-0 absolute flex justify-center items-center opacity-100 group-hover:opacity-0 px-5 md:px-6 py-3 md:py-2 transition-opacity duration-500 ease-out pointer-events-none" style={{ background: 'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.6) 40%, rgba(0,0,0,0.85) 100%)' }}>
          <IoChevronUpOutline className="drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)] font-bold text-white md:text-base text-2xl" />
        </div>

        {/* hover时展开的信息遮罩层 - 从50%高度开始 */}
        <div className="top-[50%] right-0 bottom-0 left-0 absolute flex flex-col justify-end opacity-0 group-hover:opacity-100 p-5 md:p-6 transition-all translate-y-5 group-hover:translate-y-0 duration-500 ease-out" style={{ background: 'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.05) 10%, rgba(0,0,0,0.15) 20%, rgba(0,0,0,0.3) 30%, rgba(0,0,0,0.5) 40%, rgba(0,0,0,0.7) 55%, rgba(0,0,0,0.85) 75%, rgba(0,0,0,0.95) 100%)' }}>
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
