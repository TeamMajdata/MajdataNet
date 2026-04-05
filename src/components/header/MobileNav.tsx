import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useLoc } from '@/hooks';
import { MOBILE_DROPDOWN_ITEM, HAMBURGER_BUTTON_BASE, HAMBURGER_BUTTON_ACTIVE, HAMBURGER_BUTTON_HOVER } from './styles';
import Dropdown from './Dropdown';

/**
 * 移动端汉堡菜单导航
 */
export default function MobileNav() {
  const loc = useLoc();
  const [isMainNavOpen, setIsMainNavOpen] = useState(false);
  const [isMobileRankingsOpen, setIsMobileRankingsOpen] = useState(false);
  const containerRef = useRef<HTMLElement>(null);

  return (
    <nav className="xl:hidden block relative" ref={containerRef}>
      <button
        className={`${HAMBURGER_BUTTON_BASE} ${isMainNavOpen ? HAMBURGER_BUTTON_ACTIVE : HAMBURGER_BUTTON_HOVER}`}
        onClick={() => setIsMainNavOpen(!isMainNavOpen)}
      >
        <span className="flex flex-col gap-1.5 w-6 h-4">
          <span className={`block h-0.5 w-6 bg-[#e5e5e5] rounded-sm transition-transform ${isMainNavOpen ? 'rotate-45 translate-y-1.75' : ''}`}></span>
          <span className={`block h-0.5 w-6 bg-[#e5e5e5] rounded-sm transition-opacity ${isMainNavOpen ? 'opacity-0' : ''}`}></span>
          <span className={`block h-0.5 w-6 bg-[#e5e5e5] rounded-sm transition-transform ${isMainNavOpen ? '-rotate-45 -translate-y-1.75' : ''}`}></span>
        </span>
      </button>

      <Dropdown isOpen={isMainNavOpen} onClose={() => { setIsMainNavOpen(false); setIsMobileRankingsOpen(false); }} position="left" containerRef={containerRef}>
        {/* 榜单项 - 可展开 */}
        <div className="relative">
          <button
            className={`flex items-center justify-between gap-3 px-5 py-4 text-[#e5e5e5] no-underline text-sm font-medium text-center bg-none border-none cursor-pointer w-full ${isMobileRankingsOpen
              ? 'bg-linear-to-br from-[rgb(59_130_246/15%)] to-[rgb(59_130_246/8%)] text-[#3b82f6]'
              : 'hover:bg-linear-to-br hover:from-white/12 hover:to-white/8 hover:text-white hover:shadow-[0_2px_8px_rgb(255_255_255/10%),0_1px_0_rgb(255_255_255/10%)_inset]'
              }`}
            onClick={() => setIsMobileRankingsOpen(!isMobileRankingsOpen)}
          >
            <span className="w-full text-sm text-center">{loc('Rankings')}</span>
            <span className={`text-2xl font-light ${isMobileRankingsOpen ? 'text-[#3b82f6]' : 'text-[#a0a0a0]'}`}>›</span>
          </button>

          {isMobileRankingsOpen && (
            <div className="flex flex-col items-center bg-black/40 overflow-hidden">
              <Link to="/ranking" className="flex justify-start items-center gap-3 hover:bg-linear-to-br hover:from-white/10 hover:to-white/6 ml-2 px-4 py-3.5 border-transparent border-l-2 font-medium text-[#e5e5e5] text-[0.85rem] hover:text-white no-underline">
                <span className="text-sm text-left">{loc('Recommend')}</span>
              </Link>
              <Link to="/ranking/user" className="flex justify-start items-center gap-3 hover:bg-linear-to-br hover:from-white/10 hover:to-white/6 ml-2 px-4 py-3.5 border-transparent border-l-2 font-medium text-[#e5e5e5] text-[0.85rem] hover:text-white no-underline">
                <span className="text-sm text-left">{loc('UserRankingTitle')}</span>
              </Link>
              <Link to="/ranking/mmfc" className="flex justify-start items-center gap-3 hover:bg-linear-to-br hover:from-white/10 hover:to-white/6 ml-2 px-4 py-3.5 border-transparent border-l-2 font-medium text-[#e5e5e5] text-[0.85rem] hover:text-white no-underline">
                <span className="text-sm text-left">{loc('MMFCRanking')}</span>
              </Link>
            </div>
          )}
        </div>

        <Link to="/edit" className={MOBILE_DROPDOWN_ITEM}>
          <span className="w-full text-sm text-center">{loc('ChartEditor')}</span>
        </Link>
        <Link to="/play" className={MOBILE_DROPDOWN_ITEM}>
          <span className="w-full text-sm text-center">MajdataPlay</span>
        </Link>
        <Link to="/collection/hiroba" className={MOBILE_DROPDOWN_ITEM}>
          <span className="w-full text-sm text-center">{loc('CollectionHiroba')}</span>
        </Link>
        <Link to="/chart-events" className={MOBILE_DROPDOWN_ITEM}>
          <span className="w-full text-sm text-center">{loc('Contest')}</span>
        </Link>
        <Link to="/eventTag?id=Original" className={MOBILE_DROPDOWN_ITEM}>
          <span className="w-full text-sm text-center">{loc('OriginalSongs')}</span>
        </Link>
      </Dropdown>
    </nav>
  );
}
