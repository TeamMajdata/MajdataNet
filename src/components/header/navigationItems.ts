import type { TranslationKey } from '@/i18n';

export type NavigationLink = {
  kind: 'link';
  id: string;
  labelKey: TranslationKey;
  to: string;
  external?: boolean;
  match?: 'exact' | 'prefix';
  query?: Record<string, string>;
};

export type NavigationGroupId = 'rankings' | 'tools';

export type NavigationGroup = {
  kind: 'group';
  id: NavigationGroupId;
  labelKey: TranslationKey;
  children: readonly NavigationLink[];
};

export type NavigationItem = NavigationLink | NavigationGroup;

export const NAVIGATION_ITEMS: readonly NavigationItem[] = [
  // 站内页面在前，跳到外部网站的（工具）放在最后
  // 推荐榜已经做成首页的“七日人气榜”，榜单只剩肝帝榜，直接放一个链接
  { kind: 'link', id: 'user-ranking', labelKey: 'shared/Navigation.UserRankingTitle', to: '/ranking/user' },
  {
    kind: 'link',
    id: 'collection-hiroba',
    labelKey: 'shared/Navigation.CollectionHiroba',
    to: '/collection/hiroba',
  },
  {
    kind: 'link',
    id: 'contest',
    labelKey: 'shared/Navigation.Contest',
    to: '/chart-events',
  },
  {
    kind: 'link',
    id: 'original-songs',
    labelKey: 'shared/Navigation.OriginalSongs',
    to: '/eventTag?id=Original',
    query: { id: 'Original' },
  },
  {
    kind: 'group',
    id: 'tools',
    labelKey: 'shared/Navigation.Tools',
    children: [
      // 站内自己的编辑器页面（原来是跳到 MajdataX 文档）
      { kind: 'link', id: 'chart-editor', labelKey: 'shared/Navigation.ChartEditor', to: '/editor' },
      { kind: 'link', id: 'chart-player', labelKey: 'shared/Navigation.ChartPlayer', to: 'https://docs.majdata.net/majdataplay/', external: true },
      // 文档站点也收进「工具」：顶栏在 en/ja 下一行放不下第六项（见 docs/changelog）
      { kind: 'link', id: 'documentation', labelKey: 'shared/Navigation.Documentation', to: 'https://docs.majdata.net', external: true },
    ],
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
