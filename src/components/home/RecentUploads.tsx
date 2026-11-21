import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import useSWR from 'swr';
import { endpoints } from '@/config/api';
import { apiFetcher } from '@/utils/apiClient';
import { getLocale, useLanguage } from '@/i18n';
import { parseTmpRichText } from '@/utils/richTextUtils';
import Levels from '@/components/score/Levels';
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
  if (!data) return <SectionSkeleton count={5} />;
  if (songs.length === 0) return null;
  const visible = songs.slice(carousel.page * perPage, carousel.page * perPage + perPage);

  return (
    <section aria-labelledby="home-recent-uploads" className="mb-10" {...carousel.hoverProps}>
      <CarouselHeader id="home-recent-uploads" title={t('home/HomeHighlights.RecentUploads')} hint={t('home/HomeHighlights.RecentUploadsHint')} carousel={carousel} />
      <ul key={carousel.page} className="gap-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 m-0 p-0 list-none motion-safe:animate-[carousel-in_.35s_ease-out]">
        {visible.map((song) => {
          const href = '/song?id=' + song.id;
          const uploaded = new Date(song.timestamp ?? '');
          return (
            <li key={song.id} className="group min-w-0">
              <div className="relative">
                <Link to={href} className="block bg-white/5 rounded-xl aspect-[4/3] overflow-hidden" aria-label={song.title}>
                  <img src={endpoints.maichart.image(song.id)} alt="" loading="lazy" className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300" />
                </Link>
                {/* 难度标签叠在封面左下角，各自可点进对应难度 */}
                <div className="bottom-2 left-2 absolute drop-shadow-[0_2px_6px_rgb(0_0_0/0.6)]">
                  <Levels levels={song.levels} songid={song.id} linkToSong />
                </div>
              </div>
              <Link to={href} className="block mt-2.5 font-semibold text-white group-hover:text-blue-200 text-sm truncate no-underline transition-colors">
                {parseTmpRichText(song.title) || song.title}
              </Link>
              <p className="m-0 mt-0.5 text-white/50! text-xs truncate">
                <Link to={'/space?id=' + encodeURIComponent(song.uploader)} className="text-inherit hover:text-white no-underline">{song.uploader}</Link>
                {Number.isFinite(uploaded.getTime()) && <> · {uploaded.toLocaleDateString(getLocale(language), { month: 'short', day: 'numeric' })}</>}
              </p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** 加载中：和真实布局同样大小的灰块，内容出来时页面不跳 */
function SectionSkeleton({ count }: { count: number }) {
  return (
    <div className="mb-10" aria-hidden="true">
      <div className="bg-white/[0.06] mb-4 rounded w-24 h-5" />
      <div className="gap-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: count }, (_, i) => (
          <div key={i} className={i >= 4 ? 'max-lg:hidden' : ''}>
            <div className="bg-white/[0.06] rounded-xl aspect-[4/3] animate-pulse" />
            <div className="bg-white/[0.06] mt-2.5 rounded w-3/4 h-4" />
            <div className="bg-white/[0.04] mt-1.5 rounded w-1/2 h-3" />
          </div>
        ))}
      </div>
    </div>
  );
}
