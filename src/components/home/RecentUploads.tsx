import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import useSWR from 'swr';
import { Swiper, SwiperSlide } from 'swiper/react';
import { FreeMode, Mousewheel } from 'swiper/modules';
import type { Swiper as SwiperInstance } from 'swiper';
import 'swiper/swiper-bundle.css';
import { endpoints } from '@/config/api';
import { apiFetcher } from '@/utils/apiClient';
import { getLocale, useLanguage } from '@/i18n';
import SongTile, { SongTileSectionSkeleton } from './SongTile';
import { CarouselHeader } from './carousel';
import type { Song } from '@/types';

/** 最多取 30 张 */
const MAX_SONGS = 30;

/**
 * 首页“最近上传”：最新上传的谱面，横向自由滑动（和活动轮播一样用手指 / 鼠标拖，触控板横向滚动也行），不自动滑。
 * 每排露出下一张的一部分，提示还能往右滑；宽屏约 5 张，平板 3 张，手机 2 张。
 */
export default function RecentUploads() {
  const { t } = useTranslation();
  const language = useLanguage();
  const { data } = useSWR<Song[]>(endpoints.maichart.listSearchAndSort('', 'timep', 0), apiFetcher, { revalidateOnFocus: false });
  const [swiper, setSwiper] = useState<SwiperInstance | null>(null);
  const songs = data?.slice(0, MAX_SONGS) ?? [];
  if (!data) return <SongTileSectionSkeleton />;
  if (songs.length === 0) return null;

  // 按钮一次滑过当前能看到的张数
  const step = (direction: -1 | 1) => {
    if (!swiper) return;
    const shown = Math.max(1, Math.floor(swiper.width / ((swiper.slides[0]?.offsetWidth ?? swiper.width) + 16)));
    const index = Math.max(0, Math.min(songs.length - 1, swiper.activeIndex + direction * shown));
    swiper.slideTo(index);
  };

  return (
    <section aria-labelledby="home-recent-uploads" className="mb-10">
      <CarouselHeader id="home-recent-uploads" title={t('home/HomeHighlights.RecentUploads')} hint={t('home/HomeHighlights.RecentUploadsHint')} onStep={step} />
      <Swiper
        modules={[FreeMode, Mousewheel]}
        onSwiper={setSwiper}
        slidesPerView="auto"
        spaceBetween={16}
        freeMode={{ enabled: true, momentumRatio: 0.6 }}
        mousewheel={{ forceToAxis: true }}
        grabCursor
        wrapperTag="ul"
        className="m-0! p-0!"
      >
        {songs.map((song) => {
          const uploaded = new Date(song.timestamp ?? '');
          return (
            <SwiperSlide key={song.id} tag="li" className="w-[calc((100%-16px)/2.25)]! sm:w-[calc((100%-32px)/3.25)]! lg:w-[calc((100%-64px)/5.25)]! min-w-0 list-none">
              <SongTile song={song} meta={<>
                <Link to={'/space?id=' + encodeURIComponent(song.uploader)} className="text-inherit hover:text-white no-underline">{song.uploader}</Link>
                {Number.isFinite(uploaded.getTime()) && <> · {uploaded.toLocaleDateString(getLocale(language), { month: 'short', day: 'numeric' })}</>}
              </>} />
            </SwiperSlide>
          );
        })}
      </Swiper>
    </section>
  );
}
