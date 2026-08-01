export type NavigationLink = {
  kind: 'link';
  id: string;
  labelKey: string;
  to: string;
  external?: boolean;
  match?: 'exact' | 'prefix';
  query?: Record<string, string>;
};

export type NavigationGroupId = 'rankings' | 'tools';

export type NavigationGroup = {
  kind: 'group';
  id: NavigationGroupId;
  labelKey: string;
  children: readonly NavigationLink[];
};

export type NavigationItem = NavigationLink | NavigationGroup;

export const NAVIGATION_ITEMS: readonly NavigationItem[] = [
  {
    kind: 'group',
    id: 'rankings',
    labelKey: 'Rankings',
    children: [
      { kind: 'link', id: 'recommend-ranking', labelKey: 'Recommend', to: '/ranking', match: 'exact' },
      { kind: 'link', id: 'user-ranking', labelKey: 'UserRankingTitle', to: '/ranking/user' },
      { kind: 'link', id: 'mmfc-ranking', labelKey: 'MMFCRanking', to: '/ranking/mmfc' },
    ],
  },
  {
    kind: 'group',
    id: 'tools',
    labelKey: 'Tools',
    children: [
      { kind: 'link', id: 'chart-editor', labelKey: 'ChartEditor', to: '/edit' },
      { kind: 'link', id: 'chart-player', labelKey: 'ChartPlayer', to: '/play' },
    ],
  },
  {
    kind: 'link',
    id: 'documentation',
    labelKey: 'Documentation',
    to: 'https://docs.majdata.net',
    external: true,
  },
  {
    kind: 'link',
    id: 'collection-hiroba',
    labelKey: 'CollectionHiroba',
    to: '/collection/hiroba',
  },
  {
    kind: 'link',
    id: 'contest',
    labelKey: 'Contest',
    to: '/chart-events',
  },
  {
    kind: 'link',
    id: 'original-songs',
    labelKey: 'OriginalSongs',
    to: '/eventTag?id=Original',
    query: { id: 'Original' },
  },
];

export function isNavigationLinkActive(
  item: NavigationLink,
  pathname: string,
  search: string,
): boolean {
  if (item.external) return false;

  const itemUrl = new URL(item.to, 'https://majdata.net');
  const pathMatches = item.match === 'prefix'
    ? pathname === itemUrl.pathname || pathname.startsWith(`${itemUrl.pathname}/`)
    : pathname === itemUrl.pathname;

  if (!pathMatches) return false;
  if (!item.query) return true;

  const searchParams = new URLSearchParams(search);
  return Object.entries(item.query).every(([key, value]) => searchParams.get(key) === value);
}

export function isNavigationItemActive(
  item: NavigationItem,
  pathname: string,
  search: string,
): boolean {
  if (item.kind === 'link') return isNavigationLinkActive(item, pathname, search);
  return item.children.some((child) => isNavigationLinkActive(child, pathname, search));
}
