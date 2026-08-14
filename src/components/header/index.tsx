import { useState } from "react";
import { Link } from "react-router-dom";
import { useUserContext } from "@/hooks";
import { LoadingSpinner } from "@/components";
import FullScreenMenu from "./FullScreenMenu";
import UserMenu from "./UserMenu";
import AuthSection from "./AuthSection";

/**
 * 统一顶栏（Studio Freight 风格）：极简顶栏 + 全屏覆盖菜单
 */
export default function UnifiedHeader() {
  const { user, isLoading, error } = useUserContext();
  const username = user?.username || "";
  const isLoggedIn = !!username && !error;
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <>
      {/* 顶栏：品牌 + 用户区 + 菜单按钮（透明背景） */}
      <header className="fixed top-0 left-0 right-0 z-1000 bg-transparent">
        <div className="flex items-center justify-between h-16 px-5 md:px-10">
          <Link to="/" className="flex items-center gap-2.5 shrink-0 no-underline group">
            <img
              className="rounded-[5px] w-8 h-8 border border-line transition-transform duration-200 group-hover:scale-105"
              src="../../../salt.webp"
              alt="xxlb"
            />
            <span className="font-black tracking-tight text-ink text-lg">
              MAJDATA<span className="text-ink-3">.NET</span>
            </span>
          </Link>

          <div className="flex items-center gap-3 md:gap-5">
            {isLoading ? (
              <LoadingSpinner className="animate-pulse" size={20} />
            ) : isLoggedIn ? (
              <UserMenu username={username} />
            ) : (
              <AuthSection />
            )}
            <button
              onClick={() => setIsMenuOpen(true)}
              className="flex items-center gap-2 text-ink-2 hover:text-primary text-sm font-semibold tracking-widest cursor-pointer bg-none border-none transition-colors duration-150"
              aria-label="open menu"
            >
              <span className="flex flex-col gap-1">
                <span className="block w-5 h-0.5 bg-current" />
                <span className="block w-5 h-0.5 bg-current" />
              </span>
              <span className="hidden sm:inline">MENU</span>
            </button>
          </div>
        </div>
      </header>

      {/* 全屏覆盖菜单 */}
      <FullScreenMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
    </>
  );
}
