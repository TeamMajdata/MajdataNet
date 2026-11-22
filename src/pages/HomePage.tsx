import { useTranslation } from 'react-i18next';
import { getLocale, useLanguage } from '@/i18n';
import { getEventHref } from '@/utils/eventLink';
import { eventThumbSrc, fallbackToOriginal } from '@/utils/eventImage';
import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';

import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';
import SearchBox from '@/components/search/SearchBox';

import { useEventClock } from '@/hooks/useEventClock';
import { PageLayout } from '@/components';
import {
  getEventStatusClass,
  getEventStatusText,
  getNonFeaturedEventsCount,
  getActiveEvents,
  getAllEvents,
  getTimeAgo,
  getCategoryTranslation,
} from '@/utils/eventsData';
import RecentUploads from '@/components/home/RecentUploads';
import PopularRanking from '@/components/home/PopularRanking';
import CollectionsRow from '@/components/home/CollectionsRow';
import { ActiveRow, RecommendRow } from '@/components/home/FeedRows';

export default function HomePage() {
  return (
    <PageLayout>
      {/* Events Carousel */}
      <EventsCarousel />

      {/* 活动下面：搜索栏（回车进搜索页），然后是各个横栏 */}
      <div className="mx-auto mt-6 w-full max-w-320 min-w-0">
        <HomeSearch />
        {/* 个人推荐（只给登录用户）在最上面，接着是最近活跃、最近上传，再是七日排行和歌单广场 */}
        <RecommendRow />
        <ActiveRow />
        <RecentUploads />
        <PopularRanking />
        <CollectionsRow />
      </div>
      <LegacySearchRedirect />
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

/** 以前的搜索链接是 /?search=…，现在搜索有自己的页面 */
function LegacySearchRedirect() {
  const [searchParams] = useSearchParams();
  const legacySearch = searchParams.get('search');
  if (legacySearch === null) return null;
  return <Navigate replace to={'/search?search=' + encodeURIComponent(legacySearch)} />;
}
