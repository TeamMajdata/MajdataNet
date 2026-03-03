import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useLoc } from '@/hooks';
import { handleLogout as logoutUtil } from '@/utils';
import { apiroot3 } from '@/config/api';
import { DIVIDER } from './styles';
import Dropdown from './Dropdown';

interface UserMenuProps {
  username: string;
}

/**
 * 用户下拉菜单组件
 */
export default function UserMenu({ username }: UserMenuProps) {
  const loc = useLoc();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleLogout = async () => {
    await logoutUtil(
      () => {
        setIsOpen(false);
        window.location.href = '/';
      },
      (error) => {
        console.error(loc('LogoutFailed'), error);
        setIsOpen(false);
        window.location.href = '/';
      }
    );
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        className={`flex rounded-[10px] items-center gap-2 md:gap-3 px-3 md:px-4 cursor-pointer text-[#e5e5e5] text-sm font-medium h-10 md:h-12 bg-white/5 border border-white/10 backdrop-blur-[10px] ${
          isOpen
            ? 'bg-linear-to-br from-white/15 to-white/10 border-white/30 shadow-[0_8px_25px_rgb(0_0_0/25%),0_1px_0_rgb(255_255_255/10%)_inset]'
            : 'hover:bg-linear-to-br hover:from-white/15 hover:to-white/10 hover:border-white/30 hover:shadow-[0_8px_25px_rgb(0_0_0/25%),0_1px_0_rgb(255_255_255/10%)_inset]'
        }`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <img
          className={`w-7 h-7 md:w-9 md:h-9 rounded-full border-2 object-cover ${isOpen ? 'border-white/60' : 'border-white/30 hover:border-white/60'}`}
          src={`${apiroot3}/account/Icon?username=${username}`}
          alt={username}
        />
        <span className="hidden md:inline max-w-30 overflow-hidden font-medium text-ellipsis whitespace-nowrap">{username}</span>
      </button>

      <Dropdown isOpen={isOpen} onClose={() => setIsOpen(false)} position="right" className="w-full" containerRef={containerRef}>
        <Link to={`/space?id=${username}`} className="flex justify-center items-center gap-3 hover:bg-linear-to-br hover:from-white/12 hover:to-white/8 bg-none hover:shadow-[0_2px_8px_rgb(255_255_255/10%),0_1px_0_rgb(255_255_255/10%)_inset] px-5 py-4 border-none w-full font-medium text-[#e5e5e5] hover:text-white text-sm text-center no-underline cursor-pointer">
          <span className="w-full font-medium text-center">{loc('PersonalHomePage')}</span>
        </Link>
        <Link to="/user/scores" className="flex justify-center items-center gap-3 hover:bg-linear-to-br hover:from-white/12 hover:to-white/8 bg-none hover:shadow-[0_2px_8px_rgb(255_255_255/10%),0_1px_0_rgb(255_255_255/10%)_inset] px-5 py-4 border-none w-full font-medium text-[#e5e5e5] hover:text-white text-sm text-center no-underline cursor-pointer">
          <span className="w-full font-medium text-center">{loc('PersonalScores')}</span>
        </Link>
        <Link to="/user/charts" className="flex justify-center items-center gap-3 hover:bg-linear-to-br hover:from-white/12 hover:to-white/8 bg-none hover:shadow-[0_2px_8px_rgb(255_255_255/10%),0_1px_0_rgb(255_255_255/10%)_inset] px-5 py-4 border-none w-full font-medium text-[#e5e5e5] hover:text-white text-sm text-center no-underline cursor-pointer">
          <span className="w-full font-medium text-center">{loc('ChartsManagement')}</span>
        </Link>
        <Link to="/user/profile" className="flex justify-center items-center gap-3 hover:bg-linear-to-br hover:from-white/12 hover:to-white/8 bg-none hover:shadow-[0_2px_8px_rgb(255_255_255/10%),0_1px_0_rgb(255_255_255/10%)_inset] px-5 py-4 border-none w-full font-medium text-[#e5e5e5] hover:text-white text-sm text-center no-underline cursor-pointer">
          <span className="w-full font-medium text-center">{loc('AccountSetting')}</span>
        </Link>
        <div className={DIVIDER}></div>
        <button onClick={handleLogout} className="flex justify-center items-center gap-3 hover:bg-linear-to-br hover:from-[rgb(239_68_68/25%)] hover:to-[rgb(220_38_38/20%)] bg-none hover:shadow-[0_2px_8px_rgb(239_68_68/20%),0_1px_0_rgb(255_255_255/10%)_inset] px-5 py-4 border-none w-full font-medium text-[#e5e5e5] hover:text-[#fca5a5] text-sm text-center no-underline cursor-pointer">
          <span className="w-full font-medium text-center">{loc('Logout')}</span>
        </button>
      </Dropdown>
    </div>
  );
}
