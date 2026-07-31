import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import useSWR from 'swr';
import { motion, AnimatePresence } from 'framer-motion';
import { Tooltip } from '@/components';
import { useDebouncedCallback } from 'use-debounce';
import { Link, useSearchParams } from 'react-router-dom';

import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Pagination } from 'swiper/modules';
import 'swiper/swiper-bundle.css';

import { setLanguage } from '@/utils/i18n';
import { useLoc } from '@/hooks';
import { PageLayout, SongCard, SongList, LoadingSpinner } from '@/components';
import { endpoints } from '@/config/api';
import {
  getEventStatusClass,
  getEventStatusText,
  getNonFeaturedEventsCount,
  getActiveEvents,
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
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setLanguage(localStorage.getItem('language') || navigator.language).then(() => {
      setReady(true);
    });
  }, []);

  if (!ready) return <div className="flex justify-center items-center h-screen"><LoadingSpinner size="50px" /></div>;

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

function getDateLocale() {
  const lang = localStorage.getItem('language') || 'zh';
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
  const loc = useLoc();
  const remainingEventsCount = getNonFeaturedEventsCount();

  // 获取所有活跃的活动（进行中 + 即将开始）
  const ongoingEvents = useMemo(() => {
    return getActiveEvents().map((event) => ({
      ...event,
      timeAgo: getTimeAgo(event.createDate),
      createDateFormatted: new Date(event.createDate).toLocaleDateString(getDateLocale(), {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
    }));
  }, []);

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
                  <Link to={event.href} className="block relative w-full h-full text-inherit no-underline">
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
                              title={`${loc('EventCreatedPrefix', '创建于')} ${event.createDateFormatted}`}
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
                      <span className="block mb-1 font-semibold text-base">{loc('ViewAllEvents', '查看所有活动')}</span>
                      <span className="text-white/80 text-sm">
                        +{remainingEventsCount} {loc('EventsCount', '个活动')}
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
  // 获取所有活跃的活动（进行中 + 即将开始）
  const ongoingEvents = useMemo(() => {
    return getActiveEvents().map((event) => ({
      ...event,
      timeAgo: getTimeAgo(event.createDate),
      createDateFormatted: new Date(event.createDate).toLocaleDateString(getDateLocale(), {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
    }));
  }, []);

  return (
    <section className="mx-auto mt-4 px-4 max-w-7xl">
      <div className="relative w-full">
        <div className="relative w-full">
          <Swiper
            modules={[Pagination, Autoplay]}
            spaceBetween={16}
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
            className="pb-12 overflow-visible mobile-events-swiper"
          >
            {/* 活跃的活动（进行中 + 即将开始） */}
            {ongoingEvents.map((event) => (
              <SwiperSlide key={event.id} className="flex h-auto">
                <Link to={event.href} className="block w-full h-full text-inherit no-underline">
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
  const loc = useLoc();
  const [isMobile, setIsMobile] = useState(false);
  const [currentValue, setCurrentValue] = useState(initS);


  const sortOptions = [
    loc('LatestActivityShort', '互'),
    loc('LikeCount', '点赞数'),
    loc('CommentCount', '评论数'),
    loc('PlayCount', '播放数'),
    loc('UploadDate', '上传日期'),
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
    <div className="bg-linear-to-br from-[rgba(30,30,40,0.98)] to-[rgba(20,20,30,0.98)] shadow-[0_12px_40px_rgba(0,0,0,0.5),0_4px_12px_rgba(0,0,0,0.3)] backdrop-blur-[20px] backdrop-saturate-150 px-5 py-4 border border-white/20 rounded-2xl w-70 md:w-[320px]">
      <div className="space-y-2.5 text-left">
        <p className="m-0 text-[0.85rem] text-white/90 md:text-[0.9rem] leading-normal">{loc('SearchHintID', '按 ID 搜索')}</p>
        <p className="m-0 text-[0.85rem] text-white/90 md:text-[0.9rem] leading-normal">{loc('SearchHintHash', '按 Hash 搜索')}</p>
        <p className="m-0 text-[0.85rem] text-white/90 md:text-[0.9rem] leading-normal">{loc('SearchHintTag', '按标签搜索')}</p>
        <p className="m-0 text-[0.85rem] text-white/90 md:text-[0.9rem] leading-normal">{loc('SearchHintUploader', '按上传者搜索')}</p>
      </div>
    </div>
  );

  return (
    <div className="mt-4 md:mt-0 mb-4 md:mb-4 px-4 md:px-4 w-full">
      <div className="relative border border-white/10 rounded-[20px] overflow-visible">
        <div className="flex flex-row justify-center items-center gap-2 md:gap-6 p-3 md:p-4 w-full">
          <div className="flex-1 min-w-0">
            <div className="relative flex items-center w-full">
              <input
                type="text"
                className="bg-[rgba(20,20,25,0.8)] backdrop-blur-[15px] backdrop-saturate-150 px-6 md:px-7 py-3 md:py-4 pr-10 md:pr-14 border-2 border-white/15 focus:border-blue-500/50 rounded-[30px] outline-none w-full h-11 text-white placeholder:text-white/40 text-sm md:text-base transition-colors"
                placeholder={initS === '' ? loc('SearchPlaceholder', '搜索...') : initS}
                value={currentValue}
                onChange={handleInputChange}
                aria-label={loc('SearchPlaceholder', '搜索...')}
              />
              <AnimatePresence>
                {currentValue && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.15 }}
                    className="top-1/2 right-10 z-2 absolute flex justify-center items-center bg-white/10 hover:bg-white/20 border-none rounded-full w-5 h-5 text-white/60 hover:text-white text-xs leading-none transition-colors -translate-y-1/2 cursor-pointer"
                    onClick={handleClearSearch}
                    aria-label={loc('ClearSearch', '清空搜索')}
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
                  className="top-1/2 right-3 z-10 absolute flex justify-center items-center bg-white/5 hover:bg-white/15 active:bg-white/20 shadow-[0_2px_8px_rgba(0,0,0,0.2)] border border-white/25 hover:border-white/40 rounded-full w-5 h-5 font-bold text-[10px] text-white/60 hover:text-white leading-none transition-all -translate-y-1/2 duration-200 cursor-pointer"
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
              className="bg-[rgba(20,20,25,0.8)] backdrop-blur-xl backdrop-saturate-150 px-2 md:px-3 py-1 border border-white/20 rounded-full outline-none w-auto min-w-16 md:min-w-20 h-10 md:h-11.25 overflow-hidden text-white text-xs sm:text-sm text-center whitespace-nowrap appearance-none cursor-pointer"
              data-mobile-label={loc('SortBy', '排序方式')}
            >
              {isMobile && (
                <option value="placeholder" disabled>
                  {loc('SortBy', '排序方式')}
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

function MainComp() {
  const loc = useLoc();
  const [searchParams] = useSearchParams();
  const isInitialMount = useRef(true);
  const [activeTab, setActiveTab] = useState<'all' | 'random'>('all');

  // 从 localStorage 或 URL 参数初始化状态
  const [Search, setSearch] = useState(() => {
    const urlSearchParam = searchParams.get('search');
    const initialValue = urlSearchParam || localStorage.getItem('search') || '';
    // 保存URL参数到localStorage
    if (urlSearchParam) {
      localStorage.setItem('search', urlSearchParam);
    }
    return initialValue;
  });
  const [page, setPage] = useState(() => {
    const stored = localStorage.getItem('lastclickpage');
    return parseInt(stored || '0');
  });
  const [maxpage, setMaxpage] = useState(999999);
  const [sortType, setSortType] = useState(() => {
    const stored = localStorage.getItem('sort');
    return stored ? parseInt(stored) : 0;
  });
  const [randomSeed, setRandomSeed] = useState(() => Math.floor(Math.random() * 1000000));

  // 处理 URL 参数变化（跳过初始挂载）
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    const urlSearchParam = searchParams.get('search');
    if (urlSearchParam) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSearch(urlSearchParam);
      localStorage.setItem('search', urlSearchParam);
    }
  }, [searchParams]);

  const debounced = useDebouncedCallback(
    // function
    (value: string) => {
      setSearch(value);
      setPage(0);
      setMaxpage(9999999999999);
      localStorage.setItem('search', value);
      localStorage.setItem('lastclickpage', '0');
    },
    // delay in ms
    500
  );

  const onSortChange = (val: number) => {
    setSortType(val);
    localStorage.setItem('sort', val.toString());
    setPage(0);
    localStorage.setItem('lastclickpage', '0');
  };

  const sortWords = ['', 'likep', 'commp', 'playp', 'timep'];

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
            onClick={() => setActiveTab('all')}
          >
            {loc('AllCharts', '全部谱面')}
          </button>
          <button
            className={`px-4 md:px-5 py-2 rounded-full text-sm md:text-base transition-colors cursor-pointer ${activeTab === 'random' ? 'bg-blue-500/80 text-white' : 'text-white/80 hover:text-white'
              }`}
            onClick={() => setActiveTab('random')}
          >
            {loc('RandomRecommend', '随机推荐')}
          </button>
        </div>
      </div>

      {activeTab === 'all' ? (
        <>
          <SearchBar
            onChange={(e) => debounced(e.target.value)}
            initS={Search}
            sortType={sortType}
            onSortChange={onSortChange}
          />

          <SongList
            url={endpoints.maichart.listSearchAndSort(Search, sortWords[sortType], page)}
            page={page}
            setMax={setMaxpage}
          />

          <div className="flex flex-col items-center gap-6 mx-auto mt-12 px-4 max-w-7xl">
            <div className="flex items-center gap-4 bg-[rgba(20,20,25,0.9)] shadow-[0_8px_32px_rgba(0,0,0,0.3),0_2px_8px_rgba(0,0,0,0.2)] backdrop-blur-xl p-6 border border-white/10 rounded-xl">
              <button
                className={`px-6 py-3 bg-blue-500/80 border-none rounded-lg text-white font-medium cursor-pointer min-w-20 ${page - 1 < 0 ? 'bg-gray-500/50 cursor-not-allowed opacity-60' : ''}`}
                disabled={page - 1 < 0}
                onClick={() => {
                  setPage(page - 1);
                  window.scrollTo(0, 200);
                }}
              >
                ←
              </button>

              <div className="flex items-center gap-2">
                <span className="text-[#ccc] text-sm">{loc('PageOf', '第')}</span>
                <input
                  type="number"
                  value={page}
                  className="bg-black/70 focus:shadow-[0_0_8px_rgba(59,130,246,0.3)] p-2 border border-white/20 focus:border-blue-500 rounded-md focus:outline-none w-15 font-medium text-white text-center"
                  onChange={(event) => {
                    if (event.target.value !== '') {
                      setPage(parseInt(event.target.value));
                    } else setPage(0);
                  }}
                  min="0"
                  step="1"
                />
                <span className="text-[#ccc] text-sm">{loc('Page', '页')}</span>
              </div>

              <button
                className={`px-6 py-3 bg-blue-500/80 border-none rounded-lg text-white font-medium cursor-pointer min-w-20 ${page >= maxpage ? 'bg-gray-500/50 cursor-not-allowed opacity-60' : ''}`}
                disabled={page >= maxpage}
                onClick={() => {
                  setPage(page + 1);
                  window.scrollTo(0, 200);
                }}
              >
                →
              </button>
            </div>

            <button
              className="bg-white/10 px-6 py-2 border border-white/20 rounded-lg text-white cursor-pointer"
              onClick={() => {
                setPage(0);
                window.scrollTo(0, 200);
              }}
            >
              {loc('FrontPage', '首页')}
            </button>
            <IntegratedDownloadTypeSelector isMobile={true} />
          </div>
        </>
      ) : (
        <>
          <div className="flex flex-col items-center gap-4 mx-auto mb-6 px-4 max-w-7xl">
            <button
              className="bg-blue-500/80 hover:bg-blue-500 px-6 py-2 border-none rounded-lg font-medium text-white cursor-pointer"
              onClick={refreshRandomBatch}
            >
              {loc('RefreshBatch', '换一批')}
            </button>
          </div>

          <RandomRecommendList refreshKey={randomSeed} />

          <div className="flex justify-center mt-12 px-4">
            <IntegratedDownloadTypeSelector isMobile={true} />
          </div>
        </>
      )}
    </>
  );
}

function RandomRecommendList({ refreshKey }: { refreshKey: number }) {
  const loc = useLoc();

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
    return <div className="m-auto w-full text-[50px] text-center">{loc('ServerError', '服务器错误')}</div>;
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-20 w-full">
        <LoadingSpinner size="50px" />
      </div>
    );
  }

  if (randomSongs.length === 0) {
    return <div className="m-auto w-full text-[50px] text-center">{loc('EmptyData', '暂无数据')}</div>;
  }

  return (
    <div className="justify-center gap-[0.6rem] grid grid-cols-[repeat(auto-fit,minmax(20rem,20.6rem))] mx-auto p-2 w-full max-w-350">
      {randomSongs.map((song, index) => (
        <SongCard key={song.id} song={song} index={index} page={0} />
      ))}
    </div>
  );
}

function IntegratedDownloadTypeSelector({ isMobile }: { isMobile: boolean }) {
  const loc = useLoc();
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
          {loc('DownloadFormat', '下载格式')}
          {justChanged && <span className="ml-2 font-semibold text-[#22c55e] text-sm">✓</span>}
        </label>
      )}
      <select
        value={isMobile ? currentType || 'placeholder' : currentType}
        onChange={handleChange}
        className="bg-[rgba(20,20,25,0.8)] backdrop-blur-xl backdrop-saturate-150 px-3 py-1 border border-white/20 rounded-full outline-none w-full md:w-auto min-w-0 md:min-w-20 h-10 md:h-11.25 overflow-hidden text-white text-xs sm:text-sm text-center whitespace-nowrap appearance-none cursor-pointer"
        data-mobile-label={loc('DownloadFormat', '下载格式')}
      >
        {isMobile && (
          <option value="placeholder" disabled>
            {loc('DownloadFormat', '下载格式')}
            {justChanged && ' ✓'}
          </option>
        )}
        <option value="zip">ZIP</option>
        <option value="adx">ADX</option>
      </select>
    </div>
  );
}
