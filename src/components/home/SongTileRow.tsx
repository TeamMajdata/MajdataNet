import type { ReactNode } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { FreeMode, Mousewheel } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/free-mode';
import { NATIVE_SCROLL } from './touchScroll';
import SongTile, { SongTileSkeleton } from './SongTile';
import { CarouselHeader } from './carousel';
import type { Song } from '@/types';

const GAP_PX = 16;
/** 每张卡片的宽度：手机 2.25 张、平板 3.25 张、宽屏 5.25 张，露出下一张的一角提示还能往右滑 */
const SLIDE_CLASS = 'w-[calc((100%-16px)/2.25)]! sm:w-[calc((100%-32px)/3.25)]! lg:w-[calc((100%-64px)/5.25)]! min-w-0 shrink-0 list-none';

/**
 * 首页的谱面横栏（最近上传、七日人气榜共用）：标题行 + 一排大封面卡片，横向自由滑动
 * （手指 / 鼠标拖，触控板横向滚动也行），不自动滑。
 * songs 还没到时显示同样大小的灰色卡片，标题行（包括人气榜的排序按钮）一直在。
 */
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
    <section aria-labelledby={id} className="mb-10">
      <CarouselHeader id={id} title={title} hint={hint} />
      {songs ? (
        <Swiper
          modules={[FreeMode, Mousewheel]}
          slidesPerView="auto"
          cssMode={NATIVE_SCROLL}
          spaceBetween={GAP_PX}
          freeMode={{ enabled: true, momentumRatio: 0.6 }}
          mousewheel={{ forceToAxis: true }}
          grabCursor
          wrapperTag="ul"
          className="m-0! p-0!"
        >
          {songs.map((song, index) => (
            <SwiperSlide key={song.id} tag="li" className={SLIDE_CLASS}>
              <SongTile song={song} rank={ranked ? index + 1 : undefined} meta={meta(song)} />
            </SwiperSlide>
          ))}
        </Swiper>
      ) : (
        <ul className="flex gap-4 m-0 p-0 overflow-hidden" aria-hidden="true">
          {Array.from({ length: 6 }, (_, i) => <li key={i} className={SLIDE_CLASS}><SongTileSkeleton /></li>)}
        </ul>
      )}
    </section>
  );
}
