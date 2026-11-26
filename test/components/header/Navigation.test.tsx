import { act } from 'react';
import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Navigation from '@/components/header/Navigation';
import {
  NAVIGATION_ITEMS,
  isNavigationItemActive,
  isNavigationLinkActive,
} from '@/components/header/navigationItems';
import type { NavigationGroup, NavigationLink } from '@/components/header/navigationItems';


const testGlobals = globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean };
testGlobals.IS_REACT_ACT_ENVIRONMENT = true;

function createMediaQueryList(query: string): MediaQueryList {
  return {
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  };
}

describe('navigation item matching', () => {
  // 站内的组（“工具”现在就属于这种：谱面编辑在站内、谱面游玩和文档是外链）
  const rankings: NavigationGroup = {
    kind: 'group',
    id: 'rankings',
    labelKey: 'shared/Navigation.Rankings',
    children: [{ kind: 'link', id: 'user-ranking', labelKey: 'shared/Navigation.UserRankingTitle', to: '/ranking/user' }],
  };
  const originalSongs = NAVIGATION_ITEMS.find((item) => item.id === 'original-songs') as NavigationLink;
  const tools = NAVIGATION_ITEMS.find((item) => item.id === 'tools') as NavigationGroup;
  const documentation = tools.children.find((child) => child.id === 'documentation') as NavigationLink;

  it('keeps five top-level entries: the documentation link lives in the tools menu', () => {
    // en/ja 在 1280px 的顶栏里放不下六项（见 docs/changelog/2026-11-26-header-locale-overflow.md）
    expect(NAVIGATION_ITEMS).toHaveLength(5);
    expect(NAVIGATION_ITEMS.map((item) => item.id)).not.toContain('documentation');
    expect(documentation.to).toBe('https://docs.majdata.net');
  });

  it('marks a group active when one of its children matches', () => {
    expect(isNavigationItemActive(rankings, '/ranking/user', '')).toBe(true);
    expect(isNavigationItemActive(rankings, '/chart-events', '')).toBe(false);
  });

  it('includes query parameters when matching a link', () => {
    expect(isNavigationLinkActive(originalSongs, '/eventTag', '?id=Original')).toBe(true);
    expect(isNavigationLinkActive(originalSongs, '/eventTag', '?id=Other')).toBe(false);
  });

  it('never treats an external link as the current route', () => {
    expect(isNavigationLinkActive(documentation, '/', '')).toBe(false);
  });
});

describe('Navigation', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: vi.fn((query: string) => createMediaQueryList(query)),
    });
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.restoreAllMocks();
  });

  function renderNavigation(initialEntry = '/') {
    act(() => {
      root.render(
        <MemoryRouter initialEntries={[initialEntry]}>
          <Navigation />
        </MemoryRouter>,
      );
    });
  }

  function click(element: HTMLElement) {
    act(() => element.click());
  }

  it('uses one navigation tree and exposes it from the mobile toggle', () => {
    renderNavigation();

    const toggle = container.querySelector('[data-navigation-toggle]') as HTMLButtonElement;
    const navigationTree = document.getElementById(toggle.getAttribute('aria-controls')!);

    expect(container.querySelectorAll('nav')).toHaveLength(1);
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(navigationTree).not.toBeNull();

    click(toggle);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(navigationTree?.classList.contains('flex')).toBe(true);
  });

  it('closes the active layer with Escape and restores focus', () => {
    renderNavigation();

    const toggle = container.querySelector('[data-navigation-toggle]') as HTMLButtonElement;
    const tools = container.querySelector('[data-navigation-group="tools"]') as HTMLButtonElement;
    click(toggle);
    click(tools);

    act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })));
    expect(tools.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(tools);

    act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })));
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(toggle);
  });

  it('closes all navigation state after an internal route change', () => {
    renderNavigation();

    click(container.querySelector('[data-navigation-toggle]') as HTMLButtonElement);
    click(container.querySelector('[data-navigation-group="tools"]') as HTMLButtonElement);
    const userRankingLink = container.querySelector('a[href="/ranking/user"]') as HTMLAnchorElement;
    click(userRankingLink);

    const newToggle = container.querySelector('[data-navigation-toggle]') as HTMLButtonElement;
    const currentLink = container.querySelector('a[href="/ranking/user"]') as HTMLAnchorElement;
    expect(newToggle.getAttribute('aria-expanded')).toBe('false');
    expect(currentLink.getAttribute('aria-current')).toBe('page');
  });

  it('uses a native external link with safe window attributes', () => {
    renderNavigation('/eventTag?id=Original');

    const externalLink = container.querySelector('a[href="https://docs.majdata.net"]') as HTMLAnchorElement;
    const currentLink = container.querySelector('a[href="/eventTag?id=Original"]') as HTMLAnchorElement;
    expect(externalLink.target).toBe('_blank');
    expect(externalLink.rel).toBe('noopener noreferrer');
    expect(currentLink.getAttribute('aria-current')).toBe('page');
  });
});
