import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useUserContext } from '@/hooks';
import { LoadingSpinner } from '@/components';
import MajdataLogo from './MajdataLogo';
import Navigation from './Navigation';
import UserMenu from './UserMenu';
import AuthSection from './AuthSection';

/**
 * 统一顶部导航栏组件
 * 包含Logo、导航菜单、用户下拉菜单、登录/注册
 */
export default function UnifiedHeader() {
  const { t } = useTranslation();
  const { user, isLoading, error } = useUserContext();
  const username = user?.username || '';
  const isLoggedIn = !!username && !error;

  return (
    <header className="top-0 right-0 left-0 z-1000 fixed bg-[rgb(9_11_17/72%)] backdrop-blur-xl backdrop-saturate-150 pt-[env(safe-area-inset-top)] border-white/[0.07] border-b">
      <div className="flex justify-between items-center gap-4 mx-auto px-3 sm:px-6 lg:px-8 max-w-350 h-(--header-height)">
        {/* 左侧区域：Logo + 导航 */}
        <div className="flex flex-1 items-center gap-5 2xl:gap-7">
          {/* Logo Section */}
          <div className="hidden md:flex items-center shrink-0">
            <Link to="/" className="flex items-center no-underline">
              <MajdataLogo />
            </Link>
          </div>

          {/* Main Navigation */}
          <Navigation />
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
              <span className="hidden md:inline text-sm">{t("shared/header.Loading")}</span>
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
