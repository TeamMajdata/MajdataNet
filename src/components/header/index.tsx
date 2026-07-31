import { Link } from 'react-router-dom';
import { useLoc, useUserContext } from '@/hooks';
import { LoadingSpinner } from '@/components';
import MajdataLogo from './MajdataLogo';
import DesktopNav from './DesktopNav';
import MobileNav from './MobileNav';
import UserMenu from './UserMenu';
import AuthSection from './AuthSection';

/**
 * 统一顶部导航栏组件
 * 包含Logo、导航菜单、用户下拉菜单、登录/注册
 */
export default function UnifiedHeader() {
  const loc = useLoc();
  const { user, isLoading, error } = useUserContext();
  const username = user?.username || '';
  const isLoggedIn = !!username && !error;

  return (
    <header className="top-0 before:top-0 right-0 before:right-0 left-0 before:left-0 z-1000 fixed before:absolute bg-[rgb(8_10_15/30%)] before:bg-linear-to-r before:from-transparent before:via-[rgb(59_130_246/60%)] before:to-transparent before:opacity-60 shadow-[0_8px_40px_rgb(0_0_0/25%),0_2px_0_rgb(255_255_255/8%)_inset,0_4px_16px_rgb(59_130_246/8%)] backdrop-blur-[28px] backdrop-brightness-120 backdrop-saturate-180 pt-[env(safe-area-inset-top)] border-white/12 border-b before:h-px before:content-['']">
      <div className="flex justify-between items-center mx-auto my-2 md:my-4 px-3 sm:px-6 lg:px-10 max-w-350 h-12 md:h-16">
        {/* 左侧区域：Logo + 导航 */}
        <div className="flex flex-1 items-center gap-8">
          {/* Logo Section */}
          <div className="hidden md:flex items-center shrink-0">
            <Link to="/" className="flex items-center no-underline">
              <MajdataLogo />
            </Link>
          </div>

          {/* Main Navigation */}
          <DesktopNav />
          <MobileNav />
        </div>

        {/* 移动端中间Logo */}
        <div className="md:hidden left-1/2 absolute flex items-center h-8 -translate-x-1/2">
          <Link to="/" className="flex items-center">
            <img className="rounded-[7px] w-8 h-8" src="/salt.webp" alt="Majdata Net" />
          </Link>
        </div>

        {/* User Section */}
        <div className="relative flex items-center rounded-[10px] shrink-0">
          {isLoading ? (
            <div className="flex items-center gap-2 opacity-70 px-3 md:px-4 py-2 md:py-3 border border-white/10 rounded-[10px] h-10 md:min-h-10 font-medium text-white/85 text-sm no-underline transition-all duration-200 cursor-default pointer-events-none">
              <LoadingSpinner className="animate-pulse" size={25} />
              <span className="hidden md:inline text-sm">{loc('Loading')}</span>
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
