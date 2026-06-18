import React, {
  useEffect,
  useState,
  useMemo,
  useRef,
  useCallback,
} from "react";
import useSWR from "swr";
import { motion, AnimatePresence } from "framer-motion";
import { Tooltip } from "@/components";
import { useDebouncedCallback } from "use-debounce";
import { Link, useSearchParams } from "react-router-dom";

import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Pagination } from "swiper/modules";
import "swiper/swiper-bundle.css";

import { setLanguage } from "@/utils/i18n";
import { useLoc } from "@/hooks";
import { PageLayout, SongCard, SongList, LoadingSpinner } from "@/components";
import { endpoints } from "@/config/api";
import {
  getEventStatusClass,
  getEventStatusText,
  getActiveEvents,
  getTimeAgo,
  getCategoryTranslation,
} from "@/utils/eventsData";
import {
  CalendarClock,
  Calendar,
  Heart,
  MessageCircle,
  Flag,
  Play,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import type { SearchBarProps, Song } from "@/types";

// 获取用户时区的次日午夜时间戳 (UTC)
const getNextMidnightTimestamp = (): number => {
  const now = new Date();
  const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const formatter = new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
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
    parseInt(dateObj.day),
  );

  const tomorrow = new Date(userLocalDate);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const millisUntilMidnight =
    tomorrow.getTime() -
    now.getTime() +
    (now.getTime() - userLocalDate.getTime());
  return now.getTime() + millisUntilMidnight;
};

const cachedSongListFetcher = async (url: string): Promise<Song[]> => {
  const cacheKey = "homeSongListCache";
  const cacheExpireTimeKey = "homeSongListCacheExpireTime";

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
    console.error("缓存读取错误:", e);
  }

  // 2. 缓存不存在或已过期，发起请求
  const data = await fetch(url, { mode: "cors", credentials: "include" }).then(
    (res) => res.json(),
  );

  // 3. 请求成功后存入 localStorage，同时存储时间戳和过期时间
  if (Array.isArray(data) && data.length > 0) {
    try {
      const nextMidnightTime = getNextMidnightTimestamp();

      localStorage.setItem(cacheKey, JSON.stringify(data));
      localStorage.setItem(cacheExpireTimeKey, nextMidnightTime.toString());
    } catch (e) {
      console.error("缓存保存错误:", e);
    }
  }

  return data;
};

export default function HomePage() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setLanguage(localStorage.getItem("language") || navigator.language).then(
      () => {
        setReady(true);
      },
    );
  }, []);

  if (!ready)
    return (
      <div className="flex justify-center items-center h-screen">
        <LoadingSpinner size="50px" />
      </div>
    );

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
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // 移动端和PC端都使用Swiper
  return isMobile ? <MobileEventsSwiper /> : <DesktopEventsSwiper />;
}

function getDateLocale() {
  const lang = localStorage.getItem("language") || "zh";
  const localeMap: Record<string, string> = {
    zh: "zh-CN",
    en: "en-US",
    ja: "ja-JP",
    ko: "ko-KR",
  };
  return localeMap[lang] || "zh-CN";
}

