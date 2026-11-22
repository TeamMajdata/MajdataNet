import { useTranslation } from 'react-i18next';
import EmptyState from '@/components/ui/EmptyState';
import SectionLoading from '@/components/ui/SectionLoading';
import { getLocale, useLanguage } from '@/i18n';
import { getEventHref } from '@/utils/eventLink';
import { eventThumbSrc, fallbackToOriginal } from '@/utils/eventImage';
import React, { useEffect, useState, useCallback } from 'react';
import useSWR from 'swr';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';

import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';
import SortMenu from '@/components/ui/SortMenu';
import SearchBox from '@/components/search/SearchBox';
import { SORT_WORDS, parseIndexParam, useSortOptions } from '@/components/search/chartSort';

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
import type { Song } from '@/types';
import { API_PAGES_PER_VIEW, apiPagesForView, SONG_GRID_CLASS } from '@/components/song/songGrid';
import RecentUploads from '@/components/home/RecentUploads';
import PopularRanking from '@/components/home/PopularRanking';
import CollectionsRow from '@/components/home/CollectionsRow';

export default function HomePage() {
  return (
    <PageLayout>
      {/* Events Carousel */}
      <EventsCarousel />

      {/* 活动下面：搜索栏（回车进搜索页）、最近上传、人气排行、歌单广场 */}
      <div className="mx-auto mt-6 w-full max-w-320 min-w-0">
        <HomeSearch />
        <RecentUploads />
        <PopularRanking />
        <CollectionsRow />
      </div>

      {/* Main Content */}
      <MainComp />
    </PageLayout>
  );
}

/** 主页的搜索栏：只负责输入和联想，回车或选中联想后进入搜索页 */
function HomeSearch() {
  const navigate = useNavigate();
  return (
    <div className="z-30 relative flex mb-8">
      <SearchBox value="" onSubmit={(value) => navigate(value ? '/search?search=' + encodeURIComponent(value) : '/search')} />
    </div>
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


type HomeTab = 'all' | 'recommend';

function MainComp() {
  const { t } = useTranslation();
  const { user, isLoading: isUserLoading } = useUserContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const sortOptions = useSortOptions();
  // tab、推荐页码、搜索词、排序、页码全部放在 URL 里：链接可分享，浏览器回退即可还原
  // 个人推荐只对登录用户显示；登录状态确认前先按 URL 来，避免已登录用户闪一下全部谱面
  const canRecommend = !!user || isUserLoading;
  const activeTab: HomeTab = canRecommend && searchParams.get('tab') === 'recommend' ? 'recommend' : 'all';
  const recommendPage = clampRecommendPage(Number(searchParams.get('rpage') ?? 0));
  // 以前的搜索链接是 /?search=…，现在搜索有自己的页面
  const legacySearch = searchParams.get('search');
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
  const listKey = String(sortType);
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

  if (legacySearch !== null) {
    return <Navigate replace to={'/search?search=' + encodeURIComponent(legacySearch)} />;
  }

  // 渲染数据
  return (
    <>
      {/* 工具栏：与卡片网格同宽，标签切换在左，排序在右；搜索在上面的搜索栏和搜索页 */}
      <div id="home-list-toolbar" className="z-30 relative flex justify-between items-center gap-2 sm:gap-3 mx-auto mt-3 md:mt-1 mb-4 sm:mb-5 w-full max-w-320 min-w-0 scroll-mt-24">
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
          <div className="ml-auto">
            <SortMenu options={sortOptions} value={sortType} onChange={onSortChange} label={t("home/HomePage.SortBy")} />
          </div>
        )}
      </div>

      {activeTab === 'all' ? (
        <>
          <SongList
            url={apiPagesForView(page).map((apiPage) => endpoints.maichart.listSearchAndSort('', SORT_WORDS[sortType], apiPage))}
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

