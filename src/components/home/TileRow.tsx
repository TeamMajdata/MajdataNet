import type { ReactNode } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { FreeMode, Mousewheel } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/free-mode';
import { NATIVE_SCROLL } from './touchScroll';
import { SongTileSkeleton } from './SongTile';
import { CarouselHeader } from './carousel';

const GAP_PX = 16;
/** 每张卡片的宽度：手机 2.25 张、平板 3.25 张、宽屏 5.25 张，露出下一张的一角提示还能往右滑 */
const SLIDE_CLASS = 'w-[calc((100%-16px)/2.25)]! sm:w-[calc((100%-32px)/3.25)]! lg:w-[calc((100%-64px)/5.25)]! min-w-0 shrink-0 list-none';

/**
 * 首页的横栏（谱面、歌单共用）：标题行 + 一排大封面卡片，横向自由滑动
 * （手指 / 鼠标拖，触控板横向滚动也行），不自动滑。
 * items 还没到时显示同样大小的灰色卡片，标题行一直在。
 */
export default function TileRow<T>({ id, title, hint, items, itemKey, renderItem }: {
  id: string;
  title: string;
  hint: ReactNode;
  items: T[] | undefined;
  itemKey: (item: T) => string;
  renderItem: (item: T, index: number) => ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="mb-10">
      <CarouselHeader id={id} title={title} hint={hint} />
      {items ? (
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
          {items.map((item, index) => (
            <SwiperSlide key={itemKey(item)} tag="li" className={SLIDE_CLASS}>
              {renderItem(item, index)}
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
