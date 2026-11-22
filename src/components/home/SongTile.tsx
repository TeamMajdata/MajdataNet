import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { endpoints } from '@/config/api';
import { parseTmpRichText } from '@/utils/richTextUtils';
import Levels from '@/components/score/Levels';
import { RANK_BADGE_CLASS } from '@/components/score/rankBadge';
import { useImpressionRef } from '@/hooks/useImpressionRef';
import type { Song } from '@/types';

/**
 * 首页展柜的谱面卡片：大封面 + 难度标签叠在封面左下角，下面是标题和一行小字。
 * 最近上传和人气榜共用；人气榜在封面左上角标出名次。
 */
export default function SongTile({ song, meta, rank }: {
  song: Song;
  /** 标题下面的一行小字 */
  meta: ReactNode;
  /** 排行榜名次，从 1 开始 */
  rank?: number;
}) {
  const href = '/song?id=' + song.id;
  // 处在 ImpressionScope 里（个人推荐）时登记曝光，其他地方是空操作
  const impressionRef = useImpressionRef(song.hash);
  return (
    <div ref={impressionRef} className="group min-w-0">
      <div className="relative">
        <Link to={href} className="block bg-white/5 rounded-xl aspect-[4/3] overflow-hidden" aria-label={song.title}>
          <img src={endpoints.maichart.image(song.id)} alt="" loading="lazy" draggable={false} className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300" />
        </Link>
        {/* 名次：前三名金银铜 */}
        {rank !== undefined && (
          <span className={`top-2 left-2 absolute shadow-[0_2px_8px_rgb(0_0_0/0.4)] px-1.5 py-0.5 rounded font-bold text-xs tabular-nums leading-none pointer-events-none ${RANK_BADGE_CLASS[rank - 1] ?? 'bg-black/70 text-white/90'}`}>
            #{rank}
          </span>
        )}
        {/* 难度标签叠在封面左下角，各自可点进对应难度。左右都要定住：宽度是封面的宽度，
            Levels 才知道能放几个，放不下的收进“+N”；空着的地方不挡点击封面 */}
        <div className="right-2 bottom-2 left-2 absolute drop-shadow-[0_2px_6px_rgb(0_0_0/0.6)] pointer-events-none [&_a]:pointer-events-auto [&_span[title]]:pointer-events-auto">
          <Levels levels={song.levels} songid={song.id} linkToSong />
        </div>
      </div>
      <Link to={href} className="block mt-2.5 font-semibold text-white group-hover:text-blue-200 text-sm truncate no-underline transition-colors">
        {parseTmpRichText(song.title) || song.title}
      </Link>
      <div className="mt-0.5 text-white/50 text-xs truncate">{meta}</div>
    </div>
  );
}

/** 加载中：和真实卡片同样大小的灰块，内容出来时页面不跳 */
export function SongTileSkeleton() {
  return (
    <div aria-hidden="true">
      <div className="bg-white/[0.06] rounded-xl aspect-[4/3] animate-pulse" />
      <div className="bg-white/[0.06] mt-2.5 rounded w-3/4 h-4" />
      <div className="bg-white/[0.04] mt-1.5 rounded w-1/2 h-3" />
    </div>
  );
}
