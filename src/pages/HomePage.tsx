import React, {
  useEffect,
  useState,
  useMemo,
  useRef,
  useCallback,
} from "react";
import useSWR from "swr";
import { motion } from "framer-motion";
import { useDebouncedCallback } from "use-debounce";
import { Link, useSearchParams } from "react-router-dom";

import { setLanguage } from "@/utils/i18n";
import { useLoc } from "@/hooks";
import { PageLayout, LoadingSpinner, Levels, InteractCount } from "@/components";
import { endpoints } from "@/config/api";
import { stripTmpTags } from "@/utils/richTextUtils";
import { downloadSong } from "@/utils/download";
import { toast } from "react-toastify";
import {
  getEventStatusClass,
  getEventStatusText,
  getEventsWithTimeAgo,
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
  Download,
} from "lucide-react";
import type { Event, Song } from "@/types";

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
      {/* Latest Events Strip */}
      <LatestEventsStrip />

      {/* Main Content */}
      <MainComp />
    </PageLayout>
  );
}

/** 活动状态徽章（纯色块） */
function EventStatusBadge({ event }: { event: Event }) {
  const cls = getEventStatusClass(event);
  const base =
    "inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium whitespace-nowrap";
  if (cls === "status-upcoming") {
    return (
      <span className={`${base} bg-primary text-white`}>
        <CalendarClock size={12} />
        {getEventStatusText(event)}
      </span>
    );
  }
  if (cls === "status-ongoing") {
    return (
      <span className={`${base} bg-ok text-white`}>
        <Play size={12} />
        {getEventStatusText(event)}
      </span>
    );
  }
  return (
    <span className={`${base} bg-surface-2 text-ink-3`}>
      <Flag size={12} />
      {getEventStatusText(event)}
    </span>
  );
}

/**
 * 最新活动横向滚动展示区（title 上方）
 * 始终展示最近 10 个活动（含已结束），横向滚动
 */
function LatestEventsStrip() {
  const events = useMemo(() => {
    return getEventsWithTimeAgo()
      .sort((a, b) => new Date(b.createDate).getTime() - new Date(a.createDate).getTime())
      .slice(0, 10);
  }, []);

  if (events.length === 0) return null;

  return (
    <section className="mt-10 w-full">
      <div className="flex gap-4 overflow-x-auto pb-3 snap-x">
        {events.map((event) => (
          <a
            key={event.id}
            href={event.href}
            target={event.href.startsWith("http") ? "_blank" : undefined}
            rel="noopener noreferrer"
            className="group shrink-0 w-72 snap-start no-underline"
          >
            <div className="relative overflow-hidden aspect-[16/9] bg-surface-2">
              <img
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                src={event.src}
                alt={event.alt}
                loading="lazy"
                decoding="async"
              />
              <div className="absolute top-2 right-2">
                <EventStatusBadge event={event} />
              </div>
            </div>
            <h3 className="m-0 mt-2 font-semibold text-ink text-sm truncate">
              {event.title}
            </h3>
            <p className="m-0 mt-0.5 text-xs text-ink-3 truncate">
              {getCategoryTranslation(event.category)} · {event.timeAgo}
            </p>
          </a>
        ))}
      </div>
    </section>
  );
}

function CompactSearchInput({
  initS,
  onDebouncedChange,
}: {
  initS: string;
  onDebouncedChange: (value: string) => void;
}) {
  const loc = useLoc();
  const [currentValue, setCurrentValue] = useState(initS);

  useEffect(() => {
    setCurrentValue(initS);
  }, [initS]);

  return (
    <div className="relative">
      <input
        type="text"
        className="bg-surface px-4 py-2.5 pr-9 border border-line focus:border-primary rounded-lg outline-none w-36 sm:w-44 md:w-56 h-10 text-sm text-ink placeholder:text-ink-3 transition-colors"
        placeholder={initS === "" ? loc("SearchPlaceholder", "搜索...") : initS}
        value={currentValue}
        onChange={(e) => {
          setCurrentValue(e.target.value);
          onDebouncedChange(e.target.value);
        }}
        aria-label={loc("SearchPlaceholder", "搜索...")}
      />
      {currentValue !== "" && (
        <button
          className="top-1/2 right-2.5 absolute flex justify-center items-center bg-surface-2 hover:bg-line border border-line rounded-full w-5 h-5 text-ink-3 text-xs leading-none transition-colors -translate-y-1/2 cursor-pointer"
          onClick={() => {
            setCurrentValue("");
            onDebouncedChange("");
          }}
          aria-label={loc("ClearSearch", "清空搜索")}
        >
          ×
        </button>
      )}
    </div>
  );
}

