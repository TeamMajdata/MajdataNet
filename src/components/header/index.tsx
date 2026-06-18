import { Link } from "react-router-dom";
import { useUserContext } from "@/hooks";
import { LoadingSpinner } from "@/components";
import MajdataLogo from "./MajdataLogo";
import DesktopNav from "./DesktopNav";
import MobileNav from "./MobileNav";
import UserMenu from "./UserMenu";
import AuthSection from "./AuthSection";

/**
 * 统一顶部导航栏组件
 * 包含Logo、导航菜单、用户下拉菜单、登录/注册
 */
export default function UnifiedHeader() {
  const { user, isLoading, error } = useUserContext();
  const username = user?.username || "";
  const isLoggedIn = !!username && !error;

  return (
    <>
      {/* 移动端：顶部横条 */}
      <header className="xl:hidden top-0 left-0 right-0 z-1000 fixed px-3 py-3 items-center">
        <div className="flex items-center justify-between h-12 bg-[rgb(255_255_255/70%)] backdrop-blur-[20px] shadow-xl border border-black/8 rounded-2xl px-3">
          <Link to="/" className="flex items-center shrink-0">
            <img
              className="rounded-[5px] w-8 h-8"
              src="../../../salt.webp"
              alt="xxlb"
            />
          </Link>
          <div className="flex items-center gap-2">
            {isLoading ? (
              <LoadingSpinner className="animate-pulse" size={20} />
            ) : isLoggedIn ? (
              <UserMenu username={username} />
            ) : (
              <AuthSection />
            )}
            <MobileNav />
          </div>
        </div>
      </header>

      {/* 桌面端：左侧竖栏 */}
      <header className="hidden xl:block left-0 top-0 bottom-0 z-1000 fixed">
        <div className="relative flex flex-col h-full gap-1 px-3 py-4">
          {/* 背景 SVG */}
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            viewBox="0 0 100 1024"
            preserveAspectRatio="none"
          >
            <path d="M0 0L99.5 1024L0 1024L0 0Z" fill="#5C8DC1" opacity="1" />
          </svg>
          {/* Logo */}
          <div className="flex justify-center mb-2">
            <MajdataLogo />
          </div>

          {/* Navigation */}
          <DesktopNav />

          {/* Spacer */}
          <div className="flex-1" />

          {/* User Section */}
          <div className="flex justify-center">
            {isLoading ? (
              <div className="flex items-center gap-2 no-underline transition-all duration-200 cursor-default pointer-events-none">
                <LoadingSpinner className="animate-pulse" size={20} />
              </div>
            ) : isLoggedIn ? (
              <UserMenu username={username} />
            ) : (
              <AuthSection />
            )}
          </div>
        </div>
      </header>
    </>
  );
}
