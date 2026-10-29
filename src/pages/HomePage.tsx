import { getEventHref } from '@/utils/eventLink';
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import useSWR from 'swr';
import { motion, AnimatePresence } from 'framer-motion';
import { Tooltip } from '@/components';
import { useDebouncedCallback } from 'use-debounce';
import { Link, useSearchParams } from 'react-router-dom';

import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Pagination } from 'swiper/modules';
import 'swiper/swiper-bundle.css';

import { useI18n, useUserContext } from '@/hooks';
import { useEventClock } from '@/hooks/useEventClock';
import { PageLayout, SongCard, SongList, LoadingSpinner } from '@/components';
import { endpoints } from '@/config/api';
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
  const { isReady } = useI18n();

  if (!isReady) return <div className="flex justify-center items-center h-screen"><LoadingSpinner size="50px" /></div>;

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

function getDateLocale(lang: string) {
  const localeMap: Record<string, string> = {
    zh: 'zh-CN',
    en: 'en-US',
    ja: 'ja-JP',
    ko: 'ko-KR',
  };
  return localeMap[lang] || 'zh-CN';
};

// PC端专用的 Swiper 组件
function DesktopEventsSwiper() {
  const { i18n, language } = useI18n();
  useEventClock(getAllEvents());
  const remainingEventsCount = getNonFeaturedEventsCount();

  // 获取所有活跃的活动（进行中 + 即将开始）
  const ongoingEvents = getActiveEvents().map((event) => ({
      ...event,
      timeAgo: getTimeAgo(event.createDate),
      createDateFormatted: new Date(event.createDate).toLocaleDateString(getDateLocale(language), {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
    }));

  return (
    <section className="mx-auto mt-8 px-4 max-w-7xl">
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
            pagination={{
              clickable: true,
              dynamicBullets: true,
            }}
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
            className="pb-12 desktop-events-swiper"
          >
            {/* 活跃的活动（进行中 + 即将开始） */}
            {ongoingEvents.map((event) => (
              <SwiperSlide key={event.id} className="flex h-auto">
                <div className="relative flex-1 bg-[rgba(20,20,25,0.9)] shadow-[0_8px_32px_rgba(0,0,0,0.3),0_2px_8px_rgba(0,0,0,0.2)] border border-white/10 rounded-xl min-w-0 aspect-1279/372 overflow-hidden">
                  <Link to={getEventHref(event)} className="block relative w-full h-full text-inherit no-underline">
                    <div className="relative w-full h-full overflow-hidden">
                      <img
                        className="block w-full h-full object-cover"
                        src={event.src}
                        alt={event.alt}
                        loading="lazy"
                      />
                      <div className="absolute inset-0 flex flex-col justify-end bg-linear-to-b from-black/50 via-30% via-black/30 to-black/90 opacity-0 hover:opacity-100 p-4">
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
                              title={`${i18n("home/HomePage.EventCreatedPrefix", '创建于')} ${event.createDateFormatted}`}
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
                      <span className="block mb-1 font-semibold text-base">{i18n("home/HomePage.ViewAllEvents", '查看所有活动')}</span>
                      <span className="text-white/80 text-sm">
                        +{remainingEventsCount} {i18n("home/HomePage.EventsCount", '个活动')}
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
  const { language } = useI18n();
  useEventClock(getAllEvents());
  // 获取所有活跃的活动（进行中 + 即将开始）
  const ongoingEvents = getActiveEvents().map((event) => ({
      ...event,
      timeAgo: getTimeAgo(event.createDate),
      createDateFormatted: new Date(event.createDate).toLocaleDateString(getDateLocale(language), {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
    }));

  return (
    <section className="mx-auto mt-2 sm:mt-4 px-0 sm:px-4 max-w-7xl">
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
            pagination={{
              clickable: true,
              dynamicBullets: true,
            }}
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
            className="pb-9 sm:pb-12 overflow-visible mobile-events-swiper"
          >
            {/* 活跃的活动（进行中 + 即将开始） */}
            {ongoingEvents.map((event) => (
              <SwiperSlide key={event.id} className="flex h-auto">
                <Link to={getEventHref(event)} className="block w-full h-full text-inherit no-underline">
                  <div className="relative bg-[rgba(20,20,25,0.9)] shadow-[0_8px_32px_rgba(0,0,0,0.3),0_2px_8px_rgba(0,0,0,0.2)] backdrop-blur-xl border border-white/10 rounded-xl w-full aspect-1279/372 overflow-hidden">
                    <div className="relative w-full h-full overflow-hidden">
                      <img
                        className="w-full h-full object-cover"
                        src={event.src}
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

function SearchBar({ onChange, initS, sortType, onSortChange }: SearchBarProps) {
  const { i18n } = useI18n();
  const [isMobile, setIsMobile] = useState(false);
  const [currentValue, setCurrentValue] = useState(initS);


  const sortOptions = [
    i18n("home/HomePage.LatestActivityShort", '互'),
    i18n("home/HomePage.LikeCount", '点赞数'),
    i18n("home/HomePage.CommentCount", '评论数'),
    i18n("home/HomePage.PlayCount", '播放数'),
    i18n("home/HomePage.UploadDate", '上传日期'),
  ];

  // 检测是否为移动端
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // 更新当前值
  useEffect(() => {
    setCurrentValue(initS);
  }, [initS]);



  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setCurrentValue(value);
    onChange(e);
  };

  const handleClearSearch = () => {
    setCurrentValue('');
    const fakeEvent = { target: { value: '' } } as React.ChangeEvent<HTMLInputElement>;
    onChange(fakeEvent);
  };

  // 提示内容组件
  const hintContent = (
    <div className="bg-linear-to-br from-[rgba(30,30,40,0.98)] to-[rgba(20,20,30,0.98)] shadow-[0_12px_40px_rgba(0,0,0,0.5),0_4px_12px_rgba(0,0,0,0.3)] backdrop-blur-[20px] backdrop-saturate-150 px-4 sm:px-5 py-4 border border-white/20 rounded-2xl w-[min(17.5rem,calc(100vw-1.5rem))] md:w-[320px]">
      <div className="space-y-2.5 text-left">
        <p className="m-0 text-[0.85rem] text-white/90 md:text-[0.9rem] leading-normal">{i18n("home/HomePage.SearchHintID", '按 ID 搜索')}</p>
        <p className="m-0 text-[0.85rem] text-white/90 md:text-[0.9rem] leading-normal">{i18n("home/HomePage.SearchHintHash", '按 Hash 搜索')}</p>
        <p className="m-0 text-[0.85rem] text-white/90 md:text-[0.9rem] leading-normal">{i18n("home/HomePage.SearchHintTag", '按标签搜索')}</p>
        <p className="m-0 text-[0.85rem] text-white/90 md:text-[0.9rem] leading-normal">{i18n("home/HomePage.SearchHintUploader", '按上传者搜索')}</p>
      </div>
    </div>
  );

  return (
    <div className="mt-3 md:mt-0 mb-4 px-0 sm:px-4 w-full min-w-0">
      <div className="relative border border-white/10 rounded-[20px] overflow-visible">
        <div className="flex flex-row justify-center items-center gap-2 md:gap-6 p-2 sm:p-3 md:p-4 w-full min-w-0">
          <div className="flex-1 min-w-0">
            <div className="relative flex items-center w-full">
              <input
                type="text"
                className="bg-[rgba(20,20,25,0.8)] backdrop-blur-[15px] backdrop-saturate-150 px-4 md:px-7 py-3 md:py-4 pr-18 md:pr-14 border-2 border-white/15 focus:border-blue-500/50 rounded-[30px] outline-none w-full h-11 text-white placeholder:text-white/40 text-base transition-colors"
                placeholder={initS === '' ? i18n("home/HomePage.SearchPlaceholder", '搜索...') : initS}
                value={currentValue}
                onChange={handleInputChange}
                aria-label={i18n("home/HomePage.SearchPlaceholder", '搜索...')}
              />
              <AnimatePresence>
                {currentValue && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.15 }}
                    className="top-1/2 right-10 z-2 absolute flex justify-center items-center bg-white/10 hover:bg-white/20 border-none rounded-full w-7 h-7 text-white/60 hover:text-white text-xs leading-none transition-colors -translate-y-1/2 cursor-pointer touch-manipulation"
                    onClick={handleClearSearch}
                    aria-label={i18n("home/HomePage.ClearSearch", '清空搜索')}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 6 6 18" /><path d="m6 6 12 12" />
                    </svg>
                  </motion.button>
                )}
              </AnimatePresence>
              <Tooltip
                content={hintContent}
                side="top"
                sideOffset={20}
                plain={true}
              >
                <div
                  className="top-1/2 right-2 z-10 absolute flex justify-center items-center bg-white/5 hover:bg-white/15 active:bg-white/20 shadow-[0_2px_8px_rgba(0,0,0,0.2)] border border-white/25 hover:border-white/40 rounded-full w-7 h-7 font-bold text-xs text-white/60 hover:text-white leading-none transition-all -translate-y-1/2 duration-200 cursor-pointer touch-manipulation"
                  role="button"
                  aria-label='Search Hint Button'
                >
                  ?
                </div>
              </Tooltip>
            </div>
          </div>

          <div className="shrink-0">
            <select
              value={isMobile ? (sortType === undefined ? 'placeholder' : sortType) : sortType}
              onChange={(e) => {
                if (e.target.value === 'placeholder') return;
                const val = parseInt(e.target.value);
                onSortChange(val);
              }}
              className="bg-[rgba(20,20,25,0.8)] backdrop-blur-xl backdrop-saturate-150 px-2 md:px-3 py-1 border border-white/20 rounded-full outline-none w-28 sm:w-auto min-w-0 md:min-w-20 h-11 md:h-11.25 overflow-hidden text-white text-center whitespace-nowrap appearance-none cursor-pointer"
              data-mobile-label={i18n("home/HomePage.SortBy", '排序方式')}
            >
              {isMobile && (
                <option value="placeholder" disabled>
                  {i18n("home/HomePage.SortBy", '排序方式')}
                </option>
              )}
              {sortOptions.map((label, i) => (
                <option key={i} value={i}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}

const RECOMMEND_PAGE_SIZE = 30;
const RECOMMEND_MAX_PAGE = 100; // 与后端 feed 的 page 上限一致

const clampRecommendPage = (page: number) =>
  Number.isInteger(page) ? Math.min(Math.max(page, 0), RECOMMEND_MAX_PAGE) : 0;

const SORT_WORDS = ['', 'likep', 'commp', 'playp', 'timep'];

// URL 里的数字参数：缺省、非法或越界一律视为 0
const parseIndexParam = (value: string | null, max: number) => {
  const parsed = Number(value ?? 0);
  return Number.isInteger(parsed) && parsed >= 0 && parsed <= max ? parsed : 0;
};

type HomeTab = 'all' | 'recommend';

function MainComp() {
  const { i18n } = useI18n();
  const { user } = useUserContext();
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

  const setPage = (target: number) => {
    updateListParams({ page: target > 0 ? String(target) : null }, false);
  };

  const refreshRandomBatch = useCallback(() => {
    setRandomSeed((prev) => prev + 1);
  }, []);

  // 渲染数据
  return (
    <>
      <div className="flex justify-center px-4 pt-2 pb-3">
        <div className="inline-flex bg-[rgba(20,20,25,0.7)] p-1 border border-white/10 rounded-full">
          <button
            className={`px-4 md:px-5 py-2 rounded-full text-sm md:text-base transition-colors cursor-pointer ${activeTab === 'all' ? 'bg-blue-500/80 text-white' : 'text-white/80 hover:text-white'
              }`}
            onClick={() => navigateHome('all')}
          >
            {i18n("home/HomePage.AllCharts", '全部谱面')}
          </button>
          <button
            className={`px-4 md:px-5 py-2 rounded-full text-sm md:text-base transition-colors cursor-pointer ${activeTab === 'recommend' ? 'bg-blue-500/80 text-white' : 'text-white/80 hover:text-white'
              }`}
            onClick={() => navigateHome('recommend', recommendPage)}
          >
            {user
              ? i18n("home/HomePage.PersonalRecommend", '个人推荐')
              : i18n("home/HomePage.RandomRecommend", '随机推荐')}
          </button>
        </div>
      </div>

      {activeTab === 'all' ? (
        <>
          <SearchBar
            onChange={(e) => debounced(e.target.value)}
            initS={search}
            sortType={sortType}
            onSortChange={onSortChange}
          />

          <SongList
            url={endpoints.maichart.listSearchAndSort(search, SORT_WORDS[sortType], page)}
            page={page}
            setMax={(last) => setLastPage((prev) => (
              prev && prev.key === listKey && prev.page === last ? prev : { key: listKey, page: last }
            ))}
          />

          <div className="flex flex-col items-center gap-5 sm:gap-6 mx-auto mt-8 sm:mt-12 px-0 sm:px-4 max-w-7xl">
            <Pager page={page} hasNext={hasNext} onPageChange={setPage} />
            <IntegratedDownloadTypeSelector isMobile={true} />
          </div>
        </>
      ) : (
        <RecommendTab
          page={recommendPage}
          onPageChange={(target) => navigateHome('recommend', clampRecommendPage(target))}
          randomSeed={randomSeed}
          onRefreshRandom={refreshRandomBatch}
        />
      )}
    </>
  );
}

function Pager({ page, hasNext, onPageChange }: {
  page: number;
  hasNext: boolean;
  onPageChange: (page: number) => void;
}) {
  const { i18n } = useI18n();

  const goTo = (target: number) => {
    onPageChange(target);
    window.scrollTo(0, 200);
  };

  return (
    <>
      <div className="gap-2 sm:gap-4 grid grid-cols-[2.75rem_minmax(0,1fr)_2.75rem] sm:flex items-center bg-[rgba(20,20,25,0.9)] shadow-[0_8px_32px_rgba(0,0,0,0.3),0_2px_8px_rgba(0,0,0,0.2)] backdrop-blur-xl p-2.5 sm:p-6 border border-white/10 rounded-xl w-full sm:w-auto max-w-md">
        <button
          className={`flex justify-center items-center bg-blue-500/80 px-0 sm:px-6 py-3 border-none rounded-lg min-w-11 sm:min-w-20 min-h-11 font-medium text-white cursor-pointer ${page - 1 < 0 ? 'bg-gray-500/50 cursor-not-allowed opacity-60' : ''}`}
          disabled={page - 1 < 0}
          onClick={() => goTo(page - 1)}
        >
          ←
        </button>

        <div className="flex justify-center items-center gap-1.5 sm:gap-2 min-w-0">
          <span className="text-[#ccc] text-sm">{i18n("home/HomePage.PageOf", '第')}</span>
          <input
            type="number"
            value={page}
            className="bg-black/70 focus:shadow-[0_0_8px_rgba(59,130,246,0.3)] p-2 border border-white/20 focus:border-blue-500 rounded-md focus:outline-none w-15 font-medium text-white text-center"
            onChange={(event) => {
              if (event.target.value !== '') {
                onPageChange(parseInt(event.target.value));
              } else onPageChange(0);
            }}
            min="0"
            step="1"
          />
          <span className="text-[#ccc] text-sm">{i18n("home/HomePage.Page", '页')}</span>
        </div>

        <button
          className={`flex justify-center items-center bg-blue-500/80 px-0 sm:px-6 py-3 border-none rounded-lg min-w-11 sm:min-w-20 min-h-11 font-medium text-white cursor-pointer ${!hasNext ? 'bg-gray-500/50 cursor-not-allowed opacity-60' : ''}`}
          disabled={!hasNext}
          onClick={() => goTo(page + 1)}
        >
          →
        </button>
      </div>

      <button
        className="bg-white/10 px-6 py-2 border border-white/20 rounded-lg text-white cursor-pointer"
        onClick={() => goTo(0)}
      >
        {i18n("home/HomePage.FrontPage", '首页')}
      </button>
    </>
  );
}

// 登录用户看个人推荐；未登录或会话失效时回落到随机推荐
function RecommendTab({ page, onPageChange, randomSeed, onRefreshRandom }: {
  page: number;
  onPageChange: (page: number) => void;
  randomSeed: number;
  onRefreshRandom: () => void;
}) {
  const { i18n } = useI18n();
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
      <div className="flex flex-col items-center gap-4 mx-auto mb-6 px-4 max-w-7xl">
        <Link to="/login" className="text-white/70 hover:text-white text-sm hover:underline underline-offset-4">
          {i18n("home/HomePage.LoginForRecommend", '登录后即可获得个人推荐')}
        </Link>
        <button
          className="bg-blue-500/80 hover:bg-blue-500 px-6 py-2 border-none rounded-lg font-medium text-white cursor-pointer"
          onClick={onRefreshRandom}
        >
          {i18n("home/HomePage.RefreshBatch", '换一批')}
        </button>
      </div>

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
  const { i18n } = useI18n();
  const { refetch } = useUserContext();

  // key 带上用户，切换账号时不会复用上一个人的推荐
  const { data, error, isLoading } = useSWR<Song[], Error, [string, string]>(
    [endpoints.recommend.feed(page, RECOMMEND_PAGE_SIZE), userKey],
    ([url]) => apiFetcher<Song[]>(url),
    {
      revalidateOnFocus: false,
      onError: (err) => {
        // 会话过期：刷新登录状态，页面随之回落到随机推荐
        if (err instanceof ApiError && err.status === 401) refetch();
      },
    }
  );

  const hasNext = page < RECOMMEND_MAX_PAGE && data?.length === RECOMMEND_PAGE_SIZE;

  let content: React.ReactNode;
  if (error) {
    content = <div className="m-auto w-full text-2xl sm:text-[50px] text-center">{i18n("home/HomePage.ServerError", '服务器错误')}</div>;
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
          ? i18n("home/HomePage.RecommendEnd", '没有更多推荐了')
          : i18n("home/HomePage.EmptyData", '暂无数据')}
      </div>
    );
  } else {
    content = (
      <div className="justify-center gap-3 sm:gap-[0.6rem] grid grid-cols-[minmax(0,20.6rem)] sm:grid-cols-[repeat(auto-fit,minmax(20rem,20.6rem))] mx-auto p-0 sm:p-2 w-full max-w-350 min-w-0">
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
  const { i18n } = useI18n();

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
      .slice(0, 30);
  }, [data, refreshKey]);

  if (error) {
    return <div className="m-auto w-full text-2xl sm:text-[50px] text-center">{i18n("home/HomePage.ServerError", '服务器错误')}</div>;
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-20 w-full">
        <LoadingSpinner size="50px" />
      </div>
    );
  }

  if (randomSongs.length === 0) {
    return <div className="m-auto w-full text-2xl sm:text-[50px] text-center">{i18n("home/HomePage.EmptyData", '暂无数据')}</div>;
  }

  return (
    <div className="justify-center gap-3 sm:gap-[0.6rem] grid grid-cols-[minmax(0,20.6rem)] sm:grid-cols-[repeat(auto-fit,minmax(20rem,20.6rem))] mx-auto p-0 sm:p-2 w-full max-w-350 min-w-0">
      {randomSongs.map((song, index) => (
        <SongCard key={song.id} song={song} index={index} />
      ))}
    </div>
  );
}

function IntegratedDownloadTypeSelector({ isMobile }: { isMobile: boolean }) {
  const { i18n } = useI18n();
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
          {i18n("home/HomePage.DownloadFormat", '下载格式')}
          {justChanged && <span className="ml-2 font-semibold text-[#22c55e] text-sm">✓</span>}
        </label>
      )}
      <select
        value={isMobile ? currentType || 'placeholder' : currentType}
        onChange={handleChange}
        className="bg-[rgba(20,20,25,0.8)] backdrop-blur-xl backdrop-saturate-150 px-3 py-1 border border-white/20 rounded-full outline-none w-full md:w-auto min-w-0 md:min-w-20 h-10 md:h-11.25 overflow-hidden text-white text-xs sm:text-sm text-center whitespace-nowrap appearance-none cursor-pointer"
        data-mobile-label={i18n("home/HomePage.DownloadFormat", '下载格式')}
      >
        {isMobile && (
          <option value="placeholder" disabled>
            {i18n("home/HomePage.DownloadFormat", '下载格式')}
            {justChanged && ' ✓'}
          </option>
        )}
        <option value="zip">ZIP</option>
        <option value="adx">ADX</option>
      </select>
    </div>
  );
}