// PC端专用的 Swiper 组件
function DesktopEventsSwiper() {
  const ongoingEvents = useMemo(() => {
    return getActiveEvents().map((event) => ({
      ...event,
      timeAgo: getTimeAgo(event.createDate),
      createDateFormatted: new Date(event.createDate).toLocaleDateString(
        getDateLocale(),
        { year: "numeric", month: "long", day: "numeric" },
      ),
    }));
  }, []);

  return (
    <section className="mx-auto mt-8 w-full">
      <Swiper
        modules={[Pagination, Autoplay]}
        spaceBetween={0}
        slidesPerView={1}
        centeredSlides={true}
        autoplay={{ delay: 5000, disableOnInteraction: false }}
        pagination={{ clickable: true, dynamicBullets: true }}
        loop={ongoingEvents.length > 2}
        breakpoints={{
          768: { slidesPerView: 1, spaceBetween: 0 },
          1024: { slidesPerView: 1, spaceBetween: 0 },
        }}
        className="pb-10"
      >
        {ongoingEvents.map((event) => (
          <SwiperSlide key={event.id}>
            <Link to={event.href} className="block no-underline group">
              <div className="relative bg-white shadow-md border border-gray-200 rounded-2xl transition-transform duration-300">
                <img
                  className="w-full aspect-[1279/372] object-cover"
                  src={event.src}
                  alt={event.alt}
                  loading="lazy"
                />
                <span
                  className={`absolute top-3 right-3 z-10 flex items-center gap-2 font-semibold bg-white rounded-full px-4 py-2 text-xl leading-none ${
                    getEventStatusClass(event) === "status-upcoming"
                      ? "text-[#5C8DC1]"
                      : getEventStatusClass(event) === "status-ongoing"
                        ? "text-[#10b981]"
                        : "text-white"
                  }`}
                >
                  {getEventStatusClass(event) === "status-upcoming" ? (
                    <CalendarClock size={24} />
                  ) : getEventStatusClass(event) === "status-ongoing" ? (
                    <Play size={24} />
                  ) : (
                    <Flag size={24} />
                  )}
                  {getEventStatusText(event)}
                </span>
                <div className="absolute inset-0 flex flex-col justify-end bg-linear-to-b from-transparent via-transparent to-black/40 p-4">
                  <h3 className="m-0 mb-1 font-bold text-white text-4xl leading-tight">
                    {event.title}
                  </h3>
                  <div className="flex flex-wrap items-center gap-2 text-white/80 text-xs">
                    <span className="text-white">
                      {getCategoryTranslation(event.category)}
                    </span>
                    <span className="text-white">{event.timeAgo}</span>
                  </div>
                </div>
              </div>
            </Link>
          </SwiperSlide>
        ))}
      </Swiper>
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
      createDateFormatted: new Date(event.createDate).toLocaleDateString(
        getDateLocale(),
        {
          year: "numeric",
          month: "long",
          day: "numeric",
        },
      ),
    }));
  }, []);

  return (
    <section className="mx-auto mt-8 w-full">
      <Swiper
        modules={[Pagination, Autoplay]}
        spaceBetween={0}
        slidesPerView={1}
        centeredSlides={true}
        autoplay={{ delay: 5000, disableOnInteraction: false }}
        pagination={{ clickable: true, dynamicBullets: true }}
        loop={ongoingEvents.length > 1}
        breakpoints={{
          768: { slidesPerView: 1, spaceBetween: 0 },
          1024: { slidesPerView: 1, spaceBetween: 0 },
        }}
        className="pb-10"
      >
        {ongoingEvents.map((event) => (
          <SwiperSlide key={event.id}>
            <Link to={event.href} className="block no-underline group">
              <div className="relative bg-white shadow-md border border-gray-200 rounded-2xl transition-transform duration-300">
                <img
                  className="w-full aspect-[1279/372] object-cover"
                  src={event.src}
                  alt={event.alt}
                  loading="lazy"
                />
                <span
                  className={`absolute top-3 right-3 z-10 flex items-center gap-2 font-semibold bg-white rounded-full px-4 py-2 text-xl leading-none ${
                    getEventStatusClass(event) === "status-upcoming"
                      ? "text-[#5C8DC1]"
                      : getEventStatusClass(event) === "status-ongoing"
                        ? "text-[#10b981]"
                        : "text-white"
                  }`}
                >
                  {getEventStatusClass(event) === "status-upcoming" ? (
                    <CalendarClock size={24} />
                  ) : getEventStatusClass(event) === "status-ongoing" ? (
                    <Play size={24} />
                  ) : (
                    <Flag size={24} />
                  )}
                  {getEventStatusText(event)}
                </span>
                <div className="absolute inset-0 flex flex-col justify-end bg-linear-to-b from-transparent via-transparent to-black/40 p-4">
                  <h3 className="m-0 mb-1 font-bold text-white text-4xl leading-tight">
                    {event.title}
                  </h3>
                  <div className="flex flex-wrap items-center gap-2 text-white/80 text-xs">
                    <span className="text-white">
                      {getCategoryTranslation(event.category)}
                    </span>
                    <span className="text-white">{event.timeAgo}</span>
                  </div>
                </div>
              </div>
            </Link>
          </SwiperSlide>
        ))}
      </Swiper>
    </section>
  );
}

