import { Link } from "react-router-dom";
import { useLoc, useUserContext } from "@/hooks";
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
  const loc = useLoc();
  const { user, isLoading, error } = useUserContext();
  const username = user?.username || "";
  const isLoggedIn = !!username && !error;

  return (
    <header className="m-4 top-0 right-0 left-0 z-1000 fixed">
      <div className="flex justify-between items-center gap-3 mx-auto max-w-350 h-12 md:h-16">
        {/* 左侧区域：Logo + 导航 */}
        <div className="flex items-center bg-[rgb(255_255_255/70%)] backdrop-blur-[28px] shadow-[0_8px_40px_rgb(0_0_0/8%),0_2px_0_rgb(255_255_255/50%)_inset,0_4px_16px_rgb(92_141_193/15%)] border border-black/8 rounded-full pl-4 pr-2">
          {/* Logo Section */}
          <div className="hidden md:flex items-center shrink-0">
            <MajdataLogo />
          </div>

          {/* Main Navigation */}
          <DesktopNav />
          <MobileNav />
        </div>

        {/* 移动端中间Logo */}
        <div className="md:hidden left-1/2 absolute flex items-center h-8 -translate-x-1/2">
          <Link to="/" className="flex items-center">
            <img
              className="rounded-[5px] w-8 h-8"
              src="../../../salt.webp"
              alt="xxlb"
            />
          </Link>
        </div>

        {/* User Section */}
        <div className="relative flex items-center bg-[rgb(255_255_255/70%)] backdrop-blur-[28px] shadow-[0_8px_40px_rgb(0_0_0/8%),0_2px_0_rgb(255_255_255/50%)_inset,0_4px_16px_rgb(92_141_193/15%)] border border-black/8 rounded-full shrink-0 py-3 pl-4 pr-4">
          {isLoading ? (
            <div className="flex items-center gap-2 opacity-70 px-3 md:px-4 py-2 md:py-3 rounded-[10px] h-10 md:min-h-10 font-medium text-gray-500 text-sm no-underline transition-all duration-200 hover:scale-105 active:scale-95 cursor-default pointer-events-none">
              <LoadingSpinner className="animate-pulse" size={25} />
              <span className="hidden md:inline text-sm">{loc("Loading")}</span>
            </div>
          ) : isLoggedIn ? (
            <UserMenu username={username} />
          ) : (
            <AuthSection />
          )}
        </div>
      </div>
    </header>
  );
}
