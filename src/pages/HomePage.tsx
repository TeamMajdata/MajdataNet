/**
 * 主页组件
 * 迁移自 legacy/src/app/page.jsx
 */

import React, { useEffect, useState } from 'react';
import Tippy from '@tippyjs/react';
import 'tippy.js/dist/tippy.css';
import { useDebouncedCallback } from 'use-debounce';
import { useSearchParams } from 'react-router-dom';

import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Pagination } from 'swiper/modules';
import 'swiper/swiper-bundle.css';

import { loc, setLanguage } from '@/utils/i18n';
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

export default function HomePage() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!isLoaded) {
      setIsLoaded(true);
    }
  }, [isLoaded]);

  useEffect(() => {
    setLanguage(localStorage.getItem('language') || navigator.language).then(() => {
      setReady(true);
    });
  }, []);

  if (!ready) return <div className="loading"></div>;

  return (
    <PageLayout showBackToHome={false} className="home-page">
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
  const [ongoingEvents, setOngoingEvents] = useState<any[]>([]);
  const remainingEventsCount = getNonFeaturedEventsCount();

  useEffect(() => {
    // 获取所有活跃的活动（进行中 + 即将开始）
    const events = getActiveEvents().map((event) => ({
      ...event,
      timeAgo: getTimeAgo(event.createDate),
      createDateFormatted: new Date(event.createDate).toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
    }));
    setOngoingEvents(events);
  }, []);

  return (
    <section className="events-showcase">
      <div className="events-showcase-container">
        <div className="desktop-swiper-wrapper">
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
            className="desktop-events-swiper"
          >
            {/* 活跃的活动（进行中 + 即将开始） */}
            {ongoingEvents.map((event) => (
              <SwiperSlide key={event.id} className="desktop-event-slide">
                <div className="event-card">
                  <a href={event.href} className="event-link">
                    <div className="event-image-container">
                      <img
                        className="event-image"
                        src={event.src}
                        alt={event.alt}
                        loading="lazy"
                      />
                      <div className="event-hover-info">
                        <div className="event-details">
                          <h3 className="event-title">{event.title}</h3>
                          <div className="event-meta">
                            <span className="event-category">
                              {getCategoryTranslation(event.category)}
                            </span>
                            <span className={`event-status ${getEventStatusClass(event)}`}>
                              • {getEventStatusText(event)}
                            </span>
                            <span
                              className="event-time"
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
            <SwiperSlide className="desktop-event-slide desktop-more-slide">
              <div className="event-card more-card">
                <a href="/events" className="event-link">
                  <div className="more-content">
                    <div className="more-icon">→</div>
                    <div className="more-text">more</div>
                  </div>
                  <div className="more-overlay">
                    <div className="more-hover-text">
                      <span>{loc('ViewAllEvents', '查看所有活动')}</span>
                      <span className="more-count">
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
  const [ongoingEvents, setOngoingEvents] = useState<any[]>([]);

  useEffect(() => {
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
    const events = getActiveEvents().map((event) => ({
      ...event,
      timeAgo: getTimeAgo(event.createDate),
      createDateFormatted: new Date(event.createDate).toLocaleDateString(getDateLocale(), {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
    }));
    setOngoingEvents(events);
  }, []);

  return (
    <section className="mobile-events-showcase">
      <div className="mobile-events-container">
        <div className="mobile-swiper-wrapper">
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
            className="mobile-events-swiper"
          >
            {/* 活跃的活动（进行中 + 即将开始） */}
            {ongoingEvents.map((event) => (
              <SwiperSlide key={event.id} className="mobile-event-slide">
                <a href={event.href} className="mobile-event-link">
                  <div className="mobile-event-card">
                    <div className="mobile-event-image-container">
                      <img
                        className="mobile-event-image"
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
            <SwiperSlide className="mobile-event-slide mobile-more-slide">
              <a href="/events" className="mobile-event-link">
                <div className="mobile-more-card">
                  <div className="mobile-more-card-content">
                    <div className="mobile-more-icon-large">→</div>
                    <h3 className="mobile-more-title">MORE</h3>
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

interface SearchBarProps {
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  initS: string;
  sortType: number;
  onSortChange: (val: number) => void;
}

function SearchBar({ onChange, initS, sortType, onSortChange }: SearchBarProps) {
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
    <div className="search-section">
      <div className="search-container">
        <div className="search-row">
          <div className="search-bar">
            <div className="search-input-wrapper">
              <input
                type="text"
                className="modern-search"
                placeholder={initS === '' ? loc('SearchPlaceholder', '搜索...') : initS}
                value={currentValue}
                onChange={handleInputChange}
                onClick={handleInputChange}
              />
              {currentValue && (
                <button className="search-clear-button" onClick={handleClearSearch} title="清空搜索">
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
                  className="top-1/2 right-10 md:right-14 z-2 absolute flex justify-center items-center bg-transparent hover:bg-white/10 active:bg-white/15 hover:shadow-[0_0_0_6px_rgba(255,255,255,0.02),0_0_8px_rgba(255,255,255,0.08)] border border-white/20 hover:border-white/30 rounded-full w-5 md:w-6 h-5 md:h-6 font-semibold text-white/70 hover:text-white/90 text-xs md:text-sm leading-none hover:scale-110 active:scale-95 transition-all -translate-y-1/2 duration-300 ease-out cursor-pointer" 
                  title="搜索提示"
                >
                  ?
                </button>
              </Tippy>
            </div>
          </div>

          <div className="search-controls">
            <div className="sort-selector">
              <select
                value={isMobile ? (sortType === undefined ? 'placeholder' : sortType) : sortType}
                onChange={(e) => {
                  if (e.target.value === 'placeholder') return;
                  const val = parseInt(e.target.value);
                  onSortChange(val);
                }}
                className="modern-select"
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
  const [Search, setSearch] = useState('');
  const [isLoaded, setIsLoaded] = useState(false);
  const [page, setPage] = useState(0);
  const [maxpage, setMaxpage] = useState(999999);
  const [sortType, setSortType] = useState(0);
  const [searchParams] = useSearchParams();

  useEffect(() => {
    if (!isLoaded) {
      // 检查URL中的search参数
      const urlSearchParam = searchParams.get('search');
      const a = urlSearchParam || localStorage.getItem('search');
      const b = localStorage.getItem('lastclickpage');
      const s = localStorage.getItem('sort');

      setSearch(a ? a : '');
      setPage(parseInt(b ? b : '0'));
      setIsLoaded(true);
      setSortType(s ? parseInt(s) : 0);

      // 如果URL中有search参数，保存到localStorage
      if (urlSearchParam) {
        localStorage.setItem('search', urlSearchParam);
      }
    }
  }, [isLoaded, searchParams]);

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

      <div className="pagination-section">
        <div className="pagination-container">
          <button
            className={`pagination-btn ${page - 1 < 0 ? 'disabled' : ''}`}
            disabled={page - 1 < 0}
            onClick={() => {
              setPage(page - 1);
              window.scrollTo(0, 200);
            }}
          >
            ←
          </button>

          <div className="page-input-container">
            <span className="page-label">{loc('PageOf', '第')}</span>
            <input
              type="number"
              value={page}
              className="page-input"
              onChange={(event) => {
                if (event.target.value !== '') {
                  setPage(parseInt(event.target.value));
                } else setPage(0);
              }}
              min="0"
              step="1"
            />
            <span className="page-label">{loc('Page', '页')}</span>
          </div>

          <button
            className={`pagination-btn ${page >= maxpage ? 'disabled' : ''}`}
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
          className="first-page-btn"
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

// Simplified version of integrated search bar
function IntegratedDownloadTypeSelector({ isMobile }: { isMobile: boolean }) {
  const [currentType, setCurrentType] = useState('zip');
  const [justChanged, setJustChanged] = useState(false);

  useEffect(() => {
    // Get init type
    const type = localStorage.getItem('DownloadType');
    if (type != undefined) {
      setCurrentType(type);
    }
  });

  const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newtype = e.target.value;
    if (newtype === 'placeholder') return;
    localStorage.setItem('DownloadType', newtype);
    setCurrentType(newtype);

    // Display succession of saving
    setJustChanged(true);
    setTimeout(() => setJustChanged(false), 2000);
  };

  return (
    <div className="download-format-selector">
      {!isMobile && (
        <label className={`sort-label ${justChanged ? 'label-success' : ''}`}>
          {loc('DownloadFormat', '下载格式')}
          {justChanged && <span className="success-indicator">✓</span>}
        </label>
      )}
      <select
        value={isMobile ? currentType || 'placeholder' : currentType}
        onChange={handleChange}
        className="modern-select"
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
