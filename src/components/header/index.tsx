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
    <header className="left-0 top-0 bottom-0 z-1000 fixed p-4">
      <div className="flex flex-col h-full gap-1 bg-[rgb(255_255_255/70%)] shadow-xl rounded-full px-3 py-4">
        {/* Logo */}
        <div className="flex justify-center mb-2">
          <MajdataLogo />
        </div>

        {/* 移动端Logo */}
        <div className="md:hidden flex justify-center mb-2">
          <Link to="/" className="flex items-center">
            <img
              className="rounded-[5px] w-8 h-8"
              src="../../../salt.webp"
              alt="xxlb"
            />
          </Link>
        </div>

        {/* Navigation */}
        <DesktopNav />
        <MobileNav />

        {/* Spacer */}
        <div className="flex-1" />

        {/* User Section */}
        <div className="flex justify-center">
          {isLoading ? (
            <div className="flex items-center gap-2 opacity-70 px-3 py-2 rounded-[10px] font-medium text-gray-500 text-sm no-underline transition-all duration-200 cursor-default pointer-events-none">
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
  );
}
