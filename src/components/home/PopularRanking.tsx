import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import useSWR from 'swr';
import { endpoints } from '@/config/api';
import { apiFetcher } from '@/utils/apiClient';
import { compactNumber } from '@/utils/interaction';
import { useLanguage } from '@/i18n';
import { useInteractSummary } from '@/hooks/useInteractSummary';
import InteractSummaryProvider from '@/components/song/InteractSummaryProvider';
import SongTileRow from './SongTileRow';
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
 * 和最近上传同一个横栏（横向自由滑动），封面左上角是名次，标题下面是游玩次数和赞数。
 */
export default function PopularRanking() {
  const { t } = useTranslation();
  const [active, setActive] = useState<typeof RANKINGS[number]>(RANKINGS[0]);
  const { data } = useSWR<Song[]>(endpoints.maichart.listRanking(active.sortType), apiFetcher, { revalidateOnFocus: false });
  const songs = data?.slice(0, 10);
  if (songs && songs.length === 0) return null;

  return (
    <InteractSummaryProvider ids={songs?.map(song => song.id) ?? []}>
      {/* 换榜单时整排重建，回到第一名 */}
      <SongTileRow
        key={active.key}
        id="home-popular"
        title={t('home/HomeHighlights.Popular')}
        hint={
          <div className="flex flex-wrap items-center gap-1" role="group" aria-label={t('home/HomeHighlights.SortBy')}>
            {RANKINGS.map(ranking => (
              <button key={ranking.key} type="button" aria-pressed={active.key === ranking.key} onClick={() => setActive(ranking)}
                className={`px-2 rounded-md h-6 text-xs transition-colors cursor-pointer ${active.key === ranking.key ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white'}`}>
                {t(ranking.label)}
              </button>
            ))}
          </div>
        }
        songs={songs}
        meta={(song) => <RankMeta songId={song.id} />}
        ranked
      />
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
