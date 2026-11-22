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

/** 七天内按游玩次数排的前 10（原来推荐榜四个榜单里的“游玩”榜） */
const SORT_TYPE = 'scorep';

/**
 * 首页“七日人气榜”：替代原来的推荐榜页面。
 * 和最近上传同一个横栏（横向自由滑动），封面左上角是名次，标题下面是游玩次数和赞数。
 */
export default function PopularRanking() {
  const { t } = useTranslation();
  const { data } = useSWR<Song[]>(endpoints.maichart.listRanking(SORT_TYPE), apiFetcher, { revalidateOnFocus: false });
  const songs = data?.slice(0, 10);
  if (songs && songs.length === 0) return null;

  return (
    <InteractSummaryProvider ids={songs?.map(song => song.id) ?? []}>
      <SongTileRow
        id="home-popular"
        title={t('home/HomeHighlights.Popular')}
        hint={t('home/HomeHighlights.PopularHint')}
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
