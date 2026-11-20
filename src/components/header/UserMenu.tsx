import { useTranslation } from 'react-i18next';
import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useUserContext } from '@/hooks';
import UserAvatar from '@/components/user/UserAvatar';
import { handleLogout as logoutUtil } from '@/utils';
import Dropdown from './Dropdown';
import { LuFileMusic, LuHouse, LuListMusic, LuLogOut, LuSettings, LuTrophy } from 'react-icons/lu';

const MENU_ITEM = 'flex items-center gap-3 bg-transparent px-3 border-none rounded-lg w-full h-10 text-white/80 hover:text-white text-sm no-underline hover:bg-white/[0.06] transition-colors cursor-pointer';

interface UserMenuProps {
  username: string;
}

/**
 * 用户下拉菜单组件
 */
export default function UserMenu({ username }: UserMenuProps) {
  const { t } = useTranslation();
  const { user } = useUserContext();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleLogout = async () => {
    await logoutUtil(
      () => {
        setIsOpen(false);
        window.location.href = '/';
      },
      (error) => {
        console.error(t("shared/UserMenu.LogoutFailed"), error);
        setIsOpen(false);
        window.location.href = '/';
      }
    );
  };

  const menuItems = [
    { to: `/space?id=${username}`, label: t("shared/UserMenu.PersonalHomePage"), Icon: LuHouse },
    { to: '/user/scores', label: t("shared/UserMenu.PersonalScores"), Icon: LuTrophy },
    { to: '/user/charts', label: t("shared/UserMenu.ChartsManagement"), Icon: LuFileMusic },
    { to: '/user/collections', label: t("shared/UserMenu.MyCollections"), Icon: LuListMusic },
    { to: '/user/profile', label: t("shared/UserMenu.AccountSetting"), Icon: LuSettings },
  ];

  return (
    <div className="relative" ref={containerRef}>
      <button
        className={`flex items-center gap-2 p-1 md:pr-3 rounded-full cursor-pointer text-white/85 text-sm font-medium h-10 border touch-manipulation transition-colors duration-150 ${
          isOpen ? 'bg-white/10 border-white/20' : 'bg-white/[0.04] border-white/10 hover:bg-white/[0.08] hover:border-white/20'
        }`}
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-label={t("shared/UserMenu.UserMenu")}
      >
        <UserAvatar
          className={"w-8 h-8 rounded-full object-cover"}
          username={username}
          avatarId={user?.avatarId}
        />
        <span className="hidden md:inline max-w-30 overflow-hidden font-medium text-ellipsis whitespace-nowrap">{user?.nickname || username}</span>
      </button>

      <Dropdown isOpen={isOpen} onClose={() => setIsOpen(false)} position="right" className="p-1.5 w-[min(15rem,calc(100vw-1.5rem))]" containerRef={containerRef}>
        {/* 顶部：头像、昵称和用户名 */}
        <div className="flex items-center gap-3 mb-1 px-2.5 py-2.5 border-white/[0.07] border-b">
          <UserAvatar className="rounded-full w-9 h-9 object-cover shrink-0" username={username} avatarId={user?.avatarId} />
          <div className="min-w-0">
            <div className="font-medium text-white text-sm truncate">{user?.nickname || username}</div>
            <div className="text-white/45 text-xs truncate">@{username}</div>
          </div>
        </div>
        <ul className="flex flex-col gap-0.5 m-0 p-0 list-none" role="menu">
          {menuItems.map(({ to, label, Icon }) => (
            <li key={to} role="none">
              <Link to={to} role="menuitem" className={MENU_ITEM} onClick={() => setIsOpen(false)}>
                <Icon aria-hidden="true" className="w-4 h-4 text-white/45 shrink-0" />
                {label}
              </Link>
            </li>
          ))}
        </ul>
        <div className="bg-white/[0.07] my-1 h-px" />
        <button type="button" role="menuitem" onClick={handleLogout} className={`${MENU_ITEM} text-left hover:bg-red-500/10! hover:text-red-300!`}>
          <LuLogOut aria-hidden="true" className="w-4 h-4 text-white/45 shrink-0" />
          {t("shared/UserMenu.Logout")}
        </button>
      </Dropdown>
    </div>
  );
}
