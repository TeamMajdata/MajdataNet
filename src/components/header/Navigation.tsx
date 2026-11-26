import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  NAVIGATION_ITEMS,
  isNavigationItemActive,
  isNavigationLinkActive,
} from './navigationItems';
import type {
  NavigationGroup,
  NavigationGroupId,
  NavigationLink,
} from './navigationItems';

const TOP_LEVEL_ITEM = 'relative flex min-h-11 w-full items-center justify-between gap-3 rounded-xl px-4 text-sm font-medium tracking-[0.01em] no-underline transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#090b11] xl:min-h-0 xl:h-9 xl:w-auto xl:min-w-0 xl:justify-center xl:gap-1.5 xl:rounded-lg xl:px-2.5';
const TOP_LEVEL_IDLE = 'text-white/65 hover:bg-white/[0.06] hover:text-white';
const TOP_LEVEL_ACTIVE = 'bg-white/[0.07] text-white';
const CHILD_ITEM = 'group flex min-h-11 items-center gap-3 rounded-lg px-4 pl-7 text-[0.8125rem] font-medium no-underline transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/70 xl:min-h-10 xl:px-3.5 xl:text-sm';
const CHILD_IDLE = 'text-white/66 hover:bg-white/[0.06] hover:text-white';
const CHILD_ACTIVE = 'bg-blue-400/[0.1] text-blue-100';

interface NavigationLinkViewProps {
  item: NavigationLink;
  nested?: boolean;
  pathname: string;
  search: string;
  t: TFunction;
  onNavigate: () => void;
}

