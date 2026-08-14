import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, LogOut } from "lucide-react";
import { useLoc, useUserContext } from "@/hooks";
import { handleLogout as logoutUtil } from "@/utils";
import { endpoints } from "@/config/api";
import { getCurrentLanguage } from "@/utils/i18n";

interface FullScreenMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

interface MenuGroup {
  index: string;
  title: string;
  en?: string;
  to?: string;
  external?: boolean;
  subs?: { label: string; to: string }[];
}

/**
 * 英文线框底字：透明填充 + 上下渐变主题色描边（SVG，支持渐变 stroke）
 */
function EnOutlineText({ text }: { text: string }) {
  const gradId = `menu-en-stroke-${text.replace(/[^a-zA-Z]/g, '')}`;
  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute left-0 top-0 overflow-visible"
      width="900"
      height="90"
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(92, 141, 193, 0.3)" />
          <stop offset="100%" stopColor="rgba(211, 228, 244, 0.3)" />
        </linearGradient>
      </defs>
      <text
        x="0"
        y="0.85em"
        fill="none"
        stroke={`url(#${gradId})`}
        strokeWidth="1.5"
        className="font-sans font-black tracking-tight whitespace-nowrap text-[2.4rem] md:text-[4.2rem] leading-none"
      >
        {text}
      </text>
    </svg>
  );
}

/**
 * 全屏覆盖菜单（白底 + 深色文字，超大排版）
 * 替代桌面侧栏导航与移动汉堡菜单
 */
