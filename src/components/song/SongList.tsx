/**
 * SongList 组件 - 歌曲列表
 * 迁移自 legacy/src/app/widgets/SongList.jsx
 */

import useSWR from "swr";
import { useLoc } from "@/hooks";
import SongCard from "./SongCard";
import { LoadingSpinner } from "@/components";
import type { Song, SongListProps } from "@/types";

const fetcher = (url: string) =>
  fetch(url, { mode: "cors", credentials: "include" }).then((res) =>
    res.json(),
  );

export default function SongList({
  url,
  setMax,
  page,
  isRanking,
  isManage,
  onDataLoaded,
}: SongListProps) {
  const loc = useLoc();

  const { data, error, isLoading } = useSWR<Song[]>(url, fetcher, {
    revalidateOnFocus: false,
    onSuccess: (data) => {
      onDataLoaded?.(!!data && Array.isArray(data) && data.length > 0);
    },
  });

  if (error)
    return (
      <div className="m-auto w-full text-[50px] text-center">
        {loc("ServerError", "服务器错误")}
      </div>
    );
  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-20 w-full">
        <LoadingSpinner size="50px" />
      </div>
    );
  }

  if (data && data.length < 30 && data.length > 0) {
    if (page != null && setMax != null) setMax(page);
  }

  if (!data || !Array.isArray(data) || data.length === 0) {
    return (
      <div className="m-auto w-full text-[50px] text-center">
        {loc("EmptyData", "暂无数据")}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap justify-center gap-4 mx-auto p-2 w-full">
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
