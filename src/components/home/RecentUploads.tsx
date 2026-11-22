import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import useSWR from 'swr';
import { endpoints } from '@/config/api';
import { apiFetcher } from '@/utils/apiClient';
import { getLocale, useLanguage } from '@/i18n';
import SongTileRow from './SongTileRow';
import type { Song } from '@/types';

/** 最多取 30 张 */
const MAX_SONGS = 30;

/**
 * 首页“最近上传”：最新上传的谱面，横向自由滑动；卡片下面是上传者和日期。
 */
export default function RecentUploads() {
  const { t } = useTranslation();
  const language = useLanguage();
  const { data } = useSWR<Song[]>(endpoints.maichart.listSearchAndSort('', 'timep', 0), apiFetcher, { revalidateOnFocus: false });
  if (data && data.length === 0) return null;

  return (
    <SongTileRow
      id="home-recent-uploads"
      title={t('home/HomeHighlights.RecentUploads')}
      hint={t('home/HomeHighlights.RecentUploadsHint')}
      songs={data?.slice(0, MAX_SONGS)}
      meta={(song) => {
        const uploaded = new Date(song.timestamp ?? '');
        return <>
          <Link to={'/space?id=' + encodeURIComponent(song.uploader)} className="text-inherit hover:text-white no-underline">{song.uploader}</Link>
          {Number.isFinite(uploaded.getTime()) && <> · {uploaded.toLocaleDateString(getLocale(language), { month: 'short', day: 'numeric' })}</>}
        </>;
      }}
    />
  );
}