export default function FullScreenMenu({ isOpen, onClose }: FullScreenMenuProps) {
  const loc = useLoc();
  const { pathname } = useLocation();
  const { user, isLoading } = useUserContext();
  const username = user?.username || "";
  const isLoggedIn = !!username;

  const groups: MenuGroup[] = [
    {
      index: "01",
      title: loc("NavHome", "Home"),
      en: "Home",
      to: "/",
    },
    {
      index: "02",
      title: loc("Rankings", "Rankings"),
      en: "Rankings",
      subs: [
        { label: loc("Recommend", "Recommend"), to: "/ranking" },
        { label: loc("UserRankingTitle", "User Ranking"), to: "/ranking/user" },
        { label: loc("MMFCRanking", "MMFC"), to: "/ranking/mmfc" },
      ],
    },
    {
      index: "03",
      title: loc("Tools", "Tools"),
      en: "Tools",
      subs: [
        { label: loc("ChartEditor", "Chart Editor"), to: "/edit" },
        { label: "MajdataPlay", to: "/play" },
      ],
    },
    {
      index: "04",
      title: loc("CollectionHiroba", "Collections"),
      en: "Collections",
      to: "/collection/hiroba",
    },
    {
      index: "05",
      title: loc("Contest", "Events"),
      en: "Events",
      to: "/chart-events",
    },
    {
      index: "06",
      title: loc("OriginalSongs", "Original"),
      en: "Original",
      to: "/eventTag?id=Original",
    },
    {
      index: "07",
      title: loc("Docs", "Docs"),
      en: "Docs",
      external: true,
      to: "https://docs.majdata.net",
    },
  ];

  // 非英语时在超大标题底下叠加英文线框字
  const isEnglish = getCurrentLanguage() === "en";

  const handleLogout = async () => {
    await logoutUtil(
      () => {
        onClose();
        window.location.href = "/";
      },
      () => {
        onClose();
        window.location.href = "/";
      },
    );
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
          className="fixed inset-0 z-[1200] text-ink flex flex-col overflow-y-auto"
          style={{ background: 'linear-gradient(to right, var(--surface) 0%, var(--surface) 45%, transparent 100%)' }}
        >
          {/* 顶部条 */}
          <div className="flex items-center justify-between px-6 md:px-12 py-5">
            <Link
              to="/"
              onClick={onClose}
              className="flex items-center gap-2.5 no-underline"
            >
              <img
                className="rounded-[5px] w-9 h-9 border border-line"
                src="../../../salt.webp"
                alt="xxlb"
              />
              <span className="font-black tracking-tight text-ink text-lg">
                MAJDATA<span className="text-ink-3">.NET</span>
              </span>
            </Link>
            <button
              onClick={onClose}
              className="flex items-center gap-2 text-ink-2 hover:text-primary text-sm font-medium transition-colors duration-150 cursor-pointer bg-none border-none"
              aria-label="close menu"
            >
              <X size={20} />
              <span className="hidden sm:inline">{loc("CloseMenu", "CLOSE")}</span>
            </button>
          </div>

          {/* 顶部右侧白色渐变条 */}
          <div
            aria-hidden="true"
            className="top-0 -z-2 right-0 absolute w-full h-20 pointer-events-none"
            style={{ background: 'linear-gradient(to left, var(--surface) 0%, transparent 100%)' }}
          />

          {/* 超大文字导航 */}
          <nav className="flex-1 flex flex-col justify-center px-6 md:px-12 py-8 gap-2 md:gap-3">
            {groups.map((g, i) => (
              <motion.div
                key={g.index}
                initial={{ opacity: 0, y: 32 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 16 }}
                transition={{ duration: 0.4, delay: 0.08 + i * 0.05, ease: [0.25, 0.1, 0.25, 1] }}
                className="group flex flex-wrap items-baseline gap-x-6 gap-y-1"
              >
                <span className="font-mono text-xs md:text-sm text-ink-3 shrink-0 w-7">
                  {g.index}
                </span>
                {g.external ? (
                  <a
                    href={g.to}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={onClose}
                    className="relative inline-block text-[2.4rem] md:text-[4.2rem] leading-none font-black text-ink-2 hover:text-primary tracking-tight no-underline transition-all duration-200"
                  >
                    {!isEnglish && g.en && (
                      <span aria-hidden="true" className="absolute left-0 top-0 pointer-events-none select-none">
                        <EnOutlineText text={g.en} />
                      </span>
                    )}
                    <span className="relative z-10">{g.title}</span>
                  </a>
                ) : g.subs ? (
                  <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
                    <span className="relative inline-block text-[2.4rem] md:text-[4.2rem] leading-none font-black text-ink-2 group-hover:text-primary tracking-tight transition-all duration-200">
                      {!isEnglish && g.en && (
                        <span aria-hidden="true" className="absolute left-0 top-0 pointer-events-none select-none">
                          <EnOutlineText text={g.en} />
                        </span>
                      )}
                      <span className="relative z-10">{g.title}</span>
                    </span>
                    <div className="flex flex-col gap-0.5">
                      {g.subs.map((s) => (
                        <Link
                          key={s.to}
                          to={s.to}
                          onClick={onClose}
                          className={`text-sm md:text-base no-underline transition-colors duration-150 ${
                            pathname === s.to
                              ? "text-primary font-semibold"
                              : "text-ink-3 hover:text-primary"
                          }`}
                        >
                          {s.label}
                        </Link>
                      ))}
                    </div>
                  </div>
                ) : (
                  <Link
                    to={g.to!}
                    onClick={onClose}
                    className={`relative inline-block text-[2.4rem] md:text-[4.2rem] leading-none font-black tracking-tight no-underline transition-all duration-200 ${
                      pathname === g.to
                        ? "text-primary"
                        : "text-ink-2 hover:text-primary"
                    }`}
                  >
                    {!isEnglish && g.en && (
                      <span aria-hidden="true" className="absolute left-0 top-0 pointer-events-none select-none">
                        <EnOutlineText text={g.en} />
                      </span>
                    )}
                    <span className="relative z-10">{g.title}</span>
                  </Link>
                )}
              </motion.div>
            ))}
          </nav>

          {/* 底部：用户操作 + 链接 */}
          <div className="px-6 md:px-12 py-6 border-t border-line">
            <div className="flex flex-wrap items-center justify-between gap-4">
              {isLoading ? null : isLoggedIn ? (
                <div className="flex items-center gap-4">
                  <img
                    className="w-9 h-9 rounded-full object-cover border border-line"
                    src={endpoints.account.icon(username)}
                    alt={username}
                  />
                  <Link
                    to={`/space?id=${username}`}
                    onClick={onClose}
                    className="font-semibold text-ink hover:text-primary no-underline transition-colors"
                  >
                    {username}
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-1.5 text-ink-3 hover:text-danger text-sm transition-colors cursor-pointer bg-none border-none"
                  >
                    <LogOut size={14} />
                    {loc("Logout", "Logout")}
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-5 text-sm">
                  <Link
                    to="/login"
                    onClick={onClose}
                    className="text-ink-2 hover:text-primary no-underline transition-colors"
                  >
                    {loc("Login", "Login")}
                  </Link>
                  <Link
                    to="/register"
                    onClick={onClose}
                    className="text-ink-2 hover:text-primary no-underline transition-colors"
                  >
                    {loc("Register", "Register")}
                  </Link>
                </div>
              )}
              <div className="flex items-center gap-5 text-sm">
                <a
                  href="https://github.com/TeamMajdata/MajdataNet"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-ink-3 hover:text-primary no-underline transition-colors"
                >
                  GitHub
                </a>
                <a
                  href="https://discord.gg/AcWgZN7j6K"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-ink-3 hover:text-primary no-underline transition-colors"
                >
                  Discord
                </a>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
