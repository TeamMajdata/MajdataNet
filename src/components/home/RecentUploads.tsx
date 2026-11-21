import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import useSWR from 'swr';
import { endpoints } from '@/config/api';
import { apiFetcher } from '@/utils/apiClient';
import { getLocale, useLanguage } from '@/i18n';
import SongTile, { SongTileSectionSkeleton } from './SongTile';
import { CarouselHeader } from './carousel';
import { useCarousel, usePerPage } from './useCarousel';
import type { Song } from '@/types';

/** 最多取 15 张：宽屏 5 张一页正好 3 页 */
const MAX_SONGS = 15;

/**
 * 首页“最近上传”：最新上传的谱面，大封面 + 难度标签叠在封面左下角，下面是标题和“上传者 · 日期”。
 * 和人气榜一样自动翻页；宽屏一页 5 张，平板 3 张，手机 2 张。
 */
export default function RecentUploads() {
  const { t } = useTranslation();
  const language = useLanguage();
  const { data } = useSWR<Song[]>(endpoints.maichart.listSearchAndSort('', 'timep', 0), apiFetcher, { revalidateOnFocus: false });
  const songs = data?.slice(0, MAX_SONGS) ?? [];
  const perPage = usePerPage([[0, 2], [640, 3], [1024, 5]]);
  const carousel = useCarousel(songs.length, perPage);
  if (!data) return <SongTileSectionSkeleton />;
  if (songs.length === 0) return null;
  const visible = songs.slice(carousel.page * perPage, carousel.page * perPage + perPage);

  return (
    <section aria-labelledby="home-recent-uploads" className="mb-10" {...carousel.hoverProps}>
      <CarouselHeader id="home-recent-uploads" title={t('home/HomeHighlights.RecentUploads')} hint={t('home/HomeHighlights.RecentUploadsHint')} carousel={carousel} />
      <ul key={carousel.page} className="gap-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 m-0 p-0 list-none motion-safe:animate-[carousel-in_.35s_ease-out]">
        {visible.map((song) => {
          const uploaded = new Date(song.timestamp ?? '');
          return (
            <li key={song.id} className="min-w-0">
              <SongTile song={song} meta={<>
                <Link to={'/space?id=' + encodeURIComponent(song.uploader)} className="text-inherit hover:text-white no-underline">{song.uploader}</Link>
                {Number.isFinite(uploaded.getTime()) && <> · {uploaded.toLocaleDateString(getLocale(language), { month: 'short', day: 'numeric' })}</>}
              </>} />
            </li>
          );
        })}
      </ul>
    </section>
  );
}
