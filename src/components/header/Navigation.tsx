import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useI18n } from '@/hooks';
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

const TOP_LEVEL_ITEM = 'relative flex min-h-11 w-full items-center justify-between gap-3 rounded-xl px-4 text-sm font-medium tracking-[0.01em] no-underline transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#090b11] xl:min-h-0 xl:w-auto xl:justify-center xl:gap-2 xl:px-2.5 xl:py-2.5 2xl:px-3.5';
const TOP_LEVEL_IDLE = 'text-white/72 hover:bg-white/[0.055] hover:text-white';
const TOP_LEVEL_ACTIVE = 'bg-blue-400/[0.09] text-white';
const CHILD_ITEM = 'group flex min-h-11 items-center gap-3 rounded-lg px-4 pl-7 text-[0.8125rem] font-medium no-underline transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/70 xl:min-h-10 xl:px-3.5 xl:text-sm';
const CHILD_IDLE = 'text-white/66 hover:bg-white/[0.06] hover:text-white';
const CHILD_ACTIVE = 'bg-blue-400/[0.1] text-blue-100';

type Translate = (key: string, fallback?: string) => string;

interface NavigationLinkViewProps {
  item: NavigationLink;
  nested?: boolean;
  pathname: string;
  search: string;
  i18n: Translate;
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
      className={`absolute bottom-1.5 left-4 h-px rounded-full bg-blue-300 transition-all duration-200 xl:bottom-0 xl:left-1/2 xl:-translate-x-1/2 ${active ? 'w-5 opacity-100 xl:w-4' : 'w-0 opacity-0'}`}
    />
  );
}

function NavigationLinkView({
  item,
  nested = false,
  pathname,
  search,
  i18n,
  onNavigate,
}: NavigationLinkViewProps) {
  const active = isNavigationLinkActive(item, pathname, search);
  const className = nested
    ? `${CHILD_ITEM} ${active ? CHILD_ACTIVE : CHILD_IDLE}`
    : `${TOP_LEVEL_ITEM} ${active ? TOP_LEVEL_ACTIVE : TOP_LEVEL_IDLE}`;
  const content = (
    <>
      {nested && <ActiveMarker active={active} nested />}
      <span className="min-w-0 flex-1 text-left xl:flex-none xl:whitespace-nowrap">
        {i18n(item.labelKey)}
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
  i18n: Translate;
  menuId: string;
  triggerRef: (element: HTMLButtonElement | null) => void;
  onToggle: () => void;
  onNavigate: () => void;
}

function NavigationGroupView({
  item,
  isOpen,
  pathname,
  search,
  i18n,
  menuId,
  triggerRef,
  onToggle,
  onNavigate,
}: NavigationGroupViewProps) {
  const active = isNavigationItemActive(item, pathname, search);

  return (
    <li className="relative">
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
        <span className="min-w-0 flex-1 text-left xl:flex-none xl:whitespace-nowrap">
          {i18n(item.labelKey)}
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
        className={`${isOpen ? 'flex' : 'hidden'} mt-1 list-none flex-col gap-0.5 border-t border-white/[0.07] pt-1 xl:absolute xl:top-[calc(100%+0.55rem)] xl:left-0 xl:mt-0 xl:min-w-52 xl:rounded-xl xl:border xl:border-white/10 xl:bg-[rgb(10_13_20/96%)] xl:p-1.5 xl:shadow-[0_18px_50px_rgb(0_0_0/42%),0_1px_0_rgb(255_255_255/7%)_inset] xl:backdrop-blur-2xl`}
      >
        {item.children.map((child) => (
          <li key={child.id}>
            <NavigationLinkView
              item={child}
              nested
              pathname={pathname}
              search={search}
              i18n={i18n}
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
  const { i18n } = useI18n();
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

  const toggleGroup = (groupId: NavigationGroupId) => {
    setOpenGroup((currentGroup) => currentGroup === groupId ? null : groupId);
  };

  return (
    <nav ref={navigationRef} className="relative" aria-label={i18n("shared/Navigation.NavigationMenu", '主导航')}>
      <button
        ref={menuButtonRef}
        type="button"
        className={`relative grid h-11 w-11 touch-manipulation place-items-center rounded-xl border transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/70 xl:hidden ${isMobileMenuOpen ? 'border-blue-300/30 bg-blue-400/10' : 'border-white/10 bg-white/[0.035] hover:border-white/20 hover:bg-white/[0.07]'}`}
        onClick={toggleMobileMenu}
        aria-label={i18n("shared/Navigation.NavigationMenu", '主导航')}
        aria-expanded={isMobileMenuOpen}
        aria-controls={`primary-navigation-${navigationId}`}
        data-navigation-toggle
      >
        <span aria-hidden="true" className="relative h-4 w-5">
          <span className={`absolute left-0 top-0.5 h-px w-5 rounded-full bg-white/85 transition-all duration-200 ${isMobileMenuOpen ? 'top-2 rotate-45' : ''}`} />
          <span className={`absolute left-0 top-2 h-px w-5 rounded-full bg-white/85 transition-opacity duration-150 ${isMobileMenuOpen ? 'opacity-0' : ''}`} />
          <span className={`absolute left-0 top-3.5 h-px w-5 rounded-full bg-white/85 transition-all duration-200 ${isMobileMenuOpen ? 'top-2 -rotate-45' : ''}`} />
        </span>
      </button>

      <ul
        id={`primary-navigation-${navigationId}`}
        className={`${isMobileMenuOpen ? 'flex' : 'hidden'} absolute left-0 top-[calc(100%+0.65rem)] z-1001 m-0 w-[min(20rem,calc(100vw-1.5rem))] list-none flex-col gap-0.5 rounded-2xl border border-white/10 bg-[rgb(10_13_20/97%)] p-2 shadow-[0_22px_60px_rgb(0_0_0/48%),0_1px_0_rgb(255_255_255/7%)_inset] backdrop-blur-2xl xl:static xl:flex xl:w-auto xl:flex-row xl:items-center xl:gap-0.5 xl:rounded-[0.9rem] xl:border-white/[0.07] xl:bg-white/[0.035] xl:p-1 xl:shadow-none xl:backdrop-blur-sm`}
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
                i18n={i18n}
                menuId={`${item.id}-navigation-${navigationId}`}
                triggerRef={(element) => {
                  groupTriggerRefs.current[item.id] = element;
                }}
                onToggle={() => toggleGroup(item.id)}
                onNavigate={handleNavigate}
              />
            );
          }

          return (
            <li key={item.id}>
              <NavigationLinkView
                item={item}
                pathname={location.pathname}
                search={location.search}
                i18n={i18n}
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