function SearchBar({
  onChange,
  initS,
  sortType,
  onSortChange,
}: SearchBarProps) {
  const loc = useLoc();
  const [isMobile, setIsMobile] = useState(false);
  const [currentValue, setCurrentValue] = useState(initS);
  const [isSortOpen, setIsSortOpen] = useState(false);
  const sortRef = useRef<HTMLDivElement>(null);

  const sortIcons = [Calendar, Heart, MessageCircle, Play];

  // 点击外部关闭排序下拉
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) {
        setIsSortOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const sortOptions = [
    loc("UploadDate", "上传日期"),
    loc("LikeCount", "点赞数"),
    loc("CommentCount", "评论数"),
    loc("PlayCount", "播放数"),
  ];

  // 检测是否为移动端
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
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
    setCurrentValue("");
    const fakeEvent = {
      target: { value: "" },
    } as React.ChangeEvent<HTMLInputElement>;
    onChange(fakeEvent);
  };

  // 提示内容组件
  const hintContent = (
    <div className="bg-white shadow-[0_8px_30px_rgba(0,0,0,0.08),0_2px_8px_rgba(0,0,0,0.04)] px-5 py-4 border border-[#5C8DC1]/20 rounded-2xl w-70 md:w-[320px]">
      <div className="space-y-2.5 text-left">
        <p className="m-0 text-[0.85rem] text-gray-600 md:text-[0.9rem] leading-normal">
          {loc("SearchHintID", "按 ID 搜索")}
        </p>
        <p className="m-0 text-[0.85rem] text-gray-600 md:text-[0.9rem] leading-normal">
          {loc("SearchHintHash", "按 Hash 搜索")}
        </p>
        <p className="m-0 text-[0.85rem] text-gray-600 md:text-[0.9rem] leading-normal">
          {loc("SearchHintTag", "按标签搜索")}
        </p>
        <p className="m-0 text-[0.85rem] text-gray-600 md:text-[0.9rem] leading-normal">
          {loc("SearchHintUploader", "按上传者搜索")}
        </p>
      </div>
    </div>
  );

  return (
    <div className="mt-4 md:mt-0 mb-4 md:mb-4 px-4 md:px-4 w-full">
      <div className="relative overflow-visible">
        <div className="flex flex-row justify-center items-center gap-2 md:gap-6 p-3 md:p-4 w-full">
          <div className="flex-1 min-w-0">
            <div className="relative flex items-center w-full">
              <input
                type="text"
                className="bg-white px-6 md:px-7 py-3 md:py-4 pr-10 md:pr-14 border-2 border-gray-200 focus:border-[#5C8DC1] rounded-[30px] outline-none w-full h-11 text-gray-700 placeholder:text-gray-400 text-sm md:text-base transition-colors"
                placeholder={
                  initS === "" ? loc("SearchPlaceholder", "搜索...") : initS
                }
                value={currentValue}
                onChange={handleInputChange}
                aria-label={loc("SearchPlaceholder", "搜索...")}
              />
              <AnimatePresence>
                {currentValue && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.15 }}
                    className="top-1/2 right-10 z-2 absolute flex justify-center items-center bg-gray-100 hover:bg-gray-200 border-none rounded-full w-5 h-5 text-gray-400 hover:text-gray-600 text-xs leading-none transition-colors -translate-y-1/2 cursor-pointer"
                    onClick={handleClearSearch}
                    aria-label={loc("ClearSearch", "清空搜索")}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="10"
                      height="10"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M18 6 6 18" />
                      <path d="m6 6 12 12" />
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
                  className="top-1/2 right-3 z-10 absolute flex justify-center items-center bg-gray-100 hover:bg-[#5C8DC1]/10 active:bg-[#5C8DC1]/15 shadow-sm border border-gray-200 hover:border-[#5C8DC1]/30 rounded-full w-5 h-5 font-bold text-[10px] text-[#5C8DC1] hover:text-[#4A7DAF] leading-none transition-all -translate-y-1/2 duration-200 cursor-pointer"
                  role="button"
                  aria-label="Search Hint Button"
                >
                  ?
                </div>
              </Tooltip>
            </div>
          </div>

          <div className="shrink-0 relative" ref={sortRef}>
            <button
              onClick={() => setIsSortOpen(!isSortOpen)}
              className="flex items-center justify-center gap-1.5 bg-white hover:bg-gray-50 px-4 md:px-5 py-2 border border-gray-200 hover:border-[#5C8DC1]/30 rounded-full min-h-10 text-gray-700 hover:text-[#5C8DC1] text-xs sm:text-sm font-medium whitespace-nowrap overflow-visible transition-all duration-200 cursor-pointer"
            >
              <span className="inline-flex items-center justify-center">
                {React.createElement(sortIcons[sortType ?? 0], { size: 14 })}
              </span>
              <span className="inline-flex items-center">
                {sortOptions[sortType ?? 0]}
              </span>
              <ChevronDown
                size={12}
                className={`transition-transform duration-200 ${isSortOpen ? "rotate-180" : ""}`}
              />
            </button>

            {isSortOpen && (
              <div className="top-full right-0 z-20 absolute bg-white shadow-[0_8px_30px_rgba(0,0,0,0.1),0_2px_8px_rgba(0,0,0,0.04)] mt-2 py-1 border border-gray-200 rounded-xl min-w-[140px] overflow-hidden">
                {sortOptions.map((label, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      onSortChange(i);
                      setIsSortOpen(false);
                    }}
                    className={`flex items-center gap-2 px-4 py-2.5 w-full text-sm text-left transition-colors ${
                      (sortType ?? 0) === i
                        ? "text-[#5C8DC1] bg-[#5C8DC1]/5 font-semibold"
                        : "text-gray-600 hover:text-[#5C8DC1] hover:bg-gray-50"
                    }`}
                  >
                    <span className="inline-flex items-center justify-center">
                      {React.createElement(sortIcons[i], { size: 18 })}
                    </span>
                    <span className="inline-flex items-center">{label}</span>
                  </button>
                ))}
              </div>
            )}
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
  const [activeTab, setActiveTab] = useState<"all" | "random">(() => {
    const stored = localStorage.getItem("homeActiveTab");
    return stored === "random" ? "random" : "all";
  });

  // 从 localStorage 或 URL 参数初始化状态
  const [Search, setSearch] = useState(() => {
    const urlSearchParam = searchParams.get("search");
    const initialValue = urlSearchParam || localStorage.getItem("search") || "";
    // 保存URL参数到localStorage
    if (urlSearchParam) {
      localStorage.setItem("search", urlSearchParam);
    }
    return initialValue;
  });
  const [page, setPage] = useState(() => {
    const stored = localStorage.getItem("lastclickpage");
    return parseInt(stored || "0");
  });
  const [maxpage, setMaxpage] = useState(999999);
  const [sortType, setSortType] = useState(() => {
    const stored = localStorage.getItem("sort");
    return stored ? parseInt(stored) : 0;
  });
  const [randomSeed, setRandomSeed] = useState(() =>
    Math.floor(Math.random() * 1000000),
  );

  // 处理 URL 参数变化（跳过初始挂载）
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    const urlSearchParam = searchParams.get("search");
    if (urlSearchParam) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSearch(urlSearchParam);
      localStorage.setItem("search", urlSearchParam);
    }
  }, [searchParams]);

  const debounced = useDebouncedCallback(
    // function
    (value: string) => {
      setSearch(value);
      setPage(0);
      setMaxpage(9999999999999);
      localStorage.setItem("search", value);
      localStorage.setItem("lastclickpage", "0");
    },
    // delay in ms
    500,
  );

  const onSortChange = (val: number) => {
    setSortType(val);
    localStorage.setItem("sort", val.toString());
    setPage(0);
    localStorage.setItem("lastclickpage", "0");
  };

  const sortWords = ["", "likep", "commp", "playp"];

  const refreshRandomBatch = useCallback(() => {
    setRandomSeed((prev) => prev + 1);
  }, []);

  useEffect(() => {
    localStorage.setItem("homeActiveTab", activeTab);
  }, [activeTab]);

  // 渲染数据
  return (
    <>
      <div className="flex justify-center px-4 pt-2 pb-3">
        <div className="inline-flex bg-gray-100 p-1 border border-gray-200 rounded-full">
          <button
            className={`px-4 md:px-5 py-2 rounded-full text-sm md:text-base font-medium transition-all duration-200 cursor-pointer hover:scale-105 active:scale-95 ${
              activeTab === "all"
                ? "bg-white text-[#5C8DC1] shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => setActiveTab("all")}
          >
            {loc("AllCharts", "全部谱面")}
          </button>
          <button
            className={`px-4 md:px-5 py-2 rounded-full text-sm md:text-base font-medium transition-all duration-200 cursor-pointer hover:scale-105 active:scale-95 ${
              activeTab === "random"
                ? "bg-white text-[#5C8DC1] shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => setActiveTab("random")}
          >
            {loc("RandomRecommend", "随机推荐")}
          </button>
        </div>
      </div>

      {activeTab === "all" ? (
        <>
          <SearchBar
            onChange={(e) => debounced(e.target.value)}
            initS={Search}
            sortType={sortType}
            onSortChange={onSortChange}
          />

          <SongList
            url={endpoints.maichart.listSearchAndSort(
              Search,
              sortWords[sortType],
              page,
            )}
            page={page}
            setMax={setMaxpage}
          />

          <div className="flex flex-col items-center gap-4 mx-auto mt-8 px-4">
            <div className="flex items-center gap-3 p-4">
              <button
                className={`flex items-center justify-center px-4 py-2.5 text-gray-700 hover:text-[#5C8DC1] font-medium text-sm cursor-pointer min-w-[3rem] transition-all duration-200 hover:scale-105 active:scale-95 ${page - 1 < 0 ? "opacity-20 cursor-not-allowed" : ""}`}
                disabled={page - 1 < 0}
                onClick={() => {
                  setPage(page - 1);
                  window.scrollTo(0, 200);
                }}
              >
                <ChevronLeft size={18} />
              </button>

              <div className="flex items-center gap-2">
                <span className="text-gray-400 text-sm">
                  {loc("PageOf", "第")}
                </span>
                <input
                  type="number"
                  value={page}
                  className="bg-gray-50 focus:shadow-[0_0_0_2px_rgba(92,141,193,0.2)] px-3 py-2 border border-gray-200 focus:border-[#5C8DC1] rounded-lg focus:outline-none w-16 font-medium text-gray-700 text-center transition-colors"
                  onChange={(event) => {
                    if (event.target.value !== "") {
                      setPage(parseInt(event.target.value));
                    } else setPage(0);
                  }}
                  min="0"
                  step="1"
                />
                <span className="text-gray-400 text-sm">
                  {loc("Page", "页")}
                </span>
              </div>

              <button
                className={`flex items-center justify-center px-4 py-2.5 text-gray-700 hover:text-[#5C8DC1] font-medium text-sm cursor-pointer min-w-[3rem] transition-all duration-200 hover:scale-105 active:scale-95 ${page >= maxpage ? "opacity-20 cursor-not-allowed" : ""}`}
                disabled={page >= maxpage}
                onClick={() => {
                  setPage(page + 1);
                  window.scrollTo(0, 200);
                }}
              >
                <ChevronRight size={18} />
              </button>
            </div>
            <IntegratedDownloadTypeSelector />
          </div>
        </>
      ) : (
        <>
          <div className="flex justify-center mx-auto mb-6 px-4">
            <button
              className="flex items-center gap-2 bg-white hover:bg-gray-50 px-5 py-2.5 border border-gray-200 hover:border-[#5C8DC1]/30 rounded-lg text-gray-700 hover:text-[#5C8DC1] text-sm font-medium transition-all duration-200 cursor-pointer"
              onClick={refreshRandomBatch}
            >
              {loc("RefreshBatch", "换一批")}
            </button>
          </div>

          <RandomRecommendList refreshKey={randomSeed} />

          <div className="flex justify-center mt-12 px-4">
            <IntegratedDownloadTypeSelector />
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
    },
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
    return (
      <div className="m-auto w-full text-[50px] text-center">
        {loc("ServerError", "服务器错误")}
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-20 w-full">
        <LoadingSpinner size="50px" />
      </div>
    );
  }

  if (randomSongs.length === 0) {
    return (
      <div className="m-auto w-full text-[50px] text-center">
        {loc("EmptyData", "暂无数据")}
      </div>
    );
  }

  return (
    <div className="justify-center gap-[0.6rem] grid grid-cols-[repeat(auto-fit,minmax(20rem,20.6rem))] mx-auto p-2 w-full">
      {randomSongs.map((song, index) => (
        <SongCard key={song.id} song={song} index={index} page={0} />
      ))}
    </div>
  );
}

function IntegratedDownloadTypeSelector() {
  const [currentType, setCurrentType] = useState(() => {
    return localStorage.getItem("DownloadType") || "zip";
  });
  const [setJustChanged] = useState(false);

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="flex bg-gray-100 rounded-full p-0.5">
        <button
          onClick={() => {
            localStorage.setItem("DownloadType", "zip");
            setCurrentType("zip");
            setJustChanged(true);
            setTimeout(() => setJustChanged(false), 2000);
          }}
          className={`px-3 md:px-4 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-all duration-200 ${
            currentType === "zip"
              ? "bg-white text-[#5C8DC1] shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          ZIP
        </button>
        <button
          onClick={() => {
            localStorage.setItem("DownloadType", "adx");
            setCurrentType("adx");
            setJustChanged(true);
            setTimeout(() => setJustChanged(false), 2000);
          }}
          className={`px-3 md:px-4 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-all duration-200 ${
            currentType === "adx"
              ? "bg-white text-[#5C8DC1] shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          ADX
        </button>
      </div>
    </div>
  );
}
