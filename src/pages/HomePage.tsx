import { useTranslation } from 'react-i18next';
import { getLocale, useLanguage } from '@/i18n';
import { getEventHref } from '@/utils/eventLink';
import { eventThumbSrc, fallbackToOriginal } from '@/utils/eventImage';
import React, { useEffect, useState, useMemo, useCallback, useRef, useId } from 'react';
import useSWR from 'swr';
import { motion, AnimatePresence } from 'framer-motion';
import { useDebouncedCallback } from 'use-debounce';
import { Link, useSearchParams } from 'react-router-dom';

import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Pagination } from 'swiper/modules';
import 'swiper/swiper-bundle.css';
import { LuArrowDownUp, LuCheck, LuChevronDown, LuMic, LuMusic, LuPencilLine, LuSearch, LuShuffle, LuSparkles, LuTag, LuUser, LuX } from 'react-icons/lu';
import { buildSuggestions, SEARCH_OPERATORS, type SuggestionKind, type SuggestionSource } from '@/utils/searchSuggestions';
import Dropdown from '@/components/header/Dropdown';

import { useUserContext } from '@/hooks';
import { useEventClock } from '@/hooks/useEventClock';
import { PageLayout, SongCard, SongList, LoadingSpinner } from '@/components';
import { endpoints } from '@/config/api';
import Pager from '@/components/ui/Pager';
import { ImpressionScope } from '@/contexts/ImpressionContext';
import { ApiError, apiFetcher } from '@/utils/apiClient';
import {
  getEventStatusClass,
  getEventStatusText,
  getNonFeaturedEventsCount,
  getActiveEvents,
  getAllEvents,
  getTimeAgo,
  getCategoryTranslation,
} from '@/utils/eventsData';
import type { SearchBarProps, Song } from '@/types';
import { API_PAGES_PER_VIEW, apiPagesForView, SONG_GRID_CLASS } from '@/components/song/songGrid';

// 获取用户时区的次日午夜时间戳 (UTC)
const getNextMidnightTimestamp = (): number => {
  const now = new Date();
  const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const formatter = new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: userTimeZone,
  });

  const parts = formatter.formatToParts(now);
  const dateObj: Record<string, string> = {};
  parts.forEach(({ type, value }) => {
    dateObj[type] = value;
  });

  const userLocalDate = new Date(
    parseInt(dateObj.year),
    parseInt(dateObj.month) - 1,
    parseInt(dateObj.day)
  );

  const tomorrow = new Date(userLocalDate);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const millisUntilMidnight = tomorrow.getTime() - now.getTime() + (now.getTime() - userLocalDate.getTime());
  return now.getTime() + millisUntilMidnight;
};

