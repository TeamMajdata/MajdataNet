import { useTranslation } from 'react-i18next';
import { useEffect, useRef, useState } from 'react';
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

  // 桌面端（能悬停的设备）悬停展开，和顶栏的“榜单”“工具”一致；手机仍点击展开
  const hoverCloseTimer = useRef<number | undefined>(undefined);
  const canHover = () => window.matchMedia('(min-width: 768px) and (hover: hover)').matches;
  useEffect(() => () => window.clearTimeout(hoverCloseTimer.current), []);

  const openOnHover = () => {
    if (!canHover()) return;
    window.clearTimeout(hoverCloseTimer.current);
    setIsOpen(true);
  };
  // 稍等再关，指针从头像移到菜单途中不会闪退
  const closeOnHoverEnd = () => {
    if (!canHover()) return;
    window.clearTimeout(hoverCloseTimer.current);
    hoverCloseTimer.current = window.setTimeout(() => setIsOpen(false), 150);
  };

  return (
    <div
      className={`relative ${isOpen ? "after:absolute after:inset-x-0 after:top-full after:h-2.5 after:content-['']" : ''}`}
      ref={containerRef}
      onPointerEnter={openOnHover}
      onPointerLeave={closeOnHoverEnd}
    >
      {/* 头像 + 昵称，没有外框；悬停或展开时出现浅色底，头像圆环同步变亮/变蓝。手机上只显示头像 */}
      <button
        className={`group flex items-center gap-2 p-1 md:pr-3 border-none rounded-full h-10 font-medium text-sm cursor-pointer touch-manipulation transition-colors duration-150 ${
          isOpen ? 'bg-white/10 text-white' : 'bg-transparent text-white/85 hover:bg-white/[0.06] hover:text-white'
        }`}
        onClick={() => setIsOpen(canHover() ? true : !isOpen)}
        aria-expanded={isOpen}
        aria-label={t("shared/UserMenu.UserMenu")}
      >
        <UserAvatar
          className={`w-8 h-8 rounded-full object-cover ring-1 transition-shadow duration-150 ${isOpen ? 'ring-2 ring-blue-400/70' : 'ring-white/15 group-hover:ring-white/40'}`}
          username={username}
          avatarId={user?.avatarId}
        />
        <span className="hidden md:inline max-w-30 overflow-hidden text-ellipsis whitespace-nowrap">{user?.nickname || username}</span>
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
