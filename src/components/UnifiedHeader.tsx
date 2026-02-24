import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLoc, useUser } from '@/hooks';
import MajdataLogo from './MajdataLogo';
import { handleLogout as logoutUtil } from '@/utils';
import { apiroot3 } from '@/config/api';
import { AiOutlineLoading3Quarters, AiOutlineUser } from 'react-icons/ai';

/**
 * 统一顶部导航栏组件
 * 包含Logo、导航菜单、用户下拉菜单、登录/注册
 */
export default function UnifiedHeader() {
  const loc = useLoc();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isMainNavOpen, setIsMainNavOpen] = useState(false);
  const [isMobileAuthMenuOpen, setIsMobileAuthMenuOpen] = useState(false);
  const [isRankingsMenuOpen, setIsRankingsMenuOpen] = useState(false);
  const [isMobileRankingsOpen, setIsMobileRankingsOpen] = useState(false);

  const userMenuRef = useRef<HTMLDivElement>(null);
  const mainNavRef = useRef<HTMLElement>(null);
  const mobileAuthMenuRef = useRef<HTMLDivElement>(null);
  const rankingsMenuRef = useRef<HTMLDivElement>(null);

  const { user, isLoading, error } = useUser();
  const username = user?.username || '';
  const isLoggedIn = !!username && !error;

  // 点击外部关闭菜单
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
      if (mainNavRef.current && !mainNavRef.current.contains(event.target as Node)) {
        setIsMainNavOpen(false);
        setIsMobileRankingsOpen(false); // 主菜单关闭时，同时关闭子菜单
      }
      if (mobileAuthMenuRef.current && !mobileAuthMenuRef.current.contains(event.target as Node)) {
        setIsMobileAuthMenuOpen(false);
      }
      if (rankingsMenuRef.current && !rankingsMenuRef.current.contains(event.target as Node)) {
        setIsRankingsMenuOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogout = async () => {
    await logoutUtil(
      () => {
        setIsUserMenuOpen(false);
        window.location.href = '/'; // 登出后跳转首页
      },
      (error) => {
        console.error(loc('LogoutFailed'), error);
        setIsUserMenuOpen(false);
        window.location.href = '/'; // 即使失败也跳转首页
      }
    );
  };

  return (
    <header className="top-0 before:top-0 right-0 before:right-0 left-0 before:left-0 z-1000 fixed before:absolute bg-[rgb(8_10_15/30%)] before:bg-linear-to-r before:from-transparent before:via-[rgb(59_130_246/60%)] before:to-transparent before:opacity-60 shadow-[0_8px_40px_rgb(0_0_0/25%),0_2px_0_rgb(255_255_255/8%)_inset,0_4px_16px_rgb(59_130_246/8%)] backdrop-blur-[28px] brightness-110 saturate-180 border-white/12 border-b before:h-px before:content-['']">
      <div className="flex justify-between items-center mx-auto my-4 px-10 max-w-350 h-16">
        {/* 左侧区域：Logo + 导航 */}
        <div className="flex flex-1 items-center gap-8">
          {/* Logo Section */}
          <div className="hidden md:flex items-center shrink-0">
            <Link to="/" className="flex items-center no-underline">
              <MajdataLogo />
            </Link>
          </div>

          {/* Main Navigation */}
          <nav className="flex justify-start items-center m-0" ref={mainNavRef}>
            {/* 桌面端：完整导航 */}
            <div className="hidden xl:flex items-center gap-2 bg-white/5 p-2 border border-white/8 rounded-xl">
              {/* 榜单下拉菜单 */}
              <div className="inline-block relative" ref={rankingsMenuRef}>
                <button
                  className={`flex items-center gap-2 px-5 py-3 text-white/85 no-underline rounded-lg transition-all duration-200 font-medium text-sm whitespace-nowrap relative bg-none border-none cursor-pointer ${isRankingsMenuOpen ? 'bg-linear-to-br from-white/12 to-white/8 text-white -translate-y-px shadow-[0_4px_12px_rgb(255_255_255/10%),0_1px_0_rgb(255_255_255/10%)_inset]' : 'hover:bg-linear-to-br hover:from-white/12 hover:to-white/8 hover:text-white hover:-translate-y-px hover:shadow-[0_4px_12px_rgb(255_255_255/10%),0_1px_0_rgb(255_255_255/10%)_inset]'}`}
                  onClick={() => setIsRankingsMenuOpen(!isRankingsMenuOpen)}
                >
                  <span className="text-sm">{loc('Rankings')}</span>
                  <span className={`transition-transform duration-300 text-[#a0a0a0] text-[0.7rem] ${isRankingsMenuOpen ? 'rotate-180' : ''}`}>
                    ▼
                  </span>
                </button>

                {isRankingsMenuOpen && (
                  <div className="top-[calc(100%+0.75rem)] left-0 z-1001 absolute bg-linear-to-br from-[rgb(15_15_20/95%)] [@keyframes_dropdownFadeIn]:from-blur to-[rgb(10_12_18/98%)] [@keyframes_dropdownFadeIn]:from-opacity-0 shadow-[0_20px_60px_rgb(0_0_0/50%),0_4px_20px_rgb(59_130_246/10%),0_1px_0_rgb(255_255_255/10%)_inset] backdrop-blur-xl saturate-180 border border-white/15 rounded-2xl min-w-50 overflow-hidden [@keyframes_dropdownFadeIn]:from-scale-95 [@keyframes_dropdownFadeIn]:from-translate-y-[-15px] animate-[dropdownFadeIn_0.3s_cubic-bezier(0.4,0,0.2,1)] [animation-name:dropdownFadeIn]">
                    <Link to="/ranking" className="flex justify-center items-center gap-3 hover:bg-linear-to-br hover:from-white/12 hover:to-white/8 hover:shadow-[0_2px_8px_rgb(255_255_255/10%),0_1px_0_rgb(255_255_255/10%)_inset] px-5 py-4 font-medium text-[#e5e5e5] hover:text-white text-sm text-center no-underline transition-all hover:translate-x-1 duration-200">
                      <span className="text-sm">{loc('Recommend')}</span>
                    </Link>
                    <Link to="/user-ranking" className="flex justify-center items-center gap-3 hover:bg-linear-to-br hover:from-white/12 hover:to-white/8 hover:shadow-[0_2px_8px_rgb(255_255_255/10%),0_1px_0_rgb(255_255_255/10%)_inset] px-5 py-4 font-medium text-[#e5e5e5] hover:text-white text-sm text-center no-underline transition-all hover:translate-x-1 duration-200">
                      <span className="text-sm">{loc('UserRankingTitle')}</span>
                    </Link>
                    <Link to="/mmfc-ranking" className="flex justify-center items-center gap-3 hover:bg-linear-to-br hover:from-white/12 hover:to-white/8 hover:shadow-[0_2px_8px_rgb(255_255_255/10%),0_1px_0_rgb(255_255_255/10%)_inset] px-5 py-4 font-medium text-[#e5e5e5] hover:text-white text-sm text-center no-underline transition-all hover:translate-x-1 duration-200">
                      <span className="text-sm">{loc('MMFCRanking')}</span>
                    </Link>
                  </div>
                )}
              </div>

              <Link to="/edit" className="relative flex items-center gap-2 hover:bg-linear-to-br hover:from-white/12 hover:to-white/8 hover:shadow-[0_4px_12px_rgb(255_255_255/10%),0_1px_0_rgb(255_255_255/10%)_inset] px-5 py-3 rounded-lg font-medium text-white/85 hover:text-white text-sm no-underline whitespace-nowrap transition-all hover:-translate-y-px duration-200">
                <span className="text-sm">{loc('ChartEditor')}</span>
              </Link>
              <Link to="/events" className="relative flex items-center gap-2 hover:bg-linear-to-br hover:from-white/12 hover:to-white/8 hover:shadow-[0_4px_12px_rgb(255_255_255/10%),0_1px_0_rgb(255_255_255/10%)_inset] px-5 py-3 rounded-lg font-medium text-white/85 hover:text-white text-sm no-underline whitespace-nowrap transition-all hover:-translate-y-px duration-200">
                <span className="text-sm">{loc('Contest')}</span>
              </Link>
              <Link to="/eventTag?id=Original" className="relative flex items-center gap-2 hover:bg-linear-to-br hover:from-white/12 hover:to-white/8 hover:shadow-[0_4px_12px_rgb(255_255_255/10%),0_1px_0_rgb(255_255_255/10%)_inset] px-5 py-3 rounded-lg font-medium text-white/85 hover:text-white text-sm no-underline whitespace-nowrap transition-all hover:-translate-y-px duration-200">
                <span className="text-sm">{loc('OriginalSongs')}</span>
              </Link>
            </div>

            {/* 移动端：汉堡菜单 */}
            <div className="xl:hidden block relative">
              <button
                className={`flex items-center gap-2 p-2.5 bg-white/5 border border-white/10 rounded-[10px] cursor-pointer transition-all duration-300 text-[#e5e5e5] text-sm font-medium h-10 w-10 backdrop-blur-[10px] ${isMainNavOpen ? 'bg-linear-to-br from-white/15 to-white/10 border-white/30 -translate-y-0.5 shadow-[0_8px_25px_rgb(0_0_0/25%),0_1px_0_rgb(255_255_255/10%)_inset]' : 'hover:bg-linear-to-br hover:from-white/15 hover:to-white/10 hover:border-white/30 hover:-translate-y-0.5 hover:shadow-[0_8px_25px_rgb(0_0_0/25%),0_1px_0_rgb(255_255_255/10%)_inset]'}`}
                onClick={() => setIsMainNavOpen(!isMainNavOpen)}
              >
                <span className="flex flex-col gap-0.75 w-full h-2.5">
                  <span className={`block h-0.5 w-5 bg-[#e5e5e5] rounded-sm transition-all duration-200 ${isMainNavOpen ? 'rotate-[35deg] translate-x-0.5 translate-y-1' : ''}`}></span>
                  <span className={`block h-0.5 w-5 bg-[#e5e5e5] rounded-sm transition-all duration-200 ${isMainNavOpen ? 'opacity-0' : ''}`}></span>
                  <span className={`block h-0.5 w-5 bg-[#e5e5e5] rounded-sm transition-all duration-200 ${isMainNavOpen ? 'rotate-[-35deg] translate-x-0.5 -translate-y-1' : ''}`}></span>
                </span>
              </button>

              {isMainNavOpen && (
                <div className="top-[calc(100%+0.75rem)] left-0 z-1001 absolute bg-linear-to-br from-[rgb(15_15_20/95%)] to-[rgb(10_12_18/98%)] shadow-[0_20px_60px_rgb(0_0_0/50%),0_4px_20px_rgb(59_130_246/10%),0_1px_0_rgb(255_255_255/10%)_inset] backdrop-blur-xl saturate-180 border border-white/15 rounded-2xl min-w-[200px] overflow-hidden animate-[dropdownFadeIn_0.3s_cubic-bezier(0.4,0,0.2,1)]">
                  {/* 榜单项 - 可展开 */}
                  <div className="relative">
                    <button
                      className={`flex items-center justify-between gap-3 px-5 py-4 text-[#e5e5e5] no-underline transition-all duration-200 text-sm font-medium text-center bg-none border-none cursor-pointer w-full ${isMobileRankingsOpen ? 'bg-gradient-to-br from-[rgb(59_130_246/15%)] to-[rgb(59_130_246/8%)] text-[#3b82f6]' : 'hover:bg-gradient-to-br hover:from-white/12 hover:to-white/8 hover:text-white hover:translate-x-1 hover:shadow-[0_2px_8px_rgb(255_255_255/10%),0_1px_0_rgb(255_255_255/10%)_inset]'}`}
                      onClick={() => setIsMobileRankingsOpen(!isMobileRankingsOpen)}
                    >
                      <span className="w-full text-sm text-center">{loc('Rankings')}</span>
                      <span className={`text-2xl transition-transform duration-300 font-light ${isMobileRankingsOpen ? 'rotate-90 text-[#3b82f6]' : 'text-[#a0a0a0]'}`}>
                        ›
                      </span>
                    </button>

                    {/* 榜单子菜单 - 横向展开 */}
                    {isMobileRankingsOpen && (
                      <div className="flex flex-col items-center bg-black/40 [@keyframes_slideInFromLeft]:from-opacity-0 [@keyframes_slideInFromLeft]:to-opacity-100 [@keyframes_slideInFromLeft]:from-max-h-0 [@keyframes_slideInFromLeft]:to-max-h-[500px] overflow-hidden [@keyframes_slideInFromLeft]:from-translate-x-[-2px] [@keyframes_slideInFromLeft]:to-translate-x-0 animate-[slideInFromLeft_0.3s_ease-out]">
                        <Link to="/ranking" className="flex justify-start items-center gap-3 hover:bg-gradient-to-br hover:from-white/10 hover:to-white/[6%] ml-2 px-4 py-3.5 border-transparent border-l-2 font-medium text-[#e5e5e5] text-[0.85rem] hover:text-white no-underline transition-all duration-200">
                          <span className="text-sm text-left">{loc('Recommend')}</span>
                        </Link>
                        <Link to="/user-ranking" className="flex justify-start items-center gap-3 hover:bg-gradient-to-br hover:from-white/10 hover:to-white/[6%] ml-2 px-4 py-3.5 border-transparent border-l-2 font-medium text-[#e5e5e5] text-[0.85rem] hover:text-white no-underline transition-all duration-200">
                          <span className="text-sm text-left">{loc('UserRankingTitle')}</span>
                        </Link>
                        <Link to="/mmfc-ranking" className="flex justify-start items-center gap-3 hover:bg-gradient-to-br hover:from-white/10 hover:to-white/[6%] ml-2 px-4 py-3.5 border-transparent border-l-2 font-medium text-[#e5e5e5] text-[0.85rem] hover:text-white no-underline transition-all duration-200">
                          <span className="text-sm text-left">{loc('MMFCRanking')}</span>
                        </Link>
                      </div>
                    )}
                  </div>

                  <Link to="/edit" className="flex justify-center items-center gap-3 hover:bg-linear-to-br hover:from-white/12 hover:to-white/8 hover:shadow-[0_2px_8px_rgb(255_255_255/10%),0_1px_0_rgb(255_255_255/10%)_inset] px-5 py-4 font-medium text-[#e5e5e5] hover:text-white text-sm text-center no-underline transition-all hover:translate-x-1 duration-200">
                    <span className="w-full text-sm text-center">{loc('ChartEditor')}</span>
                  </Link>
                  <Link to="/events" className="flex justify-center items-center gap-3 hover:bg-linear-to-br hover:from-white/12 hover:to-white/8 hover:shadow-[0_2px_8px_rgb(255_255_255/10%),0_1px_0_rgb(255_255_255/10%)_inset] px-5 py-4 font-medium text-[#e5e5e5] hover:text-white text-sm text-center no-underline transition-all hover:translate-x-1 duration-200">
                    <span className="w-full text-sm text-center">{loc('Contest')}</span>
                  </Link>
                  <Link to="/eventTag?id=Original" className="flex justify-center items-center gap-3 hover:bg-linear-to-br hover:from-white/12 hover:to-white/8 hover:shadow-[0_2px_8px_rgb(255_255_255/10%),0_1px_0_rgb(255_255_255/10%)_inset] px-5 py-4 font-medium text-[#e5e5e5] hover:text-white text-sm text-center no-underline transition-all hover:translate-x-1 duration-200">
                    <span className="w-full text-sm text-center">{loc('OriginalSongs')}</span>
                  </Link>
                </div>
              )}
            </div>
          </nav>
        </div>

        {/* 移动端中间Logo */}
        <div className="hidden md:hidden max-md:flex justify-center items-center w-full">
          <Link to="/">
            <img className="xxlb" src="../../../salt.webp" alt="xxlb" />
          </Link>
        </div>

        {/* User Section */}
        <div className="relative flex items-center rounded-[10px] shrink-0" ref={userMenuRef}>
          {isLoading ? (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 opacity-70 px-4 py-3 border border-white/10 rounded-[10px] min-h-10 font-medium text-white/85 text-sm no-underline transition-all duration-200 cursor-default pointer-events-none">
                <AiOutlineLoading3Quarters className="animate-pulse" />
                <span className="hidden md:inline text-sm">{loc('Loading')}</span>
              </div>
            </div>
          ) : isLoggedIn ? (
            <div className="relative">
              <button
                className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-all duration-300 text-[#e5e5e5] text-sm font-medium min-h-10 ${isUserMenuOpen ? 'bg-linear-to-br from-white/15 to-white/10 border-white/30 -translate-y-0.5 shadow-[0_8px_25px_rgb(0_0_0/25%),0_1px_0_rgb(255_255_255/10%)_inset]' : 'hover:bg-gradient-to-br hover:from-white/15 hover:to-white/10 hover:border-white/30 hover:-translate-y-0.5 hover:shadow-[0_8px_25px_rgb(0_0_0/25%),0_1px_0_rgb(255_255_255/10%)_inset]'}`}
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              >
                <img
                  className={`w-9 h-9 rounded-full border-2 transition-colors duration-300 object-cover ${isUserMenuOpen ? 'border-white/60' : 'border-white/30 hover:border-white/60'}`}
                  src={`${apiroot3}/account/Icon?username=${username}`}
                  alt={username}
                />
                <span className="hidden md:inline max-w-[120px] overflow-hidden font-medium text-ellipsis whitespace-nowrap">{username}</span>
                <span className={`transition-transform duration-300 text-[#a0a0a0] text-[0.7rem] ${isUserMenuOpen ? 'rotate-180' : ''}`}>
                  ▼
                </span>
              </button>

              {isUserMenuOpen && (
                <div className="top-[calc(100%+0.75rem)] right-0 z-[1001] absolute bg-gradient-to-br from-[rgb(15_15_20/95%)] to-[rgb(10_12_18/98%)] shadow-[0_20px_60px_rgb(0_0_0/50%),0_4px_20px_rgb(59_130_246/10%),0_1px_0_rgb(255_255_255/10%)_inset] backdrop-blur-[24px] saturate-[180%] border border-white/15 rounded-2xl w-full overflow-hidden animate-[dropdownFadeIn_0.3s_cubic-bezier(0.4,0,0.2,1)]">
                  <Link to={`/space?id=${username}`} className="flex justify-center items-center gap-3 hover:bg-gradient-to-br hover:from-white/12 hover:to-white/8 bg-none hover:shadow-[0_2px_8px_rgb(255_255_255/10%),0_1px_0_rgb(255_255_255/10%)_inset] px-5 py-4 border-none w-full font-medium text-[#e5e5e5] hover:text-white text-sm text-center no-underline transition-all hover:translate-x-1 duration-200 cursor-pointer">
                    <span className="w-full font-medium text-center">{loc('PersonalHomePage')}</span>
                  </Link>
                  <Link to="/user/charts" className="flex justify-center items-center gap-3 hover:bg-gradient-to-br hover:from-white/12 hover:to-white/8 bg-none hover:shadow-[0_2px_8px_rgb(255_255_255/10%),0_1px_0_rgb(255_255_255/10%)_inset] px-5 py-4 border-none w-full font-medium text-[#e5e5e5] hover:text-white text-sm text-center no-underline transition-all hover:translate-x-1 duration-200 cursor-pointer">
                    <span className="w-full font-medium text-center">{loc('ChartsManagement')}</span>
                  </Link>
                  <Link to="/user/profile" className="flex justify-center items-center gap-3 hover:bg-gradient-to-br hover:from-white/12 hover:to-white/8 bg-none hover:shadow-[0_2px_8px_rgb(255_255_255/10%),0_1px_0_rgb(255_255_255/10%)_inset] px-5 py-4 border-none w-full font-medium text-[#e5e5e5] hover:text-white text-sm text-center no-underline transition-all hover:translate-x-1 duration-200 cursor-pointer">
                    <span className="w-full font-medium text-center">{loc('AccountSetting')}</span>
                  </Link>
                  <div className="bg-white/10 my-2 h-px"></div>
                  <button onClick={handleLogout} className="flex justify-center items-center gap-3 hover:bg-gradient-to-br hover:from-[rgb(239_68_68/25%)] hover:to-[rgb(220_38_38/20%)] bg-none hover:shadow-[0_2px_8px_rgb(239_68_68/20%),0_1px_0_rgb(255_255_255/10%)_inset] px-5 py-4 border-none w-full font-medium text-[#e5e5e5] hover:text-[#fca5a5] text-sm text-center no-underline transition-all hover:translate-x-1 duration-200 cursor-pointer">
                    <span className="w-full font-medium text-center">{loc('Logout')}</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="relative" ref={mobileAuthMenuRef}>
              {/* 桌面端：传统链接形式 */}
              <div className="hidden md:flex items-center gap-2">
                <Link to="/login" className="flex items-center gap-2 hover:bg-white/10 px-4 py-3 border border-white/10 hover:border-white/30 rounded-[10px] min-h-10 font-medium text-white/85 hover:text-white text-sm no-underline transition-all duration-200">
                  <span className="text-sm">{loc('Login')}</span>
                </Link>
                <Link to="/register" className="flex items-center gap-2 bg-gradient-to-br from-[#10b981] hover:from-[#059669] to-[#059669] hover:to-[#047857] px-4 py-3 border border-transparent rounded-[10px] min-h-10 font-medium text-white text-sm no-underline transition-all duration-200">
                  <span className="text-sm">{loc('Register')}</span>
                </Link>
              </div>

              {/* 移动端：下拉菜单形式 */}
              <div className="md:hidden block relative">
                <button
                  className={`flex items-center gap-2 px-4 py-3 bg-white/5 border border-white/10 rounded-[10px] text-white/85 cursor-pointer transition-all duration-300 backdrop-blur-[10px] text-sm h-10 ${isMobileAuthMenuOpen ? 'bg-gradient-to-br from-white/15 to-white/10 border-white/30 -translate-y-0.5 shadow-[0_8px_25px_rgb(0_0_0/25%),0_1px_0_rgb(255_255_255/10%)_inset]' : 'hover:bg-gradient-to-br hover:from-white/15 hover:to-white/10 hover:border-white/30 hover:-translate-y-0.5 hover:shadow-[0_8px_25px_rgb(0_0_0/25%),0_1px_0_rgb(255_255_255/10%)_inset]'}`}
                  onClick={() => setIsMobileAuthMenuOpen(!isMobileAuthMenuOpen)}
                >
                  <AiOutlineUser className="font-medium text-white/85 text-base" />
                  <span className={`text-[0.7rem] transition-transform duration-300 text-white/60 ${isMobileAuthMenuOpen ? 'rotate-180' : ''}`}>
                    ▼
                  </span>
                </button>

                {isMobileAuthMenuOpen && (
                  <div className="top-[calc(100%+0.75rem)] right-0 z-[1001] absolute bg-gradient-to-br from-[rgb(15_15_20/95%)] to-[rgb(10_12_18/98%)] shadow-[0_20px_60px_rgb(0_0_0/50%),0_4px_20px_rgb(59_130_246/10%),0_1px_0_rgb(255_255_255/10%)_inset] backdrop-blur-[24px] saturate-[180%] p-4 border border-white/15 rounded-2xl min-w-[200px] animate-[dropdownFadeIn_0.3s_cubic-bezier(0.4,0,0.2,1)]">
                    <Link to="/login" className="flex justify-center items-center gap-3 hover:bg-gradient-to-br hover:from-white/12 hover:to-white/8 bg-none hover:shadow-[0_2px_8px_rgb(255_255_255/10%),0_1px_0_rgb(255_255_255/10%)_inset] px-5 py-4 border-none w-full font-medium text-white/85 hover:text-white text-sm text-center no-underline transition-all hover:translate-x-1 duration-200 cursor-pointer">
                      <span className="flex-1 w-full text-center">{loc('Login')}</span>
                    </Link>
                    <Link to="/register" className="flex justify-center items-center gap-3 bg-gradient-to-br from-[rgb(16_185_129/20%)] hover:from-[rgb(16_185_129/30%)] to-[rgb(5_150_105/15%)] hover:to-[rgb(5_150_105/25%)] px-5 py-4 border-none w-full font-semibold text-[#10b981] hover:text-[#34d399] text-sm text-center no-underline transition-all duration-200 cursor-pointer">
                      <span className="flex-1 w-full text-center">{loc('Register')}</span>
                    </Link>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
