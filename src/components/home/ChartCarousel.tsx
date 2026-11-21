import { useEffect, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { LuChevronLeft, LuChevronRight } from 'react-icons/lu';
import { endpoints } from '@/config/api';
import { parseTmpRichText } from '@/utils/richTextUtils';
import { CARD_SURFACE_CLASS, SECTION_HEADING_CLASS } from '@/components/ui/surface';
import { RANK_BADGE_CLASS } from '@/components/score/rankBadge';
import type { Song } from '@/types';

const PER_PAGE = 3;
const INTERVAL_MS = 7000;

const CONTROL_CLASS = 'grid place-items-center bg-white/[0.04] hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-lg w-8 h-8 text-white/70 hover:text-white transition-colors cursor-pointer';

/**
 * 首页的一段横向轮播：标题和说明在左，翻页和页码在右；一页三张谱面（窄屏竖着排）。
 * 每隔几秒自动翻到下一页；鼠标停在上面、页面在后台、或用户开了“减少动态效果”时不自动翻。
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
  const { t } = useTranslation();
  const [page, setPage] = useState(0);
  const [hovered, setHovered] = useState(false);
  const pages = Math.max(1, Math.ceil((songs?.length ?? 0) / PER_PAGE));
  const current = Math.min(page, pages - 1);

  useEffect(() => {
    if (hovered || pages <= 1) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timer = window.setInterval(() => {
      if (!document.hidden) setPage(p => (p + 1) % pages);
    }, INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [hovered, pages]);

  if (songs && songs.length === 0) return null;
  const visible = songs?.slice(current * PER_PAGE, current * PER_PAGE + PER_PAGE);

  return (
    <section aria-labelledby={id} className="mb-10" onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
      <div className="flex justify-between items-end gap-3 mb-4">
        <div className="min-w-0">
          <h2 id={id} className={`${SECTION_HEADING_CLASS} mb-0! text-lg!`}>{title}</h2>
          <div className="mt-1 text-white/50 text-xs">{hint}</div>
        </div>
        {pages > 1 && (
          <div className="flex items-center gap-1.5 shrink-0">
            <button type="button" className={CONTROL_CLASS} onClick={() => setPage((current - 1 + pages) % pages)} aria-label={t('home/HomeHighlights.Previous')}>
              <LuChevronLeft aria-hidden="true" className="w-4 h-4" />
            </button>
            <span className="min-w-10 text-white/55 text-xs text-center tabular-nums" aria-live="polite">{current + 1} / {pages}</span>
            <button type="button" className={CONTROL_CLASS} onClick={() => setPage((current + 1) % pages)} aria-label={t('home/HomeHighlights.Next')}>
              <LuChevronRight aria-hidden="true" className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

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
