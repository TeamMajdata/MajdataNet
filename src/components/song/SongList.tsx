/**
 * SongList 组件 - 歌曲列表
 * 迁移自 legacy/src/app/widgets/SongList.jsx
 */

import useSWR from 'swr';
import { useI18n } from '@/hooks';
import SongCard from './SongCard';
import { LoadingSpinner } from '@/components';
import type { Song, SongListProps } from '@/types';


const fetcher = (url: string) =>
  fetch(url, { mode: 'cors', credentials: 'include' }).then((res) => res.json());

export default function SongList({ url, setMax, page, isRanking, isManage, onDataLoaded }: SongListProps) {
  const { i18n } = useI18n();

  const { data, error, isLoading } = useSWR<Song[]>(url, fetcher, {
    revalidateOnFocus: false,
    onSuccess: (data) => {
      onDataLoaded?.(!!data && Array.isArray(data) && data.length > 0);
    },
  });

  if (error) return <div className="m-auto w-full text-2xl sm:text-[50px] text-center">{i18n("song/SongList.ServerError", '服务器错误')}</div>;
  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-20 w-full"><LoadingSpinner size="50px" /></div>
    );
  }

  if (data && data.length < 30 && data.length > 0) {
    if (page != null && setMax != null) setMax(page);
  }

  if (!data || !Array.isArray(data) || data.length === 0) {
    return <div className="m-auto w-full text-2xl sm:text-[50px] text-center">{i18n("song/SongList.EmptyData", '暂无数据')}</div>;
  }

  return (
    <div className="justify-center gap-3 sm:gap-[0.6rem] grid grid-cols-[minmax(0,20.6rem)] sm:grid-cols-[repeat(auto-fit,minmax(20rem,20.6rem))] mx-auto p-0 sm:p-2 w-full max-w-350 min-w-0">
      {data.map((song, index) => (
        <SongCard
          key={song.id}
          song={song}
          index={index}
          isRanking={isRanking}
          isManage={isManage}
          page={page}
        />
      ))}
    </div>
  );
}