const cachedSongListFetcher = async (url: string): Promise<Song[]> => {
  const cacheKey = 'homeSongListCache';
  const cacheExpireTimeKey = 'homeSongListCacheExpireTime';

  // 1. 尝试从 localStorage 读取缓存
  try {
    const cachedData = localStorage.getItem(cacheKey);
    const cacheExpireTime = localStorage.getItem(cacheExpireTimeKey);
    const now = Date.now();

    if (cachedData && cacheExpireTime) {
      const expireTimestamp = parseInt(cacheExpireTime);

      if (now < expireTimestamp) {
        const parsed = JSON.parse(cachedData);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    }
  } catch (e) {
    console.error('缓存读取错误:', e)
  }

  // 2. 缓存不存在或已过期，发起请求
  const data = await fetch(url, { mode: 'cors', credentials: 'include' })
    .then((res) => res.json());

  // 3. 请求成功后存入 localStorage，同时存储时间戳和过期时间
  if (Array.isArray(data) && data.length > 0) {
    try {
      const nextMidnightTime = getNextMidnightTimestamp();

      localStorage.setItem(cacheKey, JSON.stringify(data));
      localStorage.setItem(cacheExpireTimeKey, nextMidnightTime.toString());
    } catch (e) {
      console.error('缓存保存错误:', e)
    }
  }

  return data;
};

export default function HomePage() {
  return (
    <PageLayout showBackToHome={false}>
      {/* Events Carousel */}
      <EventsCarousel />

      {/* Main Content */}
      <MainComp />
    </PageLayout>
  );
}

function EventsCarousel() {
  const [isMobile, setIsMobile] = useState(false);

  // 检测是否为移动端
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // 移动端和PC端都使用Swiper
  return isMobile ? <MobileEventsSwiper /> : <DesktopEventsSwiper />;
}

// PC端专用的 Swiper 组件
function DesktopEventsSwiper() {
  const { t } = useTranslation();
  const language = useLanguage();
  useEventClock(getAllEvents());
  const remainingEventsCount = getNonFeaturedEventsCount();

  // 获取所有活跃的活动（进行中 + 即将开始）
  const ongoingEvents = getActiveEvents().map((event) => ({
      ...event,
      timeAgo: getTimeAgo(event.createDate),
      createDateFormatted: new Date(event.createDate).toLocaleDateString(getLocale(language), {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
    }));

  return (
    <section className="mx-auto mt-8 max-w-7xl">
      <div className="w-full">
        <div className="relative w-full">
          <Swiper
            modules={[Pagination, Autoplay]}
            spaceBetween={16}
            slidesPerView={2}
            centeredSlides={false}
            autoplay={{
              delay: 5000,
              disableOnInteraction: false,
            }}
            pagination={{ clickable: true }}
            navigation={false}
            loop={ongoingEvents.length > 2}
            breakpoints={{
              1024: {
                slidesPerView: 2,
                spaceBetween: 16,
              },
              1280: {
                slidesPerView: 2,
                spaceBetween: 20,
              },
              1440: {
                slidesPerView: 2,
                spaceBetween: 24,
              },
            }}
            className="desktop-events-swiper"
          >
            {/* 活跃的活动（进行中 + 即将开始） */}
            {ongoingEvents.map((event) => (
              <SwiperSlide key={event.id} className="flex h-auto">
                <div className="relative flex-1 bg-[rgba(20,20,25,0.9)] shadow-[0_8px_32px_rgba(0,0,0,0.3),0_2px_8px_rgba(0,0,0,0.2)] border border-white/10 rounded-xl min-w-0 aspect-1279/372 overflow-hidden">
                  <Link to={getEventHref(event)} className="block relative w-full h-full text-inherit no-underline">
                    <div className="relative w-full h-full overflow-hidden">
                      <img
                        className="block w-full h-full object-cover"
                        src={eventThumbSrc(event.src)}
                        onError={fallbackToOriginal(event.src)}
                        alt={event.alt}
                        loading="lazy"
                      />
                      {/* 活动信息常驻显示：只在底部加渐变，不压暗整张图 */}
                      <div className="absolute inset-0 flex flex-col justify-end bg-linear-to-b from-transparent via-45% via-black/20 to-black/85 p-4">
                        <div className="text-left">
                          <h3 className="m-0 mb-2 font-bold text-white text-xl leading-tight">{event.title}</h3>
                          <div className="flex flex-wrap items-center gap-2 text-white/90 text-sm">
                            <span className="whitespace-nowrap">
                              {getCategoryTranslation(event.category)}
                            </span>
                            <span className={`font-semibold text-[0.85rem] px-1.5 py-0.5 rounded inline-block ${getEventStatusClass(event) === 'status-upcoming' ? 'text-[#fbbf24] bg-[rgba(251,191,36,0.15)] border border-[rgba(251,191,36,0.3)]' :
                              getEventStatusClass(event) === 'status-ongoing' ? 'text-[#10b981] bg-[rgba(16,185,129,0.15)] border border-[rgba(16,185,129,0.3)]' :
                                'text-[#9ca3af] bg-[rgba(156,163,175,0.15)] border border-[rgba(156,163,175,0.3)]'
                              }`}>
                              • {getEventStatusText(event)}
                            </span>
                            <span
                              className="whitespace-nowrap"
                              title={t("home/HomePage.EventCreatedAt", { date: event.createDateFormatted })}
                            >
                              • {event.timeAgo}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                </div>
              </SwiperSlide>
            ))}

            {/* More 页面作为 Swiper 的最后一页 */}
            <SwiperSlide className="flex h-auto">
              <div className="flex flex-col flex-[0.5] justify-stretch self-stretch bg-linear-to-br from-[rgba(100,100,120,0.4)] to-[rgba(80,80,100,0.6)] shadow-[0_8px_32px_rgba(0,0,0,0.3),0_2px_8px_rgba(0,0,0,0.2)] backdrop-blur-lg border border-white/10 rounded-xl min-w-0 aspect-1279/372 overflow-hidden">
                <Link to="/chart-events" className="block relative w-full h-full text-inherit no-underline">
                  <div className="flex flex-col justify-center items-center h-full text-white/70">
                    <div className="mb-2 text-[2rem]">→</div>
                    <div className="font-semibold text-lg tracking-wider">more</div>
                  </div>
                  <div className="absolute inset-0 flex justify-center items-center bg-black/70 opacity-0 hover:opacity-100 backdrop-blur-lg">
                    <div className="text-white text-center">
                      <span className="block mb-1 font-semibold text-base">{t("home/HomePage.ViewAllEvents")}</span>
                      <span className="text-white/80 text-sm">
                        {t("home/HomePage.EventsCount", { count: remainingEventsCount })}
                      </span>
                    </div>
                  </div>
                </Link>
              </div>
            </SwiperSlide>
          </Swiper>
        </div>
      </div>
    </section>
  );
}

// 移动端专用的 Swiper 组件
function MobileEventsSwiper() {
  const language = useLanguage();
  useEventClock(getAllEvents());
  // 获取所有活跃的活动（进行中 + 即将开始）
  const ongoingEvents = getActiveEvents().map((event) => ({
      ...event,
      timeAgo: getTimeAgo(event.createDate),
      createDateFormatted: new Date(event.createDate).toLocaleDateString(getLocale(language), {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
    }));

  return (
    <section className="mx-auto mt-2 sm:mt-4 max-w-7xl">
      <div className="relative w-full">
        <div className="relative w-full">
          <Swiper
            modules={[Pagination, Autoplay]}
            spaceBetween={12}
            slidesPerView={1}
            centeredSlides={true}
            autoplay={{
              delay: 5000,
              disableOnInteraction: false,
            }}
            pagination={{ clickable: true }}
            navigation={false}
            loop={ongoingEvents.length > 1}
            breakpoints={{
              480: {
                slidesPerView: 1.2,
                spaceBetween: 20,
              },
              600: {
                slidesPerView: 1.5,
                spaceBetween: 24,
              },
              768: {
                slidesPerView: 2,
                spaceBetween: 24,
              },
            }}
            className="overflow-visible mobile-events-swiper"
          >
            {/* 活跃的活动（进行中 + 即将开始） */}
            {ongoingEvents.map((event) => (
              <SwiperSlide key={event.id} className="flex h-auto">
                <Link to={getEventHref(event)} className="block w-full h-full text-inherit no-underline">
                  <div className="relative bg-[rgba(20,20,25,0.9)] shadow-[0_8px_32px_rgba(0,0,0,0.3),0_2px_8px_rgba(0,0,0,0.2)] backdrop-blur-xl border border-white/10 rounded-xl w-full aspect-1279/372 overflow-hidden">
                    <div className="relative w-full h-full overflow-hidden">
                      <img
                        className="w-full h-full object-cover"
                        src={eventThumbSrc(event.src)}
                        onError={fallbackToOriginal(event.src)}
                        alt={event.alt}
                        loading="lazy"
                      />
                    </div>
                  </div>
                </Link>
              </SwiperSlide>
            ))}

            {/* More 页面作为 Swiper 的最后一页 */}
            <SwiperSlide className="flex h-auto">
              <div className="flex flex-col flex-[0.5] justify-stretch self-stretch bg-linear-to-br from-[rgba(100,100,120,0.4)] to-[rgba(80,80,100,0.6)] shadow-[0_8px_32px_rgba(0,0,0,0.3),0_2px_8px_rgba(0,0,0,0.2)] backdrop-blur-lg border border-white/10 rounded-xl min-w-0 aspect-1279/372 overflow-hidden">
                <Link to="/chart-events" className="block relative w-full h-full text-inherit no-underline">
                  <div className="flex flex-col justify-center items-center h-full text-white/70">
                    <div className="text-[2rem] leading-none">→</div>
                    <div className="font-semibold text-lg leading-none tracking-wider">MORE</div>
                  </div>
                </Link>
              </div>
            </SwiperSlide>
          </Swiper>
        </div>
      </div>
    </section>
  );
}

const SUGGESTION_ICONS: Record<SuggestionKind, React.ComponentType<{ className?: string }>> = {
  title: LuMusic,
  artist: LuMic,
  designer: LuPencilLine,
  uploader: LuUser,
  tag: LuTag,
};

/** 判断按键是否发生在可输入的元素里（这时 / 不应抢焦点） */
function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}

function SearchBar({ onChange, initS, sortType, onSortChange }: SearchBarProps) {
  const { t } = useTranslation();
  const [currentValue, setCurrentValue] = useState(initS);
  const [isFocused, setIsFocused] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [suggestQuery, setSuggestQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxId = useId();
  const updateSuggestQuery = useDebouncedCallback((value: string) => setSuggestQuery(value.trim()), 200);

  // 与 SORT_WORDS 一一对应
  const sortOptions = [
    t("home/HomePage.LatestActivityShort"),
    t("home/HomePage.HotShort"),
    t("home/HomePage.ScoreShort"),
    t("home/HomePage.CommentCount"),
    t("home/HomePage.PlayCount"),
    t("home/HomePage.UploadDate"),
  ];

  const kindLabels: Record<SuggestionKind, string> = {
    title: t("home/HomePage.SuggestKindTitle"),
    artist: t("home/HomePage.SuggestKindArtist"),
    designer: t("home/HomePage.SuggestKindDesigner"),
    uploader: t("home/HomePage.SuggestKindUploader"),
    tag: t("home/HomePage.SuggestKindTag"),
  };

  const operatorHints: Record<(typeof SEARCH_OPERATORS)[number], string> = {
    'id:': t("home/HomePage.SearchHintID"),
    'hash:': t("home/HomePage.SearchHintHash"),
    'tag:': t("home/HomePage.SearchHintTag"),
    'uploader:': t("home/HomePage.SearchHintUploader"),
  };

  // 联想复用列表搜索接口：只在聚焦且有输入时请求
  const { data: suggestSource } = useSWR(
    isFocused && suggestQuery ? endpoints.maichart.listSearchAndSort(suggestQuery, '', 0) : null,
    (url: string) => apiFetcher<SuggestionSource[]>(url),
    { keepPreviousData: true, revalidateOnFocus: false },
  );

  const trimmedValue = currentValue.trim();
  const suggestions = useMemo(
    () => (trimmedValue && Array.isArray(suggestSource) ? buildSuggestions(trimmedValue, suggestSource) : []),
    [trimmedValue, suggestSource],
  );
  // 空输入时列出搜索操作符，点击补全前缀
  const items: { key: string; value: string; label: string; hint: string; kind?: SuggestionKind; keepOpen?: boolean }[] = trimmedValue
    ? suggestions.map((item) => ({ key: `${item.kind}:${item.value}`, value: item.value, label: item.label, hint: kindLabels[item.kind], kind: item.kind }))
    : SEARCH_OPERATORS.map((op) => ({ key: op, value: op, label: op, hint: operatorHints[op], keepOpen: true }));
  const isOpen = isFocused && items.length > 0;

  // 更新当前值
  useEffect(() => {
    setCurrentValue(initS);
  }, [initS]);

  // 在页面任意位置按 / 聚焦搜索框（正在输入时除外）
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== '/' || event.ctrlKey || event.metaKey || event.altKey || isTypingTarget(event.target)) return;
      event.preventDefault();
      inputRef.current?.focus();
      inputRef.current?.select();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const setValue = (value: string) => {
    setCurrentValue(value);
    setActiveIndex(-1);
    updateSuggestQuery(value);
    onChange({ target: { value } } as React.ChangeEvent<HTMLInputElement>);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value);
  };

  const handleClearSearch = () => {
    setValue('');
    inputRef.current?.focus();
  };

  const pick = (item: (typeof items)[number]) => {
    setValue(item.value);
    if (item.keepOpen) {
      inputRef.current?.focus();
    } else {
      inputRef.current?.blur();
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      if (isOpen) setIsFocused(false);
      else inputRef.current?.blur();
      return;
    }
    if (!isOpen) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const step = event.key === 'ArrowDown' ? 1 : -1;
      // 循环移动高亮项
      setActiveIndex((index) => (index < 0 && step < 0 ? items.length - 1 : (index + step + items.length) % items.length));
    } else if (event.key === 'Enter' && activeIndex >= 0 && activeIndex < items.length) {
      event.preventDefault();
      pick(items[activeIndex]);
    }
  };

  return (
    <div className="flex flex-1 gap-2 min-w-0">
      <div className="relative flex flex-1 items-center min-w-0">
        <LuSearch aria-hidden="true" className="left-3.5 absolute w-4 h-4 text-white/40 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={isOpen}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={isOpen && activeIndex >= 0 ? `${listboxId}-${activeIndex}` : undefined}
          className="bg-white/[0.04] focus:bg-white/[0.06] pr-18 pl-10 border border-white/10 focus:border-blue-400/60 rounded-xl outline-none focus:ring-2 focus:ring-blue-400/20 w-full h-11 text-white placeholder:text-white/40 text-sm transition-colors"
          placeholder={initS === '' ? t("home/HomePage.SearchPlaceholder") : initS}
          value={currentValue}
          onChange={handleInputChange}
          onFocus={() => { setIsFocused(true); updateSuggestQuery(currentValue); }}
          onBlur={() => { setIsFocused(false); setActiveIndex(-1); }}
          onKeyDown={handleKeyDown}
          aria-label={t("home/HomePage.SearchPlaceholder")}
        />
        {!currentValue && !isFocused && (
          <kbd aria-hidden="true" className="top-1/2 right-3 absolute place-items-center grid bg-white/[0.06] border border-white/15 rounded-md w-6 h-6 font-mono text-white/50 text-xs -translate-y-1/2 pointer-events-none">
            /
          </kbd>
        )}
        <AnimatePresence>
          {currentValue && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.15 }}
              className="top-1/2 right-2 z-2 absolute flex justify-center items-center hover:bg-white/10 border-none rounded-md w-7 h-7 text-white/50 hover:text-white transition-colors -translate-y-1/2 cursor-pointer touch-manipulation"
              onMouseDown={(event) => event.preventDefault()}
              onClick={handleClearSearch}
              aria-label={t("home/HomePage.ClearSearch")}
            >
              <LuX aria-hidden="true" className="w-3.5 h-3.5" />
            </motion.button>
          )}
        </AnimatePresence>

        {isOpen && (
          <ul
            id={listboxId}
            role="listbox"
            aria-label={t("home/HomePage.SearchSuggestions")}
            className="top-[calc(100%+0.5rem)] z-1001 absolute inset-x-0 bg-[rgb(14_16_22)] shadow-[0_20px_60px_rgb(0_0_0/50%)] m-0 p-1.5 border border-white/15 rounded-xl max-h-[min(24rem,60dvh)] overflow-y-auto list-none"
          >
            {items.map((item, index) => {
              const Icon = item.kind ? SUGGESTION_ICONS[item.kind] : LuSearch;
              const active = index === activeIndex;
              return (
                <li
                  key={item.key}
                  id={`${listboxId}-${index}`}
                  role="option"
                  aria-selected={active}
                  className={`flex items-center gap-3 px-3 rounded-lg h-10 text-sm cursor-pointer ${active ? 'bg-white/[0.08] text-white' : 'text-white/80 hover:bg-white/[0.05]'}`}
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => pick(item)}
                >
                  <Icon aria-hidden="true" className="w-4 h-4 text-white/40 shrink-0" />
                  <span className={`truncate ${item.kind ? '' : 'font-mono text-blue-200'}`}>
                    {item.kind ? <HighlightMatch text={item.label} query={trimmedValue.replace(/^(uploader|tag):/i, '')} /> : item.label}
                  </span>
                  <span className="ml-auto pl-2 text-white/35 text-xs truncate shrink-0 max-w-[60%]">{item.hint}</span>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <SortMenu
        options={sortOptions}
        value={sortType}
        onChange={onSortChange}
        label={t("home/HomePage.SortBy")}
      />
    </div>
  );
}

/** 联想词里加粗匹配到的部分 */
function HighlightMatch({ text, query }: { text: string; query: string }) {
  const needle = query.trim().toLowerCase();
  const index = needle ? text.toLowerCase().indexOf(needle) : -1;
  if (index < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, index)}
      <span className="font-semibold text-white">{text.slice(index, index + needle.length)}</span>
      {text.slice(index + needle.length)}
    </>
  );
}

/** 排序下拉菜单：样式与顶栏语言菜单一致，不用原生 select */
function SortMenu({ options, value, onChange, label }: {
  options: string[];
  value: number;
  onChange: (value: number) => void;
  label: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div className="relative shrink-0" ref={containerRef}>
      <button
        type="button"
        className={`flex items-center gap-2 px-3 border rounded-xl h-11 text-white text-sm whitespace-nowrap transition-colors cursor-pointer ${
          isOpen ? 'bg-white/10 border-white/20' : 'bg-white/[0.04] border-white/10 hover:bg-white/[0.07]'
        }`}
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="true"
        aria-expanded={isOpen}
        aria-label={label}
      >
        <LuArrowDownUp aria-hidden="true" className="w-4 h-4 text-white/45" />
        <span>{options[value]}</span>
        <LuChevronDown aria-hidden="true" className={`w-3.5 h-3.5 text-white/45 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      <Dropdown
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        position="right"
        containerRef={containerRef}
        className="p-1.5 min-w-40!"
      >
        <ul className="flex flex-col gap-0.5 m-0 p-0 list-none" role="menu">
          {options.map((option, index) => {
            const selected = index === value;
            return (
              <li key={index} role="none">
                <button
                  type="button"
                  role="menuitemradio"
                  aria-checked={selected}
                  className={`flex justify-between items-center gap-3 px-3 rounded-lg w-full h-10 text-sm text-left transition-colors cursor-pointer ${
                    selected ? 'bg-blue-400/10 text-blue-100' : 'text-white/75 hover:bg-white/[0.06] hover:text-white'
                  }`}
                  onClick={() => {
                    onChange(index);
                    setIsOpen(false);
                  }}
                >
                  {option}
                  {selected && <LuCheck aria-hidden="true" className="w-4 h-4 text-blue-300" />}
                </button>
              </li>
            );
          })}
        </ul>
      </Dropdown>
    </div>
  );
}

const RECOMMEND_PAGE_SIZE = 30;
const RECOMMEND_API_MAX_PAGE = 100; // 与后端 feed 的 page 上限一致
// 每屏合并两页（60 条，4 列不缺卡），最后一屏用到接口第 98、99 页
const RECOMMEND_MAX_PAGE = Math.floor((RECOMMEND_API_MAX_PAGE + 1) / API_PAGES_PER_VIEW) - 1;
// 随机推荐从全量列表里抽：36 条能被 1/2/3/4 列整除
const RANDOM_RECOMMEND_COUNT = 36;

const clampRecommendPage = (page: number) =>
  Number.isInteger(page) ? Math.min(Math.max(page, 0), RECOMMEND_MAX_PAGE) : 0;

// 默认按最近活跃；hotp 为 Reddit 式热门（分数对数 + 上传时间），topp 为赞减踩
const SORT_WORDS = ['', 'hotp', 'topp', 'commp', 'playp', 'timep'];

// URL 里的数字参数：缺省、非法或越界一律视为 0
const parseIndexParam = (value: string | null, max: number) => {
  const parsed = Number(value ?? 0);
  return Number.isInteger(parsed) && parsed >= 0 && parsed <= max ? parsed : 0;
};

type HomeTab = 'all' | 'recommend';

function MainComp() {
  const { t } = useTranslation();
  const { user, isLoading: isUserLoading } = useUserContext();
  const [searchParams, setSearchParams] = useSearchParams();
  // tab、推荐页码、搜索词、排序、页码全部放在 URL 里：链接可分享，浏览器回退即可还原
  const activeTab: HomeTab = searchParams.get('tab') === 'recommend' ? 'recommend' : 'all';
  const recommendPage = clampRecommendPage(Number(searchParams.get('rpage') ?? 0));
  const search = searchParams.get('search') ?? '';
  const sortType = parseIndexParam(searchParams.get('sort'), SORT_WORDS.length - 1);
  const page = parseIndexParam(searchParams.get('page'), Number.MAX_SAFE_INTEGER);

  const navigateHome = useCallback((tab: HomeTab, rpage = 0) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (tab === 'recommend') next.set('tab', tab);
      else next.delete('tab');
      if (tab === 'recommend' && rpage > 0) next.set('rpage', rpage.toString());
      else next.delete('rpage');
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  // 最后一页的信息和它所属的搜索条件绑定，条件一变自然失效
  const listKey = `${search}|${sortType}`;
  const [lastPage, setLastPage] = useState<{ key: string; page: number } | null>(null);
  const hasNext = !(lastPage && lastPage.key === listKey && page >= lastPage.page);
  const [randomSeed, setRandomSeed] = useState(() => Math.floor(Math.random() * 1000000));

  // 更新 URL 参数；值为 null 时删除该参数（默认值不落到 URL 里）
  const updateListParams = useCallback((patch: Record<string, string | null>, replace: boolean) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      for (const [key, value] of Object.entries(patch)) {
        if (value === null) next.delete(key);
        else next.set(key, value);
      }
      return next;
    }, { replace });
  }, [setSearchParams]);

  // 输入搜索词用 replace，避免每敲一次键都往历史栈里压一条记录
  const debounced = useDebouncedCallback((value: string) => {
    updateListParams({ search: value || null, page: null }, true);
  }, 500);

  const onSortChange = (val: number) => {
    updateListParams({ sort: val > 0 ? String(val) : null, page: null }, false);
  };

  const goToPage = (target: number) => {
    if (activeTab === 'recommend') {
      navigateHome('recommend', clampRecommendPage(target));
    } else {
      updateListParams({ page: target > 0 ? String(target) : null }, false);
    }
    window.scrollTo(0, 200);
  };

  const refreshRandomBatch = useCallback(() => {
    setRandomSeed((prev) => prev + 1);
  }, []);

  // 渲染数据
  return (
    <>
      {/* 工具栏：与卡片网格同宽，标签切换 + 搜索 + 排序在一行（移动端分两行） */}
      <div className="z-30 relative flex sm:flex-row flex-col sm:items-center gap-2 sm:gap-3 mx-auto mt-3 md:mt-1 mb-4 sm:mb-5 w-full max-w-350 min-w-0">
        <div className="flex bg-white/[0.04] p-1 border border-white/10 rounded-xl h-11 shrink-0" role="tablist">
          {(['all', 'recommend'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={activeTab === tab}
              className={`flex-1 sm:flex-none px-4 rounded-lg font-medium text-sm whitespace-nowrap transition-colors cursor-pointer ${activeTab === tab ? 'bg-white/10 text-white shadow-[0_1px_0_rgb(255_255_255/8%)_inset]' : 'text-white/55 hover:text-white'}`}
              onClick={() => (tab === 'all' ? navigateHome('all') : navigateHome('recommend', recommendPage))}
            >
              {tab === 'all'
                ? t("home/HomePage.AllCharts")
                : user ? t("home/HomePage.PersonalRecommend") : t("home/HomePage.RandomRecommend")}
            </button>
          ))}
        </div>
        {activeTab === 'all' && (
          <SearchBar
            onChange={(e) => debounced(e.target.value)}
            initS={search}
            sortType={sortType}
            onSortChange={onSortChange}
          />
        )}
        {/* 随机推荐（未登录）：登录提示和换一批放在搜索框原来的位置 */}
        {activeTab === 'recommend' && !user && !isUserLoading && (
          <div className="flex flex-1 justify-between items-center gap-2 min-w-0">
            <Link
              to="/login"
              className="flex items-center gap-2 px-1 min-w-0 text-white/60 hover:text-white text-sm no-underline transition-colors"
            >
              <LuSparkles aria-hidden="true" className="w-4 h-4 text-blue-300 shrink-0" />
              <span className="truncate">{t("home/HomePage.LoginForRecommend")}</span>
            </Link>
            <button
              type="button"
              className="flex items-center gap-2 bg-white/[0.04] hover:bg-white/[0.08] px-3.5 border border-white/10 hover:border-white/20 rounded-xl h-11 font-medium text-white text-sm whitespace-nowrap transition-colors cursor-pointer shrink-0"
              onClick={refreshRandomBatch}
            >
              <LuShuffle aria-hidden="true" className="w-4 h-4 text-white/60" />
              {t("home/HomePage.RefreshBatch")}
            </button>
          </div>
        )}
      </div>

      {activeTab === 'all' ? (
        <>
          <SongList
            url={apiPagesForView(page).map((apiPage) => endpoints.maichart.listSearchAndSort(search, SORT_WORDS[sortType], apiPage))}
            page={page}
            setMax={(last) => setLastPage((prev) => (
              prev && prev.key === listKey && prev.page === last ? prev : { key: listKey, page: last }
            ))}
          />

          <div className="flex flex-col items-center gap-5 sm:gap-6 mx-auto mt-8 sm:mt-12 px-0 sm:px-4 max-w-7xl">
            <Pager page={page} hasNext={hasNext} onPageChange={goToPage} />
            <IntegratedDownloadTypeSelector isMobile={true} />
          </div>
        </>
      ) : (
        <RecommendTab
          page={recommendPage}
          onPageChange={goToPage}
          randomSeed={randomSeed}
        />
      )}
    </>
  );
}

// 登录用户看个人推荐；未登录或会话失效时回落到随机推荐
function RecommendTab({ page, onPageChange, randomSeed }: {
  page: number;
  onPageChange: (page: number) => void;
  randomSeed: number;
}) {
  const { user, isLoading } = useUserContext();

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-20 w-full">
        <LoadingSpinner size="50px" />
      </div>
    );
  }

  if (user) {
    return <RecommendFeed userKey={user.id ?? user.username} page={page} onPageChange={onPageChange} />;
  }

  return (
    <>
      <RandomRecommendList refreshKey={randomSeed} />

      <div className="flex justify-center mt-12 px-4">
        <IntegratedDownloadTypeSelector isMobile={true} />
      </div>
    </>
  );
}

// 后端按用户快照分页，有效期内翻页顺序稳定；返回不足一页即为最后一页
function RecommendFeed({ userKey, page, onPageChange }: {
  userKey: string;
  page: number;
  onPageChange: (page: number) => void;
}) {
  const { t } = useTranslation();
  const { refetch } = useUserContext();

  // key 带上用户，切换账号时不会复用上一个人的推荐
  const { data, error, isLoading } = useSWR<Song[], Error, [string, string]>(
    [apiPagesForView(page).map((apiPage) => endpoints.recommend.feed(apiPage, RECOMMEND_PAGE_SIZE)).join('\n'), userKey],
    async ([urls]) => (await Promise.all(urls.split('\n').map((url) => apiFetcher<Song[]>(url)))).flat(),
    {
      revalidateOnFocus: false,
      onError: (err) => {
        // 会话过期：刷新登录状态，页面随之回落到随机推荐
        if (err instanceof ApiError && err.status === 401) refetch();
      },
    }
  );

  const hasNext = page < RECOMMEND_MAX_PAGE && data?.length === RECOMMEND_PAGE_SIZE * API_PAGES_PER_VIEW;

  let content: React.ReactNode;
  if (error) {
    content = <div className="m-auto w-full text-2xl sm:text-[50px] text-center">{t("home/HomePage.ServerError")}</div>;
  } else if (isLoading || !data) {
    content = (
      <div className="flex justify-center items-center py-20 w-full">
        <LoadingSpinner size="50px" />
      </div>
    );
  } else if (data.length === 0) {
    content = (
      <div className="m-auto w-full text-2xl sm:text-[50px] text-center">
        {page > 0
          ? t("home/HomePage.RecommendEnd")
          : t("home/HomePage.EmptyData")}
      </div>
    );
  } else {
    content = (
      <div className={SONG_GRID_CLASS}>
        {data.map((song, index) => (
          <SongCard key={song.id} song={song} index={index} />
        ))}
      </div>
    );
  }

  return (
    <>
      {/* 作用域跨翻页保留，同一会话内已上报的谱面不再重复计时 */}
      <ImpressionScope source="feed">{content}</ImpressionScope>

      <div className="flex flex-col items-center gap-5 sm:gap-6 mx-auto mt-8 sm:mt-12 px-0 sm:px-4 max-w-7xl">
        <Pager page={page} hasNext={hasNext} onPageChange={onPageChange} />
        <IntegratedDownloadTypeSelector isMobile={true} />
      </div>
    </>
  );
}

function RandomRecommendList({ refreshKey }: { refreshKey: number }) {
  const { t } = useTranslation();

  const { data, error, isLoading } = useSWR<Song[]>(
    endpoints.maichart.list,
    cachedSongListFetcher,
    {
      revalidateOnFocus: false,
    }
  );

  const randomSongs = useMemo(() => {
    if (!data || !Array.isArray(data) || data.length === 0) {
      return [] as Song[];
    }

    const hashWithSeed = (song: Song, seed: number) => {
      const key = `${song.id}|${song.title}|${song.uploader}|${seed}`;
      let hash = 2166136261;
      for (let i = 0; i < key.length; i++) {
        hash ^= key.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
      }
      return hash >>> 0;
    };

    return [...data]
      .sort((a, b) => hashWithSeed(a, refreshKey) - hashWithSeed(b, refreshKey))
      .slice(0, RANDOM_RECOMMEND_COUNT);
  }, [data, refreshKey]);

  if (error) {
    return <div className="m-auto w-full text-2xl sm:text-[50px] text-center">{t("home/HomePage.ServerError")}</div>;
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-20 w-full">
        <LoadingSpinner size="50px" />
      </div>
    );
  }

  if (randomSongs.length === 0) {
    return <div className="m-auto w-full text-2xl sm:text-[50px] text-center">{t("home/HomePage.EmptyData")}</div>;
  }

  return (
    <div className={SONG_GRID_CLASS}>
      {randomSongs.map((song, index) => (
        <SongCard key={song.id} song={song} index={index} />
      ))}
    </div>
  );
}

function IntegratedDownloadTypeSelector({ isMobile }: { isMobile: boolean }) {
  const { t } = useTranslation();
  const [currentType, setCurrentType] = useState(() => {
    return localStorage.getItem('DownloadType') || 'zip';
  });
  const [justChanged, setJustChanged] = useState(false);

  const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newtype = e.target.value;
    if (newtype === 'placeholder') return;
    localStorage.setItem('DownloadType', newtype);
    setCurrentType(newtype);

    setJustChanged(true);
    setTimeout(() => setJustChanged(false), 2000);
  };

  return (
    <div className="flex items-center gap-3">
      {!isMobile && (
        <label className={`${justChanged ? 'text-[#22c55e]' : ''}`}>
          {t("home/HomePage.DownloadFormat")}
          {justChanged && <span className="ml-2 font-semibold text-[#22c55e] text-sm">✓</span>}
        </label>
      )}
      <select
        value={isMobile ? currentType || 'placeholder' : currentType}
        onChange={handleChange}
        className="bg-[rgba(20,20,25,0.8)] backdrop-blur-xl backdrop-saturate-150 px-3 py-1 border border-white/20 rounded-full outline-none w-full md:w-auto min-w-0 md:min-w-20 h-10 md:h-11.25 overflow-hidden text-white text-xs sm:text-sm text-center whitespace-nowrap appearance-none cursor-pointer"
        data-mobile-label={t("home/HomePage.DownloadFormat")}
      >
        {isMobile && (
          <option value="placeholder" disabled>
            {t("home/HomePage.DownloadFormat")}
            {justChanged && ' ✓'}
          </option>
        )}
        <option value="zip">ZIP</option>
        <option value="adx">ADX</option>
      </select>
    </div>
  );
}
