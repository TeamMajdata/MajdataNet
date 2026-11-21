import { useTranslation } from 'react-i18next';
import EmptyState from '@/components/ui/EmptyState';
import SectionLoading from '@/components/ui/SectionLoading';
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
import { LuSearch, LuX } from 'react-icons/lu';
import { buildSuggestions, SEARCH_OPERATORS, type SuggestionKind, type SuggestionSource } from '@/utils/searchSuggestions';
import SortMenu from '@/components/ui/SortMenu';
import SuggestionListbox, { type SuggestionListboxItem } from '@/components/ui/SuggestionListbox';

import { useUserContext } from '@/hooks';
import { useEventClock } from '@/hooks/useEventClock';
import { PageLayout, SongCard, SongList } from '@/components';
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
import RecentUploads from '@/components/home/RecentUploads';
import PopularRanking from '@/components/home/PopularRanking';

export default function HomePage() {
  return (
    <PageLayout>
      {/* Events Carousel */}
      <EventsCarousel />

      {/* 活动下面：最近上传、大家最近都在玩、人气排行 */}
      <div className="mx-auto mt-6 w-full max-w-320 min-w-0">
        <RecentUploads />
        <PopularRanking />
      </div>

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
            // 上下留出空间给卡片阴影（Swiper 会裁掉超出容器的部分），负边距抵消，布局不变
            className="-my-3 py-3 desktop-events-swiper"
          >
            {/* 活跃的活动（进行中 + 即将开始） */}
            {ongoingEvents.map((event) => (
              <SwiperSlide key={event.id} className="flex h-auto">
                <div className="relative flex-1 bg-[rgba(20,20,25,0.9)] shadow-[0_4px_14px_rgb(0_0_0/0.3)] border border-white/10 rounded-xl min-w-0 aspect-1279/372 overflow-hidden">
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
              <div className="flex flex-col flex-[0.5] justify-stretch self-stretch bg-linear-to-br from-[rgba(100,100,120,0.4)] to-[rgba(80,80,100,0.6)] shadow-[0_4px_14px_rgb(0_0_0/0.3)] backdrop-blur-lg border border-white/10 rounded-xl min-w-0 aspect-1279/372 overflow-hidden">
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
            className="-my-3 py-3 overflow-visible mobile-events-swiper"
          >
            {/* 活跃的活动（进行中 + 即将开始） */}
            {ongoingEvents.map((event) => (
              <SwiperSlide key={event.id} className="flex h-auto">
                <Link to={getEventHref(event)} className="block w-full h-full text-inherit no-underline">
                  <div className="relative bg-[rgba(20,20,25,0.9)] shadow-[0_4px_14px_rgb(0_0_0/0.3)] backdrop-blur-xl border border-white/10 rounded-xl w-full aspect-1279/372 overflow-hidden">
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
              <div className="flex flex-col flex-[0.5] justify-stretch self-stretch bg-linear-to-br from-[rgba(100,100,120,0.4)] to-[rgba(80,80,100,0.6)] shadow-[0_4px_14px_rgb(0_0_0/0.3)] backdrop-blur-lg border border-white/10 rounded-xl min-w-0 aspect-1279/372 overflow-hidden">
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
  const items: SuggestionListboxItem[] = trimmedValue
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
          <SuggestionListbox
            id={listboxId}
            label={t("home/HomePage.SearchSuggestions")}
            items={items}
            activeIndex={activeIndex}
            highlight={trimmedValue.replace(/^(uploader|tag):/i, '')}
            onHover={setActiveIndex}
            onPick={pick}
          />
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

// 以前随机推荐把全量谱面缓存在 localStorage，功能已删除，顺手清掉旧数据
try {
  localStorage.removeItem('homeSongListCache');
  localStorage.removeItem('homeSongListCacheExpireTime');
} catch { /* 无痕模式等情况下访问不了，忽略 */ }

const RECOMMEND_PAGE_SIZE = 30;
const RECOMMEND_API_MAX_PAGE = 100; // 与后端 feed 的 page 上限一致
// 每屏合并两页（60 条，4 列不缺卡），最后一屏用到接口第 98、99 页
const RECOMMEND_MAX_PAGE = Math.floor((RECOMMEND_API_MAX_PAGE + 1) / API_PAGES_PER_VIEW) - 1;

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
  // 个人推荐只对登录用户显示；登录状态确认前先按 URL 来，避免已登录用户闪一下全部谱面
  const canRecommend = !!user || isUserLoading;
  const activeTab: HomeTab = canRecommend && searchParams.get('tab') === 'recommend' ? 'recommend' : 'all';
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
    // 翻页后回到列表上方的工具栏（上面还有活动和展柜，不能用固定的高度）
    document.getElementById('home-list-toolbar')?.scrollIntoView({ block: 'start' });
  };

  // 渲染数据
  return (
    <>
      {/* 工具栏：与卡片网格同宽，标签切换 + 搜索 + 排序在一行（移动端分两行） */}
      <div id="home-list-toolbar" className="z-30 relative flex sm:flex-row flex-col sm:items-center gap-2 sm:gap-3 mx-auto mt-3 md:mt-1 mb-4 sm:mb-5 w-full max-w-320 min-w-0 scroll-mt-24">
        {/* 游客只有全部谱面，不显示切换 */}
        {user && (
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
                {tab === 'all' ? t("home/HomePage.AllCharts") : t("home/HomePage.PersonalRecommend")}
              </button>
            ))}
          </div>
        )}
        {activeTab === 'all' && (
          <SearchBar
            onChange={(e) => debounced(e.target.value)}
            initS={search}
            sortType={sortType}
            onSortChange={onSortChange}
          />
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

          <div className="flex justify-center mt-8 sm:mt-10">
            <Pager page={page} hasNext={hasNext} onPageChange={goToPage} />
          </div>
        </>
      ) : (
        <RecommendTab
          page={recommendPage}
          onPageChange={goToPage}
        />
      )}
    </>
  );
}

// 个人推荐只给登录用户；游客或会话失效时外层已经切回全部谱面
function RecommendTab({ page, onPageChange }: {
  page: number;
  onPageChange: (page: number) => void;
}) {
  const { user, isLoading } = useUserContext();

  if (isLoading) {
    return (
      <SectionLoading />
    );
  }

  if (!user) return null;
  return <RecommendFeed userKey={user.id ?? user.username} page={page} onPageChange={onPageChange} />;
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
        // 会话过期：刷新登录状态，页面随之切回全部谱面
        if (err instanceof ApiError && err.status === 401) refetch();
      },
    }
  );

  const hasNext = page < RECOMMEND_MAX_PAGE && data?.length === RECOMMEND_PAGE_SIZE * API_PAGES_PER_VIEW;

  let content: React.ReactNode;
  if (error) {
    content = <EmptyState>{t("home/HomePage.ServerError")}</EmptyState>;
  } else if (isLoading || !data) {
    content = (
      <SectionLoading />
    );
  } else if (data.length === 0) {
    content = (
      <EmptyState>
        {page > 0
          ? t("home/HomePage.RecommendEnd")
          : t("home/HomePage.EmptyData")}
      </EmptyState>
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

      <div className="flex justify-center mt-8 sm:mt-10">
        <Pager page={page} hasNext={hasNext} onPageChange={onPageChange} />
      </div>
    </>
  );
}

