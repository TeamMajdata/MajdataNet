import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import useSWR from 'swr';
import { endpoints } from '@/config/api';
import { apiFetcher } from '@/utils/apiClient';
import { compactNumber } from '@/utils/interaction';
import { useLanguage } from '@/i18n';
import { useInteractSummary } from '@/hooks/useInteractSummary';
import InteractSummaryProvider from '@/components/song/InteractSummaryProvider';
import SongTile, { SongTileGridSkeleton } from './SongTile';
import { CarouselHeader } from './carousel';
import { useCarousel, usePerPage } from './useCarousel';
import type { Song } from '@/types';

/** 原来推荐榜的四个榜单：七天内按游玩、评价、评论、下载排序，各取前 10 */
const RANKINGS = [
  { key: 'play', sortType: 'scorep', label: 'home/HomeHighlights.ByPlays' },
  { key: 'score', sortType: 'topp', label: 'home/HomeHighlights.ByRating' },
  { key: 'comment', sortType: 'commp', label: 'home/HomeHighlights.ByComments' },
  { key: 'download', sortType: 'playp', label: 'home/HomeHighlights.ByDownloads' },
] as const;

/**
 * 首页“七日人气榜”：替代原来的推荐榜页面。标题下面一排小字切换按什么排。
 * 版式和最近上传一样（大封面卡片，宽屏一页 5 张，平板 3 张，手机 2 张），封面左上角是名次，
 * 标题下面是游玩次数和赞数；自动翻页。
 */
export default function PopularRanking() {
  const { t } = useTranslation();
  const [active, setActive] = useState<typeof RANKINGS[number]>(RANKINGS[0]);
  const { data } = useSWR<Song[]>(endpoints.maichart.listRanking(active.sortType), apiFetcher, { revalidateOnFocus: false });
  const songs = data?.slice(0, 10) ?? [];
  const perPage = usePerPage([[0, 2], [640, 3], [1024, 5]]);
  const carousel = useCarousel(songs.length, perPage);
  if (data && songs.length === 0) return null;
  const start = carousel.page * perPage;

  return (
    <InteractSummaryProvider ids={songs.map(song => song.id)}>
      <section aria-labelledby="home-popular" className="mb-10" {...carousel.hoverProps}>
        <CarouselHeader
          id="home-popular"
          title={t('home/HomeHighlights.Popular')}
          carousel={carousel}
          hint={
            <div className="flex flex-wrap items-center gap-1" role="group" aria-label={t('home/HomeHighlights.SortBy')}>
              {RANKINGS.map(ranking => (
                <button key={ranking.key} type="button" aria-pressed={active.key === ranking.key} onClick={() => { setActive(ranking); carousel.setPage(0); }}
                  className={`px-2 rounded-md h-6 text-xs transition-colors cursor-pointer ${active.key === ranking.key ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white'}`}>
                  {t(ranking.label)}
                </button>
              ))}
            </div>
          }
        />
        {data ? (
          <ul key={active.key + carousel.page} className="gap-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 m-0 p-0 list-none motion-safe:animate-[carousel-in_.35s_ease-out]">
            {songs.slice(start, start + perPage).map((song, index) => (
              <li key={song.id} className="min-w-0">
                <SongTile song={song} rank={start + index + 1} meta={<RankMeta songId={song.id} />} />
              </li>
            ))}
          </ul>
        ) : <SongTileGridSkeleton />}
      </section>
    </InteractSummaryProvider>
  );
}

/** “3,444 次游玩 · 22 个赞”：计数来自整页共用的一次批量请求 */
function RankMeta({ songId }: { songId: string }) {
  const { t } = useTranslation();
  const language = useLanguage();
  const summary = useInteractSummary(songId);
  if (!summary) return <span>&nbsp;</span>;
  return (
    <span className="tabular-nums">
      {t('home/HomeHighlights.Plays', { count: summary.plays, formatted: compactNumber(summary.plays, language) })}
      {' · '}
      {t('home/HomeHighlights.Likes', { count: summary.upvotes, formatted: compactNumber(summary.upvotes, language) })}
    </span>
  );
}
