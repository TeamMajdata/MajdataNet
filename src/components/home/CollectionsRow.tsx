import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import useSWR from 'swr';
import { Swiper, SwiperSlide } from 'swiper/react';
import { FreeMode, Mousewheel } from 'swiper/modules';
import type { Swiper as SwiperInstance } from 'swiper';
import 'swiper/css';
import 'swiper/css/free-mode';
import { LuChevronRight } from 'react-icons/lu';
import { endpoints } from '@/config/api';
import { apiFetcher } from '@/utils/apiClient';
import CollectionCard from '@/components/collection/CollectionCard';
import { CARD_SURFACE_CLASS } from '@/components/ui/surface';
import { CarouselHeader } from './carousel';
import type { Collection } from '@/types';

const COUNT = 12;
/** 卡片阴影向两边扩散的宽度（CARD_SURFACE_CLASS 里最大的那层阴影：60px 模糊） */
const SHADOW_BLEED = 60;

/**
 * 滑动区域往内容列两边各伸出多少：最多是阴影的宽度，但不能超出屏幕边缘
 * （超出的话手机会把整页缩小，桌面窄窗口也会多出横向滚动）
 */
function useShadowBleed() {
  const ref = useRef<HTMLElement>(null);
  const [bleed, setBleed] = useState(0);
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const measure = () => {
      const rect = element.getBoundingClientRect();
      const room = Math.min(rect.left, document.documentElement.clientWidth - rect.right);
      setBleed(Math.max(0, Math.min(SHADOW_BLEED, Math.floor(room))));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    window.addEventListener('resize', measure);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, []);
  return [ref, bleed] as const;
}

/**
 * 首页“歌单广场”横栏：歌单广场第一页的歌单，和最近上传一样横向自由滑动，标题旁边可以进入完整的歌单广场。
 */
export default function CollectionsRow() {
  const { t } = useTranslation();
  const { data } = useSWR<Collection[]>(endpoints.collection.list(0, COUNT), apiFetcher, { revalidateOnFocus: false });
  const [swiper, setSwiper] = useState<SwiperInstance | null>(null);
  const [sectionRef, bleed] = useShadowBleed();
  if (data && data.length === 0) return null;

  const step = (direction: -1 | 1) => {
    if (!swiper || !data) return;
    const shown = Math.max(1, Math.floor((swiper.width - 2 * bleed) / ((swiper.slides[0]?.offsetWidth ?? swiper.width) + 12)));
    swiper.slideTo(Math.max(0, Math.min(data.length - 1, swiper.activeIndex + direction * shown)));
  };

  return (
    <section ref={sectionRef} aria-labelledby="home-collections" className="mb-10">
      <CarouselHeader
        id="home-collections"
        title={t('home/HomeHighlights.Collections')}
        hint={
          <span className="flex flex-wrap items-center gap-x-2">
            {t('home/HomeHighlights.CollectionsHint')}
            <Link to="/collection/hiroba" className="inline-flex items-center text-sky-300/80 hover:text-sky-200 no-underline">
              {t('home/HomeHighlights.ViewAll')}<LuChevronRight aria-hidden="true" className="w-3.5 h-3.5" />
            </Link>
          </span>
        }
        onStep={data ? step : undefined}
      />
      {data ? (
        <Swiper
          modules={[FreeMode, Mousewheel]}
          onSwiper={setSwiper}
          slidesPerView="auto"
          spaceBetween={12}
          slidesOffsetBefore={bleed}
          slidesOffsetAfter={bleed}
          freeMode={{ enabled: true, momentumRatio: 0.6 }}
          mousewheel={{ forceToAxis: true }}
          grabCursor
          wrapperTag="ul"
          // Swiper 默认 overflow: hidden，卡片的大阴影四边都被裁成硬边的暗块：
          // - 竖向不裁（overflow-x: clip 允许 y 方向保持 visible），阴影和悬停上浮完整显示；
          // - 横向：滑动区域往左右各伸出阴影的宽度（不超出屏幕，见 useShadowBleed），第一张卡片仍然对齐内容列，
          //   停在开头时阴影完整；滑动时卡片多露出这一段再被切掉，卡片和阴影在同一条线上一起切
          className="my-0! p-0! overflow-x-clip! overflow-y-visible!"
          style={{ marginInline: -bleed, '--bleed': bleed + 'px' } as CSSProperties}
        >
          {data.map((collection) => (
            <SwiperSlide key={collection.id} tag="li" className="w-[calc((100%-2*var(--bleed))*0.85)]! sm:w-[calc((100%-2*var(--bleed)-12px)/2.15)]! lg:w-[calc((100%-2*var(--bleed)-24px)/3.15)]! h-auto! list-none">
              <CollectionCard collection={collection} />
            </SwiperSlide>
          ))}
        </Swiper>
      ) : (
        <div className="gap-3 grid sm:grid-cols-2 lg:grid-cols-3" aria-hidden="true">
          {Array.from({ length: 3 }, (_, i) => <div key={i} className={`${CARD_SURFACE_CLASS} h-28 animate-pulse ${i > 0 ? 'max-sm:hidden' : ''} ${i > 1 ? 'max-lg:hidden' : ''}`} />)}
        </div>
      )}
    </section>
  );
}
