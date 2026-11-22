import type { ReactNode } from 'react';
import SongTile from './SongTile';
import TileRow from './TileRow';
import type { Song } from '@/types';

/** 首页的谱面横栏（最近上传、七日排行、最近活跃、个人推荐） */
export default function SongTileRow({ id, title, hint, songs, meta, ranked = false }: {
  id: string;
  title: string;
  hint: ReactNode;
  songs: Song[] | undefined;
  /** 卡片标题下面的一行小字 */
  meta: (song: Song) => ReactNode;
  /** 排行榜：封面左上角标出名次 */
  ranked?: boolean;
}) {
  return (
    <TileRow
      id={id}
      title={title}
      hint={hint}
      items={songs}
      itemKey={(song) => song.id}
      renderItem={(song, index) => <SongTile song={song} rank={ranked ? index + 1 : undefined} meta={meta(song)} />}
    />
  );
}
