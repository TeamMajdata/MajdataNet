import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLoc } from '@/hooks';
import Dropdown from './Dropdown';
import { DROPDOWN_ITEM, NAV_LINK } from './styles';

/**
 * 桌面端导航栏
 */
export default function DesktopNav() {
  const loc = useLoc();
  const [isRankingsOpen, setIsRankingsOpen] = useState(false);
  const rankingsContainerRef = useRef<HTMLDivElement>(null);
  const [isToolsOpen, setIsToolsOpen] = useState(false);
  const toolsContainerRef = useRef<HTMLDivElement>(null);

  return (
    <div className="hidden xl:flex items-center gap-2 bg-white/5 p-2 border border-white/8 rounded-xl">
      <div className="inline-block relative" ref={rankingsContainerRef}>
        <button
          className={`flex items-center gap-2 px-5 py-3 text-white/85 no-underline rounded-lg font-medium text-sm whitespace-nowrap relative bg-none border-none cursor-pointer ${isRankingsOpen
            ? 'bg-linear-to-br from-white/12 to-white/8 text-white shadow-[0_4px_12px_rgb(255_255_255/10%),0_1px_0_rgb(255_255_255/10%)_inset]'
            : 'hover:bg-linear-to-br hover:from-white/12 hover:to-white/8 hover:text-white hover:shadow-[0_4px_12px_rgb(255_255_255/10%),0_1px_0_rgb(255_255_255/10%)_inset]'
            }`}
          onClick={() => setIsRankingsOpen(!isRankingsOpen)}
        >
          <span className="text-sm">{loc('Rankings')}</span>
          <span className="text-[#a0a0a0] text-[0.7rem]">▼</span>
        </button>

        <Dropdown isOpen={isRankingsOpen} onClose={() => setIsRankingsOpen(false)} position="left" className="w-full" containerRef={rankingsContainerRef}>
          <Link to="/ranking" className={DROPDOWN_ITEM} onClick={() => setIsRankingsOpen(false)}>
            <span className="text-sm">{loc('Recommend')}</span>
          </Link>
          <Link to="/ranking/user" className={DROPDOWN_ITEM} onClick={() => setIsRankingsOpen(false)}>
            <span className="text-sm">{loc('UserRankingTitle')}</span>
          </Link>
          <Link to="/ranking/mmfc" className={DROPDOWN_ITEM} onClick={() => setIsRankingsOpen(false)}>
            <span className="text-sm">{loc('MMFCRanking')}</span>
          </Link>
        </Dropdown>
      </div>
      <div className="inline-block relative" ref={toolsContainerRef}>
        <button
          className={`flex items-center gap-2 px-5 py-3 text-white/85 no-underline rounded-lg font-medium text-sm whitespace-nowrap relative bg-none border-none cursor-pointer ${isToolsOpen
            ? 'bg-linear-to-br from-white/12 to-white/8 text-white shadow-[0_4px_12px_rgb(255_255_255/10%),0_1px_0_rgb(255_255_255/10%)_inset]'
            : 'hover:bg-linear-to-br hover:from-white/12 hover:to-white/8 hover:text-white hover:shadow-[0_4px_12px_rgb(255_255_255/10%),0_1px_0_rgb(255_255_255/10%)_inset]'
            }`}
          onClick={() => setIsToolsOpen(!isToolsOpen)}
        >
          <span className="text-sm">{loc('Tools')}</span>
          <span className="text-[#a0a0a0] text-[0.7rem]">▼</span>
        </button>

        <Dropdown
          isOpen={isToolsOpen}
          onClose={() => setIsToolsOpen(false)}
          position="left"
          className="w-full"
          containerRef={toolsContainerRef}
        >
          <Link to="/edit" className={DROPDOWN_ITEM} onClick={() => setIsToolsOpen(false)}>
            <span className="text-sm">{loc('ChartEditor')}</span>
          </Link>
          <Link to="/play" className={DROPDOWN_ITEM} onClick={() => setIsToolsOpen(false)}>
            <span className="text-sm">{loc('ChartPlayer')}</span>
          </Link>
        </Dropdown>
      </div>
      <Link to="https://docs.majdata.net" className={NAV_LINK} target="_blank" rel="noopener noreferrer">
        <span className="text-sm">{loc('Documentation')}</span>
      </Link>
      <Link to="/collection/hiroba" className={NAV_LINK}>
        <span className="text-sm">{loc('CollectionHiroba')}</span>
      </Link>
      <Link to="/chart-events" className={NAV_LINK}>
        <span className="text-sm">{loc('Contest')}</span>
      </Link>
      <Link to="/eventTag?id=Original" className={NAV_LINK}>
        <span className="text-sm">{loc('OriginalSongs')}</span>
      </Link>
    </div>
  );
}
