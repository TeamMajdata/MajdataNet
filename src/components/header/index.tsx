import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useUserContext } from '@/hooks';
import { LoadingSpinner } from '@/components';
import MajdataLogo from './MajdataLogo';
import Navigation from './Navigation';
import UserMenu from './UserMenu';
import AuthSection from './AuthSection';
import LanguageMenu from './LanguageMenu';
import HeaderSearch from './HeaderSearch';

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
      <div className="flex justify-between items-center gap-4 mx-auto px-3 sm:px-4 max-w-320 h-(--header-height)">
        {/* 左侧区域：Logo + 导航 */}
        <div className="flex flex-1 items-center gap-6 2xl:gap-8 min-w-0">
          {/* Logo Section */}
          <div className="hidden md:flex items-center shrink-0">
            <Link to="/" className="flex items-center rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/70 no-underline">
              <MajdataLogo />
            </Link>
          </div>

          {/* Main Navigation */}
          <Navigation />
          {/* 手机上搜索按钮放在菜单按钮旁边：右边已经有语言和头像，再放会挤到中间的 Logo */}
          <div className="md:hidden"><HeaderSearch /></div>
        </div>

        {/* 移动端中间Logo */}
        <div className="md:hidden left-1/2 absolute flex items-center h-8 -translate-x-1/2">
          <Link to="/" className="flex items-center">
            <MajdataLogo compact />
          </Link>
        </div>

        {/* Language + User Section */}
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="hidden md:block"><HeaderSearch /></div>
          <LanguageMenu />
          <div className="relative flex items-center">
            {isLoading ? (
              <div className="flex items-center gap-2 opacity-70 px-3 h-9 font-medium text-white/70 text-sm pointer-events-none">
                <LoadingSpinner className="animate-pulse" size={20} />
                <span className="hidden md:inline text-sm">{t("shared/header.Loading")}</span>
              </div>
            ) : isLoggedIn ? (
              <UserMenu username={username} />
            ) : (
              <AuthSection />
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
