/**
 * 主页组件
 * 迁移自 legacy/src/app/page.jsx
 */

import React, { useEffect, useState, useMemo, useRef } from 'react';
import Tippy from '@tippyjs/react';
import 'tippy.js/dist/tippy.css';
import { useDebouncedCallback } from 'use-debounce';
import { useSearchParams } from 'react-router-dom';

import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Pagination } from 'swiper/modules';
import 'swiper/swiper-bundle.css';

import { setLanguage } from '@/utils/i18n';
import { useLoc } from '@/hooks';
import { PageLayout, SongList } from '@/components';
import { apiroot3 } from '@/config/api';
import {
  getEventStatusClass,
  getEventStatusText,
  getNonFeaturedEventsCount,
  getActiveEvents,
  getTimeAgo,
  getCategoryTranslation,
} from '@/utils/eventsData';
import type { SearchBarProps } from '@/types';

export default function HomePage() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setLanguage(localStorage.getItem('language') || navigator.language).then(() => {
      setReady(true);
    });
  }, []);

  if (!ready) return <div className="m-auto border-[3px] border-[rgb(var(--background-start))] border-t-white border-solid rounded-full w-[50px] h-[50px] animate-[spin_0.1s_linear_infinite]"></div>;

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
  const loc = useLoc();
  const remainingEventsCount = getNonFeaturedEventsCount();

  // 获取所有活跃的活动（进行中 + 即将开始）
  const ongoingEvents = useMemo(() => {
    return getActiveEvents().map((event) => ({
      ...event,
      timeAgo: getTimeAgo(event.createDate),
      createDateFormatted: new Date(event.createDate).toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
    }));
  }, []);

  return (
    <section className="mx-auto mt-8 mb-12 px-4 max-w-7xl">
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
                  <a href={event.href} className="block relative w-full h-full text-inherit no-underline">
                    <div className="relative w-full h-full overflow-hidden">
                      <img
                        className="block w-full h-full object-cover"
                        src={event.src}
                        alt={event.alt}
                        loading="lazy"
                      />
                      <div className="absolute inset-0 flex flex-col justify-end bg-linear-to-b from-black/50 via-30% via-black/30 to-black/90 opacity-0 hover:opacity-100 p-4">
                        <div className="text-left">
                          <h3 className="shadow-[0_2px_4px_rgba(0,0,0,0.7)] m-0 mb-2 font-bold text-white text-xl leading-tight">{event.title}</h3>
                          <div className="flex flex-wrap items-center gap-2 shadow-[0_1px_2px_rgba(0,0,0,0.5)] text-white/90 text-sm">
                            <span className="whitespace-nowrap">
                              {getCategoryTranslation(event.category)}
                            </span>
                            <span className={`font-semibold text-[0.85rem] px-1.5 py-0.5 rounded inline-block ${
                              getEventStatusClass(event) === 'status-upcoming' ? 'text-[#fbbf24] bg-[rgba(251,191,36,0.15)] border border-[rgba(251,191,36,0.3)]' :
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
                  </a>
                </div>
              </SwiperSlide>
            ))}

            {/* More 页面作为 Swiper 的最后一页 */}
            <SwiperSlide className="flex h-auto">
              <div className="flex flex-col flex-[0.5] justify-stretch self-stretch bg-linear-to-br from-[rgba(100,100,120,0.4)] to-[rgba(80,80,100,0.6)] shadow-[0_8px_32px_rgba(0,0,0,0.3),0_2px_8px_rgba(0,0,0,0.2)] backdrop-blur-lg border border-white/10 rounded-xl min-w-0 aspect-[1279/372] overflow-hidden">
                <a href="/events" className="block relative w-full h-full text-inherit no-underline">
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
                </a>
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
  // 获取当前语言的locale
  const getDateLocale = () => {
    const lang = localStorage.getItem('language') || 'zh';
    const localeMap: Record<string, string> = {
      zh: 'zh-CN',
      en: 'en-US',
      ja: 'ja-JP',
      ko: 'ko-KR',
    };
    return localeMap[lang] || 'zh-CN';
  };

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
    <section className="mx-auto mt-4 mb-0 px-4 max-w-7xl">
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
            loop={false}
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
                <a href={event.href} className="block w-full h-full text-inherit no-underline">
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
                </a>
              </SwiperSlide>
            ))}

            {/* More 页面作为 Swiper 的最后一页 */}
            <SwiperSlide className="flex h-auto">
              <a href="/events" className="block w-full h-full text-inherit no-underline">
                <div className="relative flex justify-center items-center bg-linear-to-br from-blue-500/20 via-purple-500/20 to-red-500/20 shadow-[0_8px_32px_rgba(0,0,0,0.3),0_2px_8px_rgba(0,0,0,0.2)] backdrop-blur-xl border border-white/15 rounded-xl w-full aspect-1279/372 overflow-hidden">
                  <div className="flex flex-col justify-center items-center gap-4 p-2 w-full h-full text-white text-center">
                    <div className="flex justify-center items-center font-light text-[3rem] text-white/90 leading-none">→</div>
                    <h3 className="flex justify-center items-center m-0 font-semibold text-white text-lg text-center leading-none">MORE</h3>
                  </div>
                </div>
              </a>
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
    loc('UploadDate', '上传日期'),
    loc('LikeCount', '点赞数'),
    loc('CommentCount', '评论数'),
    loc('PlayCount', '播放数'),
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

  // 搜索提示内容
  const searchHints = (
    <div className="bg-[rgba(25,25,30,0.98)] shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-[15px] backdrop-saturate-150 px-4 py-3 rounded-xl max-w-70">
      <p className="my-1 first:mt-0 text-[0.9rem] text-white/90 leading-[1.4]">{loc('SearchHintID', '按 ID 搜索')}</p>
      <p className="my-1 text-[0.9rem] text-white/90 leading-[1.4]">{loc('SearchHintHash', '按 Hash 搜索')}</p>
      <p className="my-1 text-[0.9rem] text-white/90 leading-[1.4]">{loc('SearchHintTag', '按标签搜索')}</p>
      <p className="my-1 last:mb-0 text-[0.9rem] text-white/90 leading-[1.4]">{loc('SearchHintUploader', '按上传者搜索')}</p>
    </div>
  );

  return (
    <div className="mt-4 md:mt-0 mb-4 md:mb-4 px-3 px-4 md:px-4 w-full">
      <div className="relative border border-white/10 rounded-[20px] overflow-visible">
        <div className="flex md:flex-row flex-col justify-center items-center gap-3 md:gap-6 p-4 w-full">
          <div className="w-full">
            <div className="relative flex items-center w-full">
              <input
                type="text"
                className="bg-[rgba(20,20,25,0.8)] backdrop-blur-[15px] backdrop-saturate-150 px-7 py-4 pr-12 md:pr-14 border-2 border-white/15 rounded-[30px] outline-none w-full h-[45px] md:h-[45px] text-white placeholder:text-white/60 text-base md:text-base"
                placeholder={initS === '' ? loc('SearchPlaceholder', '搜索...') : initS}
                value={currentValue}
                onChange={handleInputChange}
              />
              {currentValue && (
                <button className="top-1/2 right-4 z-[2] absolute flex justify-center items-center bg-transparent border-none rounded-full w-7 md:w-7 h-7 md:h-7 font-light text-white/60 text-xl leading-none -translate-y-1/2 cursor-pointer" onClick={handleClearSearch} title="清空搜索">
                  ×
                </button>
              )}
              <Tippy
                content={searchHints}
                placement="top"
                arrow={true}
                theme="light"
                interactive={true}
                animation="scale"
                offset={[0, 20]}
                appendTo={() => document.body}
                popperOptions={{
                  modifiers: [
                    {
                      name: 'preventOverflow',
                      options: {
                        boundary: 'viewport',
                      },
                    },
                  ],
                }}
              >
                <button 
                  className="top-1/2 right-10 md:right-14 z-2 absolute flex justify-center items-center bg-transparent border border-white/20 rounded-full w-5 md:w-6 h-5 md:h-6 font-semibold text-white/70 text-xs md:text-sm leading-none -translate-y-1/2 cursor-pointer" 
                  title="搜索提示"
                >
                  ?
                </button>
              </Tippy>
            </div>
          </div>

          <div className="flex flex-wrap justify-center items-center gap-4 md:gap-8 w-full md:w-auto">
            <div className="flex items-center gap-3 w-full md:w-auto">
              <select
                value={isMobile ? (sortType === undefined ? 'placeholder' : sortType) : sortType}
                onChange={(e) => {
                  if (e.target.value === 'placeholder') return;
                  const val = parseInt(e.target.value);
                  onSortChange(val);
                }}
                className="bg-[rgba(20,20,25,0.8)] backdrop-blur-xl backdrop-saturate-[150%] px-3 py-1 border border-white/20 rounded-full outline-none w-full md:w-auto min-w-0 md:min-w-[80px] h-10 md:h-[45px] overflow-hidden text-white text-xs sm:text-sm text-center whitespace-nowrap appearance-none cursor-pointer"
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
    </div>
  );
}

function MainComp() {
  const loc = useLoc();
  const [searchParams] = useSearchParams();
  const isInitialMount = useRef(true);
  
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

  const sortWords = ['', 'likep', 'commp', 'playp'];

  // 渲染数据
  return (
    <>
      <SearchBar
        onChange={(e) => debounced(e.target.value)}
        initS={Search}
        sortType={sortType}
        onSortChange={onSortChange}
      />

      <SongList
        url={
          apiroot3 +
          '/maichart/list?sort=' +
          sortWords[sortType] +
          '&page=' +
          page +
          '&search=' +
          encodeURIComponent(Search)
        }
        page={page}
        setMax={setMaxpage}
      />

      <div className="flex flex-col items-center gap-6 mx-auto mt-12 px-4 max-w-[1280px]">
        <div className="flex items-center gap-4 bg-[rgba(20,20,25,0.9)] shadow-[0_8px_32px_rgba(0,0,0,0.3),0_2px_8px_rgba(0,0,0,0.2)] backdrop-blur-xl p-6 border border-white/10 rounded-xl">
          <button
            className={`px-6 py-3 bg-blue-500/80 border-none rounded-lg text-white font-medium cursor-pointer min-w-[80px] ${page - 1 < 0 ? 'bg-gray-500/50 cursor-not-allowed opacity-60' : ''}`}
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
              className="bg-black/70 focus:shadow-[0_0_8px_rgba(59,130,246,0.3)] p-2 border border-white/20 focus:border-blue-500 rounded-md focus:outline-none w-[60px] font-medium text-white text-center"
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
            className={`px-6 py-3 bg-blue-500/80 border-none rounded-lg text-white font-medium cursor-pointer min-w-[80px] ${page >= maxpage ? 'bg-gray-500/50 cursor-not-allowed opacity-60' : ''}`}
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
        className="bg-[rgba(20,20,25,0.8)] backdrop-blur-xl backdrop-saturate-[150%] px-3 py-1 border border-white/20 rounded-full outline-none w-full md:w-auto min-w-0 md:min-w-[80px] h-10 md:h-[45px] overflow-hidden text-white text-xs sm:text-sm text-center whitespace-nowrap appearance-none cursor-pointer"
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
