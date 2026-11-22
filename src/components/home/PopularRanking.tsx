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

/**
 * 原来推荐榜的四个榜单（七天内按游玩、评价、评论、下载排序，各取前 10），以前是一行里的四个页签，现在各占一行。
 * 文案键：title / hint
 */
const RANKINGS = [
  { id: 'home-popular', sortType: 'scorep', title: 'home/HomeHighlights.Popular', hint: 'home/HomeHighlights.PopularHint' },
  { id: 'home-rating', sortType: 'topp', title: 'home/HomeHighlights.RatingRanking', hint: 'home/HomeHighlights.RatingRankingHint' },
  { id: 'home-comments', sortType: 'commp', title: 'home/HomeHighlights.CommentRanking', hint: 'home/HomeHighlights.CommentRankingHint' },
  { id: 'home-downloads', sortType: 'playp', title: 'home/HomeHighlights.DownloadRanking', hint: 'home/HomeHighlights.DownloadRankingHint' },
] as const;

/**
 * 首页的七日排行榜（替代原来的推荐榜页面）：游玩、评价、评论、下载四个榜各一行，
 * 和最近上传同一个横栏（横向自由滑动），封面左上角是名次，标题下面是游玩次数和赞数。
 */
export default function PopularRanking() {
  return <>{RANKINGS.map((ranking) => <RankingRow key={ranking.id} {...ranking} />)}</>;
}

function RankingRow({ id, sortType, title, hint }: typeof RANKINGS[number]) {
  const { t } = useTranslation();
  const { data } = useSWR<Song[]>(endpoints.maichart.listRanking(sortType), apiFetcher, { revalidateOnFocus: false });
  const songs = data?.slice(0, 10);
  if (songs && songs.length === 0) return null;

  return (
    <InteractSummaryProvider ids={songs?.map(song => song.id) ?? []}>
      <SongTileRow id={id} title={t(title)} hint={t(hint)} songs={songs} meta={(song) => <RankMeta songId={song.id} />} ranked />
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
