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

vi.mock('@/hooks', () => ({
  useI18n: () => ({
    i18n: (key: string, fallback?: string) => fallback ?? key,
  }),
}));

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
  const rankings = NAVIGATION_ITEMS.find((item) => item.id === 'rankings') as NavigationGroup;
  const originalSongs = NAVIGATION_ITEMS.find((item) => item.id === 'original-songs') as NavigationLink;
  const documentation = NAVIGATION_ITEMS.find((item) => item.id === 'documentation') as NavigationLink;

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

  it('keeps disclosure groups mutually exclusive', () => {
    renderNavigation();

    const rankings = container.querySelector('[data-navigation-group="rankings"]') as HTMLButtonElement;
    const tools = container.querySelector('[data-navigation-group="tools"]') as HTMLButtonElement;

    click(rankings);
    expect(rankings.getAttribute('aria-expanded')).toBe('true');

    click(tools);
    expect(rankings.getAttribute('aria-expanded')).toBe('false');
    expect(tools.getAttribute('aria-expanded')).toBe('true');
  });

  it('closes the active layer with Escape and restores focus', () => {
    renderNavigation();

    const toggle = container.querySelector('[data-navigation-toggle]') as HTMLButtonElement;
    const rankings = container.querySelector('[data-navigation-group="rankings"]') as HTMLButtonElement;
    click(toggle);
    click(rankings);

    act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })));
    expect(rankings.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(rankings);

    act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })));
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(toggle);
  });

  it('closes all navigation state after an internal route change', () => {
    renderNavigation();

    click(container.querySelector('[data-navigation-toggle]') as HTMLButtonElement);
    click(container.querySelector('[data-navigation-group="rankings"]') as HTMLButtonElement);
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
