import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import useSWR from 'swr';
import { LuChevronRight } from 'react-icons/lu';
import { endpoints } from '@/config/api';
import { ApiError, apiFetcher } from '@/utils/apiClient';
import { useUserContext } from '@/hooks';
import { ImpressionScope } from '@/contexts/ImpressionContext';
import SongTileRow from './SongTileRow';
import type { Song } from '@/types';

/** 横栏最多放多少张 */
const MAX_SONGS = 30;

/** 卡片下面一行：上传者 */
const uploaderMeta = (song: Song) => (
  <Link to={'/space?id=' + encodeURIComponent(song.uploader)} className="text-inherit hover:text-white no-underline">{song.uploader}</Link>
);

/**
 * 首页“最近活跃”：原来下面“全部谱面”列表的默认排序（活跃），改成和上面一样的横栏；
 * 完整的列表（排序、翻页）在搜索页，标题旁边“查看全部”进去（不带搜索词）。
 */
export function ActiveRow() {
  const { t } = useTranslation();
  const { data } = useSWR<Song[]>(endpoints.maichart.listSearchAndSort('', '', 0), apiFetcher, { revalidateOnFocus: false });
  if (data && data.length === 0) return null;
  return (
    <SongTileRow
      id="home-active"
      title={t('home/HomeHighlights.RecentlyActive')}
      hint={
        <span className="flex flex-wrap items-center gap-x-2">
          {t('home/HomeHighlights.RecentlyActiveHint')}
          <Link to="/search" className="inline-flex items-center text-sky-300/80 hover:text-sky-200 no-underline">
            {t('home/HomeHighlights.ViewAll')}<LuChevronRight aria-hidden="true" className="w-3.5 h-3.5" />
          </Link>
        </span>
      }
      songs={data?.slice(0, MAX_SONGS)}
      meta={uploaderMeta}
    />
  );
}

/** 推荐接口一页的条数 */
const RECOMMEND_PAGE_SIZE = 30;

/**
 * 首页“个人推荐”：只给登录用户，没登录（或还在确认登录状态）不显示。
 * 曝光照样上报给推荐系统（ImpressionScope，卡片进入视野才算）。
 */
export function RecommendRow() {
  const { user } = useUserContext();
  if (!user) return null;
  return <RecommendRowContent userKey={user.id ?? user.username} />;
}

function RecommendRowContent({ userKey }: { userKey: string }) {
  const { t } = useTranslation();
  const { refetch } = useUserContext();
  // key 带上用户，切换账号时不会复用上一个人的推荐
  const { data, error } = useSWR<Song[], Error, [string, string]>(
    [endpoints.recommend.feed(0, RECOMMEND_PAGE_SIZE), userKey],
    ([url]) => apiFetcher<Song[]>(url),
    {
      revalidateOnFocus: false,
      onError: (err) => {
        // 会话过期：刷新登录状态，这一栏随之隐藏
        if (err instanceof ApiError && err.status === 401) refetch();
      },
    },
  );
  if (error || (data && data.length === 0)) return null;
  return (
    <ImpressionScope source="feed">
      <SongTileRow
        id="home-recommend"
        title={t('home/HomePage.PersonalRecommend')}
        hint={t('home/HomeHighlights.RecommendHint')}
        songs={data}
        meta={uploaderMeta}
      />
    </ImpressionScope>
  );
}
