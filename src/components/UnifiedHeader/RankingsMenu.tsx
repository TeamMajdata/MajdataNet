import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLoc } from '@/hooks';
import { DROPDOWN_ITEM } from './styles';
import Dropdown from './Dropdown';

/**
 * 榜单下拉菜单组件（桌面端）
 */
export default function RankingsMenu() {
  const loc = useLoc();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="inline-block relative">
      <button
        className={`flex items-center gap-2 px-5 py-3 text-white/85 no-underline rounded-lg font-medium text-sm whitespace-nowrap relative bg-none border-none cursor-pointer ${
          isOpen
            ? 'bg-linear-to-br from-white/12 to-white/8 text-white shadow-[0_4px_12px_rgb(255_255_255/10%),0_1px_0_rgb(255_255_255/10%)_inset]'
            : 'hover:bg-linear-to-br hover:from-white/12 hover:to-white/8 hover:text-white hover:shadow-[0_4px_12px_rgb(255_255_255/10%),0_1px_0_rgb(255_255_255/10%)_inset]'
        }`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="text-sm">{loc('Rankings')}</span>
        <span className="text-[#a0a0a0] text-[0.7rem]">▼</span>
      </button>

      <Dropdown isOpen={isOpen} onClose={() => setIsOpen(false)} position="left" className="w-full">
        <Link to="/ranking" className={DROPDOWN_ITEM}>
          <span className="text-sm">{loc('Recommend')}</span>
        </Link>
        <Link to="/user-ranking" className={DROPDOWN_ITEM}>
          <span className="text-sm">{loc('UserRankingTitle')}</span>
        </Link>
        <Link to="/mmfc-ranking" className={DROPDOWN_ITEM}>
          <span className="text-sm">{loc('MMFCRanking')}</span>
        </Link>
      </Dropdown>
    </div>
  );
}
