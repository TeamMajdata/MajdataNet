/**
 * SongList 组件 - 歌曲列表
 */

import { useTranslation } from 'react-i18next';
import EmptyState from '@/components/ui/EmptyState';
import SectionLoading from '@/components/ui/SectionLoading';
import { useEffect } from 'react';
import useSWR from 'swr';
import SongCard from './SongCard';
import InteractSummaryProvider from './InteractSummaryProvider';
import type { Song, SongListProps } from '@/types';
import { API_PAGE_SIZE, SONG_GRID_CLASS } from './songGrid';


const fetchJson = (url: string) =>
  fetch(url, { mode: 'cors', credentials: 'include' }).then((res) => res.json());

// 多个接口页按顺序拼接；翻页期间列表变动可能让相邻页重复，按 id 去重
const fetcher = async (key: string): Promise<Song[]> => {
  const pages = await Promise.all(key.split('\n').map(fetchJson));
  if (pages.length === 1) return pages[0];
  const seen = new Set<string>();
  return pages.flatMap((page: Song[]) => (Array.isArray(page) ? page : []))
    .filter((song) => !seen.has(song.id) && seen.add(song.id));
};

export default function SongList({ url, setMax, page, isRanking, isManage, onDataLoaded, gridClassName }: SongListProps) {
  const { t } = useTranslation();

  const urls = Array.isArray(url) ? url : [url];
  const { data, error, isLoading } = useSWR<Song[]>(urls.join('\n'), fetcher, {
    revalidateOnFocus: false,
    onSuccess: (data) => {
      onDataLoaded?.(!!data && Array.isArray(data) && data.length > 0);
    },
  });

  // 不足一页即为最后一页；放在 effect 里通知父组件，避免在渲染期间更新父组件状态
  const isLastPage = !!data && data.length > 0 && data.length < API_PAGE_SIZE * urls.length;
  useEffect(() => {
    if (isLastPage && page != null) setMax?.(page);
  }, [isLastPage, page, setMax]);

  if (error) return <EmptyState>{t("song/SongList.ServerError")}</EmptyState>;
  if (isLoading) {
    return (
      <SectionLoading />
    );
  }

  if (!data || !Array.isArray(data) || data.length === 0) {
    return <EmptyState>{t("song/SongList.EmptyData")}</EmptyState>;
  }

  // 整页卡片的计数由一次批量请求提供，卡片不再各自请求
  return (
    <InteractSummaryProvider ids={data.map((song) => song.id)}>
      <div className={gridClassName ?? SONG_GRID_CLASS}>
        {data.map((song, index) => (
          <SongCard
            key={song.id}
            song={song}
            index={index}
            isRanking={isRanking}
            isManage={isManage}
          />
        ))}
      </div>
    </InteractSummaryProvider>
  );
}
