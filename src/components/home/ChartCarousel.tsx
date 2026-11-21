import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { endpoints } from '@/config/api';
import { parseTmpRichText } from '@/utils/richTextUtils';
import { CARD_SURFACE_CLASS } from '@/components/ui/surface';
import { CarouselHeader } from './carousel';
import { useCarousel } from './useCarousel';
import { RANK_BADGE_CLASS } from '@/components/score/rankBadge';
import type { Song } from '@/types';

const PER_PAGE = 3;

/**
 * 首页的一段横向轮播：一页三张谱面（窄屏竖着排），标题行和自动翻页见 carousel.tsx。
 */
export default function ChartCarousel({ id, title, hint, songs, renderMeta, ranked = false }: {
  id: string;
  title: string;
  /** 标题下面的一行说明（可以是排序切换） */
  hint: ReactNode;
  songs: Song[] | undefined;
  /** 每张卡片标题和曲师下面的一行小字 */
  renderMeta: (song: Song) => ReactNode;
  /** 排行榜：封面左上角标出名次 */
  ranked?: boolean;
}) {
  const carousel = useCarousel(songs?.length ?? 0, PER_PAGE);
  if (songs && songs.length === 0) return null;
  const current = carousel.page;
  const visible = songs?.slice(current * PER_PAGE, current * PER_PAGE + PER_PAGE);

  return (
    <section aria-labelledby={id} className="mb-10" {...carousel.hoverProps}>
      <CarouselHeader id={id} title={title} hint={hint} carousel={carousel} />
      <ul key={current} className="gap-3 lg:gap-4 grid lg:grid-cols-3 m-0 p-0 list-none motion-safe:animate-[carousel-in_.35s_ease-out]">
        {visible
          ? visible.map((song, index) => (
            <li key={song.id} className="min-w-0">
              <ChartRow song={song} rank={ranked ? current * PER_PAGE + index + 1 : undefined} meta={renderMeta(song)} />
            </li>
          ))
          : Array.from({ length: PER_PAGE }, (_, i) => <li key={i} className={`${CARD_SURFACE_CLASS} h-28 animate-pulse`} aria-hidden="true" />)}
      </ul>
    </section>
  );
}

function ChartRow({ song, rank, meta }: { song: Song; rank?: number; meta: ReactNode }) {
  const href = '/song?id=' + song.id;
  return (
    <div className={`${CARD_SURFACE_CLASS} group flex items-center gap-4 p-3 sm:p-4 h-full min-w-0`}>
      <Link to={href} className="block relative bg-white/5 rounded-lg size-20 sm:size-22 overflow-hidden shrink-0" aria-label={song.title}>
        <img src={endpoints.maichart.image(song.id)} alt="" loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        {/* 名次：和推荐榜谱面卡片一样的标签，前三名金银铜 */}
        {rank !== undefined && (
          <span className={`top-1.5 left-1.5 absolute shadow-[0_2px_8px_rgb(0_0_0/0.4)] px-1.5 py-0.5 rounded font-bold text-[0.7rem] tabular-nums leading-none ${RANK_BADGE_CLASS[rank - 1] ?? 'bg-black/70 text-white/90'}`}>
            #{rank}
          </span>
        )}
      </Link>
      <div className="min-w-0">
        <Link to={href} className="block font-semibold text-white group-hover:text-blue-200 text-base truncate no-underline transition-colors">
          {parseTmpRichText(song.title) || song.title}
        </Link>
        <p className="m-0 mt-0.5 text-white/60! text-sm truncate">{song.artist || '-'}</p>
        <div className="mt-2 text-white/45 text-xs truncate">{meta}</div>
      </div>
    </div>
  );
}