/** 右上角紧凑排序选择器 */
function SortSelect({
  sortType,
  onSortChange,
}: {
  sortType: number;
  onSortChange: (value: number) => void;
}) {
  const loc = useLoc();
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const sortIcons = [Calendar, Heart, MessageCircle, Play];
  const sortOptions = [
    loc("UploadDate", "上传日期"),
    loc("LikeCount", "点赞数"),
    loc("CommentCount", "评论数"),
    loc("PlayCount", "播放数"),
  ];

  // 点击外部关闭
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center gap-1.5 bg-surface hover:bg-primary-soft px-3.5 py-2.5 border border-line hover:border-primary/40 rounded-lg h-10 text-ink-2 hover:text-primary text-xs font-medium whitespace-nowrap transition-colors duration-150 cursor-pointer"
        aria-label="sort"
      >
        {React.createElement(sortIcons[sortType ?? 0], { size: 13 })}
        <span className="hidden sm:inline">{sortOptions[sortType ?? 0]}</span>
        <ChevronDown
          size={12}
          className={`transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <div className="top-full right-0 z-30 absolute bg-surface shadow-card border border-line mt-2 py-1.5 rounded-lg min-w-[150px] overflow-hidden">
          {sortOptions.map((label, i) => (
            <button
              key={i}
              onClick={() => {
                onSortChange(i);
                setIsOpen(false);
              }}
              className={`flex items-center gap-2 px-4 py-2 w-full text-sm text-left transition-colors duration-150 ${
                (sortType ?? 0) === i
                  ? "text-primary bg-primary-soft font-semibold"
                  : "text-ink-2 hover:text-primary hover:bg-primary-soft"
              }`}
            >
              {React.createElement(sortIcons[i], { size: 14 })}
              <span>{label}</span>
            </button>
          ))}
        </div>
      )}
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
    <div className="relative w-full px-4">
      {/* 超大标题：最上方、左对齐（右侧留白给右上角控件） */}
      <motion.h2
        key={activeTab}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
        className="m-0 mb-40 font-black tracking-tight text-ink text-3xl md:text-7xl leading-none select-none text-left! pr-44 md:pr-64"
      >
        {activeTab === "all"
          ? loc("AllCharts", "全部谱面")
          : loc("RandomRecommend", "随机推荐")}
      </motion.h2>

      {/* 右上角绝对定位控件（无背景）：搜索/排序/换一批 + Tab（最右，同一行） */}
      <div className="top-0 right-0 z-20 absolute flex flex-wrap items-center justify-end gap-2">
        {activeTab === "all" ? (
          <>
            <CompactSearchInput
              initS={Search}
              onDebouncedChange={(value) => debounced(value)}
            />
            <SortSelect sortType={sortType} onSortChange={onSortChange} />
          </>
        ) : (
          <button
            onClick={refreshRandomBatch}
            className="flex items-center gap-2 bg-surface hover:bg-primary-soft px-4 py-2.5 border border-line hover:border-primary/40 rounded-lg text-ink-2 hover:text-primary text-sm font-medium transition-colors duration-150 cursor-pointer"
          >
            {loc("RefreshBatch", "换一批")}
          </button>
        )}

        {/* Tab 在最右 */}
        <div className="inline-flex bg-surface-2 p-1 border border-line rounded-full">
          <button
            className={`px-4 md:px-6 py-2 rounded-full text-sm md:text-base font-medium transition-all duration-150 cursor-pointer ${
              activeTab === "all"
                ? "bg-surface text-primary border border-line shadow-none"
                : "text-ink-3 hover:text-ink-2 border border-transparent"
            }`}
            onClick={() => setActiveTab("all")}
          >
            {loc("AllCharts", "全部谱面")}
          </button>
          <button
            className={`px-4 md:px-6 py-2 rounded-full text-sm md:text-base font-medium transition-all duration-150 cursor-pointer ${
              activeTab === "random"
                ? "bg-surface text-primary border border-line shadow-none"
                : "text-ink-3 hover:text-ink-2 border border-transparent"
            }`}
            onClick={() => setActiveTab("random")}
          >
            {loc("RandomRecommend", "随机推荐")}
          </button>
        </div>
      </div>

      {/* 内容区 */}
      <div className="mt-8 md:mt-10">
        {activeTab === "all" ? (
          <>
            <SongGrid
              url={endpoints.maichart.listSearchAndSort(
                Search,
                sortWords[sortType],
                page,
              )}
              page={page}
              setMax={setMaxpage}
            />

            <div className="flex flex-col items-center gap-6 mx-auto mt-12 px-4 w-full">
              <div className="flex items-center gap-3 p-4">
                <button
                  className={`flex items-center justify-center px-4 py-2.5 bg-surface border border-line hover:border-primary/40 rounded-lg text-ink-2 hover:text-primary font-medium text-sm cursor-pointer min-w-10 transition-colors duration-150 ${page - 1 < 0 ? "opacity-30 cursor-not-allowed" : ""}`}
                  disabled={page - 1 < 0}
                  onClick={() => {
                    setPage(page - 1);
                    window.scrollTo(0, 200);
                  }}
                  aria-label={loc("PrevPage", "上一页")}
                >
                  <ChevronLeft size={16} />
                </button>

                <div className="flex items-center gap-2 px-2">
                  <span className="text-ink-3 text-sm">
                    {loc("PageOf", "第")}
                  </span>
                  <span className="font-semibold text-ink text-sm">
                    {page + 1}
                  </span>
                  <span className="text-ink-3 text-sm">
                    / {Math.max(maxpage + 1, 1)}
                  </span>
                  <span className="text-ink-3 text-sm">
                    {loc("Page", "页")}
                  </span>
                </div>

                <button
                  className={`flex items-center justify-center px-4 py-2.5 bg-surface border border-line hover:border-primary/40 rounded-lg text-ink-2 hover:text-primary font-medium text-sm cursor-pointer min-w-10 transition-colors duration-150 ${page >= maxpage ? "opacity-30 cursor-not-allowed" : ""}`}
                  disabled={page >= maxpage}
                  onClick={() => {
                    setPage(page + 1);
                    window.scrollTo(0, 200);
                  }}
                  aria-label={loc("NextPage", "下一页")}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
              <IntegratedDownloadTypeSelector />
            </div>
          </>
        ) : (
          <>
            <RandomRecommendList refreshKey={randomSeed} />

            <div className="flex justify-center mt-12 px-4">
              <IntegratedDownloadTypeSelector />
            </div>
          </>
        )}
      </div>
    </div>
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
    <div className="gap-x-6 gap-y-12 grid grid-cols-12 w-full">
      {randomSongs.map((song, index) => (
        <SongMosaicCard key={song.id} song={song} index={index} page={0} />
      ))}
    </div>
  );
}

/**
 * 谱面马赛克卡片（全部谱面与随机推荐共用）
 * 布局：每 7 张一组——前 3 张一行（宽度随机组合，span 3~6，最小 25%）、后 4 张一行（span 3 等宽）
 */
// 3 卡行的随机宽度组合（每行和 = 12 列）
const THREE_CARD_ROWS: number[][] = [
  [4, 4, 4],
  [5, 4, 3],
  [6, 3, 3],
  [3, 5, 4],
  [4, 3, 5],
  [3, 6, 3],
  [5, 3, 4],
  [3, 4, 5],
];

// Tailwind 需要静态类名
const COL_CLASS: Record<number, string> = {
  3: "col-span-12 md:col-span-3",
  4: "col-span-12 md:col-span-4",
  5: "col-span-12 md:col-span-5",
  6: "col-span-12 md:col-span-6",
};

/** 按索引确定每张卡的列跨度（确定性伪随机） */
function spanOf(index: number): number {
  const group = Math.floor(index / 7);
  const pos = index % 7;
  if (pos < 3) {
    const combo = THREE_CARD_ROWS[group % THREE_CARD_ROWS.length];
    return combo[pos];
  }
  return 3; // 4 卡行：3/3/3/3 等宽
}

function SongMosaicCard({ song, index, page = 0 }: { song: Song; index: number; page?: number }) {
  const colClass = COL_CLASS[spanOf(index)];
  const aspect = "aspect-[8/3]";

  return (
    <motion.div
      className={colClass}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.45, delay: (index % 5) * 0.05, ease: [0.25, 0.1, 0.25, 1] }}
    >
      <Link
        to={"/song?id=" + song.id}
        className="group block no-underline"
        onClick={() => {
          localStorage.setItem("lastclickid", song.id);
          localStorage.setItem("lastclickpage", page.toString());
        }}
      >
        {/* 直角大图 + hover 叠加符号（mix-blend 反色） */}
        <div className={`relative overflow-hidden ${aspect}`}>
          <img
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.05]"
            src={endpoints.maichart.image(song.id)}
            alt={stripTmpTags(song.title)}
            loading="lazy"
            decoding="async"
          />
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <span className="text-5xl md:text-6xl font-light text-white mix-blend-difference select-none">
              +
            </span>
          </div>
          {/* 难度徽章（叠加在图片右上角，无圆角无间距） */}
          <div className="absolute top-3 right-3 z-10 flex flex-wrap items-center max-w-[60%]">
            <Levels levels={song.levels} songid={song.id} isPlayer={false} />
          </div>
          {/* 下载按钮（透明背景） */}
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              downloadSong({ id: song.id, title: stripTmpTags(song.title), toast });
            }}
            className="absolute bottom-3 right-3 z-10 flex items-center justify-center rounded-full w-12 h-12 text-white cursor-pointer transition-all duration-150 hover:text-primary hover:bg-white/15"
            aria-label="download"
          >
            <Download size={20} />
          </button>
        </div>

        {/* 信息区：标题 + 分类 + 互动 */}
        <div className="flex items-start justify-between gap-3 mt-3">
          <h3 className="m-0 font-semibold text-ink text-base md:text-lg truncate leading-snug">
            {stripTmpTags(song.title)}
          </h3>
          <span className="shrink-0 w-0 h-0.5 mt-2 bg-primary transition-all duration-300 group-hover:w-8" />
        </div>
        <p className="m-0 mt-1 text-xs text-ink-3 truncate">
          {song.artist === "" || song.artist == null ? "-" : song.artist} · {song.uploader}
        </p>
        <div className="mt-3">
          <InteractCount songid={song.id} />
        </div>
      </Link>
    </motion.div>
  );
}

/**
 * 全部谱面网格（与随机推荐统一为马赛克样式，仅用于主页「全部谱面」Tab）
 */
function SongGrid({ url, page, setMax }: { url: string; page: number; setMax: (n: number) => void }) {
  const loc = useLoc();

  const fetcher = (u: string) =>
    fetch(u, { mode: "cors", credentials: "include" }).then((res) => res.json());

  const { data, error, isLoading } = useSWR<Song[]>(url, fetcher, {
    revalidateOnFocus: false,
  });

  if (error) {
    return (
      <div className="m-auto w-full py-16 text-center text-ink-2 text-lg">
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

  if (data && data.length < 30 && data.length > 0) {
    setMax(page);
  }

  if (!data || !Array.isArray(data) || data.length === 0) {
    return (
      <div className="m-auto w-full py-16 text-center text-ink-2 text-lg">
        {loc("EmptyData", "暂无数据")}
      </div>
    );
  }

  return (
    <div className="gap-x-6 gap-y-12 grid grid-cols-12 w-full">
      {data.map((song, index) => (
        <SongMosaicCard key={song.id} song={song} index={index} page={page} />
      ))}
    </div>
  );
}

function IntegratedDownloadTypeSelector() {
  const [currentType, setCurrentType] = useState(() => {
    return localStorage.getItem("DownloadType") || "zip";
  });
  const [, setJustChanged] = useState(false);

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="flex bg-surface-2 border border-line rounded-full p-1">
        <button
          onClick={() => {
            localStorage.setItem("DownloadType", "zip");
            setCurrentType("zip");
            setJustChanged(true);
            setTimeout(() => setJustChanged(false), 2000);
          }}
          className={`px-4 md:px-5 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-all duration-150 cursor-pointer ${
            currentType === "zip"
              ? "bg-surface text-primary border border-line shadow-none"
              : "text-ink-3 hover:text-ink-2 border border-transparent"
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
          className={`px-4 md:px-5 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-all duration-150 cursor-pointer ${
            currentType === "adx"
              ? "bg-surface text-primary border border-line shadow-none"
              : "text-ink-3 hover:text-ink-2 border border-transparent"
          }`}
        >
          ADX
        </button>
      </div>
    </div>
  );
}
