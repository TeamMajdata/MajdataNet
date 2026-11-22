import { useState } from 'react';
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

/**
 * 首页“歌单广场”横栏：歌单广场第一页的歌单，和最近上传一样横向自由滑动，标题旁边可以进入完整的歌单广场。
 */
export default function CollectionsRow() {
  const { t } = useTranslation();
  const { data } = useSWR<Collection[]>(endpoints.collection.list(0, COUNT), apiFetcher, { revalidateOnFocus: false });
  const [swiper, setSwiper] = useState<SwiperInstance | null>(null);
  if (data && data.length === 0) return null;

  const step = (direction: -1 | 1) => {
    if (!swiper || !data) return;
    const shown = Math.max(1, Math.floor(swiper.width / ((swiper.slides[0]?.offsetWidth ?? swiper.width) + 12)));
    swiper.slideTo(Math.max(0, Math.min(data.length - 1, swiper.activeIndex + direction * shown)));
  };

  return (
    <section aria-labelledby="home-collections" className="mb-10">
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
          freeMode={{ enabled: true, momentumRatio: 0.6 }}
          mousewheel={{ forceToAxis: true }}
          grabCursor
          wrapperTag="ul"
          // 上面留出悬停上浮的距离（卡片上移 5px），不然会被 Swiper 裁掉一条边
          className="-mt-1.5! m-0! pt-1.5! p-0!"
        >
          {data.map((collection) => (
            <SwiperSlide key={collection.id} tag="li" className="w-[85%]! sm:w-[calc((100%-12px)/2.15)]! lg:w-[calc((100%-24px)/3.15)]! h-auto! list-none">
              <CollectionCard collection={collection} flat />
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