function ActiveMarker({ active, nested = false }: { active: boolean; nested?: boolean }) {
  if (nested) {
    return (
      <span
        aria-hidden="true"
        className={`h-1.5 w-1.5 shrink-0 rounded-full transition-colors ${active ? 'bg-blue-300 shadow-[0_0_10px_rgb(96_165_250/65%)]' : 'bg-white/18 group-hover:bg-white/45'}`}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className={`absolute bottom-1.5 left-4 h-0.5 rounded-full bg-blue-400 transition-all duration-200 xl:-bottom-[0.6875rem] xl:left-1/2 xl:-translate-x-1/2 ${active ? 'w-5 opacity-100 xl:w-6' : 'w-0 opacity-0'}`}
    />
  );
}

function NavigationLinkView({
  item,
  nested = false,
  pathname,
  search,
  t,
  onNavigate,
}: NavigationLinkViewProps) {
  const active = isNavigationLinkActive(item, pathname, search);
  const className = nested
    ? `${CHILD_ITEM} ${active ? CHILD_ACTIVE : CHILD_IDLE}`
    : `${TOP_LEVEL_ITEM} ${active ? TOP_LEVEL_ACTIVE : TOP_LEVEL_IDLE}`;
  const content = (
    <>
      {nested && <ActiveMarker active={active} nested />}
      <span className="min-w-0 flex-1 text-left xl:whitespace-nowrap xl:truncate">
        {t(item.labelKey)}
      </span>
      {!nested && <ActiveMarker active={active} />}
      {item.external && (
        <span aria-hidden="true" className="text-[0.7rem] text-white/35 transition-colors group-hover:text-white/65">
          ↗
        </span>
      )}
    </>
  );

  if (item.external) {
    return (
      <a
        href={item.to}
        className={`group ${className}`}
        target="_blank"
        rel="noopener noreferrer"
        onClick={onNavigate}
      >
        {content}
      </a>
    );
  }

  return (
    <NavLink
      to={item.to}
      className={className}
      aria-current={active ? 'page' : undefined}
      onClick={onNavigate}
      end={item.match !== 'prefix'}
    >
      {content}
    </NavLink>
  );
}

interface NavigationGroupViewProps {
  item: NavigationGroup;
  isOpen: boolean;
  pathname: string;
  search: string;
  t: TFunction;
  menuId: string;
  triggerRef: (element: HTMLButtonElement | null) => void;
  onToggle: () => void;
  onHoverStart: () => void;
  onHoverEnd: () => void;
  onNavigate: () => void;
}

function NavigationGroupView({
  item,
  isOpen,
  pathname,
  search,
  t,
  menuId,
  triggerRef,
  onToggle,
  onHoverStart,
  onHoverEnd,
  onNavigate,
}: NavigationGroupViewProps) {
  const active = isNavigationItemActive(item, pathname, search);

  return (
    <li className="relative min-w-0" onPointerEnter={onHoverStart} onPointerLeave={onHoverEnd}>
      <button
        ref={triggerRef}
        type="button"
        className={`${TOP_LEVEL_ITEM} cursor-pointer border-0 ${active || isOpen ? TOP_LEVEL_ACTIVE : TOP_LEVEL_IDLE}`}
        aria-expanded={isOpen}
        aria-controls={menuId}
        aria-haspopup="true"
        onClick={onToggle}
        data-navigation-group={item.id}
      >
        <span className="min-w-0 flex-1 text-left xl:whitespace-nowrap xl:truncate">
          {t(item.labelKey)}
        </span>
        <svg
          aria-hidden="true"
          viewBox="0 0 14 14"
          className={`h-3.5 w-3.5 shrink-0 text-white/38 transition-transform duration-200 ${isOpen ? 'rotate-180 text-blue-200/80' : ''}`}
          fill="none"
        >
          <path d="m3.25 5.25 3.75 3.5 3.75-3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <ActiveMarker active={active} />
      </button>

      <ul
        id={menuId}
        className={`${isOpen ? 'flex' : 'hidden'} mt-1 list-none flex-col gap-0.5 border-t border-white/[0.07] pt-1 xl:absolute xl:top-[calc(100%+0.55rem)] xl:left-0 xl:before:absolute xl:before:inset-x-0 xl:before:-top-2.5 xl:before:h-2.5 xl:before:content-[''] xl:mt-0 xl:min-w-52 xl:rounded-xl xl:border xl:border-white/10 xl:bg-[rgb(10_13_20/96%)] xl:p-1.5 xl:shadow-[0_18px_50px_rgb(0_0_0/42%),0_1px_0_rgb(255_255_255/7%)_inset] xl:backdrop-blur-2xl`}
      >
        {item.children.map((child) => (
          <li key={child.id}>
            <NavigationLinkView
              item={child}
              nested
              pathname={pathname}
              search={search}
              t={t}
              onNavigate={onNavigate}
            />
          </li>
        ))}
      </ul>
    </li>
  );
}

/** A single semantic navigation tree that reflows for desktop and mobile. */
function NavigationContent() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigationId = useId();
  const navigationRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const groupTriggerRefs = useRef<Partial<Record<NavigationGroupId, HTMLButtonElement | null>>>({});
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [openGroup, setOpenGroup] = useState<NavigationGroupId | null>(null);

  const closeNavigation = useCallback(() => {
    setIsMobileMenuOpen(false);
    setOpenGroup(null);
  }, []);

  const handleNavigate = useCallback(() => {
    closeNavigation();
  }, [closeNavigation]);

  useEffect(() => {
    const breakpoint = window.matchMedia('(min-width: 1280px)');
    const handleBreakpointChange = () => closeNavigation();

    breakpoint.addEventListener('change', handleBreakpointChange);
    return () => breakpoint.removeEventListener('change', handleBreakpointChange);
  }, [closeNavigation]);

  useEffect(() => {
    if (!isMobileMenuOpen && openGroup === null) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!navigationRef.current?.contains(event.target as Node)) closeNavigation();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;

      if (openGroup) {
        const trigger = groupTriggerRefs.current[openGroup];
        setOpenGroup(null);
        trigger?.focus();
        return;
      }

      if (isMobileMenuOpen) {
        setIsMobileMenuOpen(false);
        menuButtonRef.current?.focus();
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [closeNavigation, isMobileMenuOpen, openGroup]);

  const toggleMobileMenu = () => {
    if (isMobileMenuOpen) setOpenGroup(null);
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  // 桌面端（能悬停的宽屏）悬停展开分组；手机和触屏仍然点击展开
  const hoverCloseTimer = useRef<number | undefined>(undefined);
  const canHover = () => window.matchMedia('(min-width: 1280px) and (hover: hover)').matches;

  useEffect(() => () => window.clearTimeout(hoverCloseTimer.current), []);

  const openGroupOnHover = (groupId: NavigationGroupId) => {
    if (!canHover()) return;
    window.clearTimeout(hoverCloseTimer.current);
    setOpenGroup(groupId);
  };

  // 稍等一下再关，指针从按钮移到菜单途中不会闪退
  const closeGroupOnHoverEnd = () => {
    if (!canHover()) return;
    window.clearTimeout(hoverCloseTimer.current);
    hoverCloseTimer.current = window.setTimeout(() => setOpenGroup(null), 150);
  };

  const toggleGroup = (groupId: NavigationGroupId) => {
    // 悬停已经展开时，点击不应把菜单关掉
    if (canHover()) {
      window.clearTimeout(hoverCloseTimer.current);
      setOpenGroup(groupId);
      return;
    }
    setOpenGroup((currentGroup) => currentGroup === groupId ? null : groupId);
  };

  return (
    <nav ref={navigationRef} className="relative min-w-0" aria-label={t("shared/Navigation.NavigationMenu")}>
      <button
        ref={menuButtonRef}
        type="button"
        className={`relative grid h-10 w-10 touch-manipulation place-items-center rounded-xl border transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/70 xl:hidden ${isMobileMenuOpen ? 'border-blue-300/30 bg-blue-400/10' : 'border-white/10 bg-white/[0.035] hover:border-white/20 hover:bg-white/[0.07]'}`}
        onClick={toggleMobileMenu}
        aria-label={t("shared/Navigation.NavigationMenu")}
        aria-expanded={isMobileMenuOpen}
        aria-controls={`primary-navigation-${navigationId}`}
        data-navigation-toggle
      >
        {/* 三条线都放在正中间，关闭时上下平移成“三”，打开时原地旋转成端正的 X（不靠切换 top，避免类名冲突） */}
        <span aria-hidden="true" className="relative h-[15px] w-5">
          <span className={`absolute left-0 top-[7px] h-px w-5 rounded-full bg-white/85 transition-[translate,rotate] duration-200 ${isMobileMenuOpen ? 'rotate-45' : '-translate-y-1.5'}`} />
          <span className={`absolute left-0 top-[7px] h-px w-5 rounded-full bg-white/85 transition-opacity duration-150 ${isMobileMenuOpen ? 'opacity-0' : ''}`} />
          <span className={`absolute left-0 top-[7px] h-px w-5 rounded-full bg-white/85 transition-[translate,rotate] duration-200 ${isMobileMenuOpen ? '-rotate-45' : 'translate-y-1.5'}`} />
        </span>
      </button>

      <ul
        id={`primary-navigation-${navigationId}`}
        className={`${isMobileMenuOpen ? 'flex' : 'hidden'} absolute left-0 top-[calc(100%+0.65rem)] z-1001 m-0 w-[min(20rem,calc(100vw-1.5rem))] list-none flex-col gap-0.5 rounded-2xl border border-white/10 bg-[rgb(10_13_20/97%)] p-2 shadow-[0_22px_60px_rgb(0_0_0/48%),0_1px_0_rgb(255_255_255/7%)_inset] backdrop-blur-2xl xl:static xl:flex xl:w-auto xl:min-w-0 xl:flex-row xl:items-center xl:gap-0.5 xl:rounded-none xl:border-0 xl:bg-transparent xl:p-0 xl:shadow-none xl:backdrop-blur-none`}
      >
        {NAVIGATION_ITEMS.map((item) => {
          if (item.kind === 'group') {
            return (
              <NavigationGroupView
                key={item.id}
                item={item}
                isOpen={openGroup === item.id}
                pathname={location.pathname}
                search={location.search}
                t={t}
                menuId={`${item.id}-navigation-${navigationId}`}
                triggerRef={(element) => {
                  groupTriggerRefs.current[item.id] = element;
                }}
                onToggle={() => toggleGroup(item.id)}
                onHoverStart={() => openGroupOnHover(item.id)}
                onHoverEnd={closeGroupOnHoverEnd}
                onNavigate={handleNavigate}
              />
            );
          }

          return (
            <li key={item.id} className="xl:min-w-0">
              <NavigationLinkView
                item={item}
                pathname={location.pathname}
                search={location.search}
                t={t}
                onNavigate={handleNavigate}
              />
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export default function Navigation() {
  const location = useLocation();
  return <NavigationContent key={`${location.pathname}${location.search}`} />;
}
