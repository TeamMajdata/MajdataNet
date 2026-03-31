import { useState } from 'react';
import { endpoints } from '@/config/api';
import { PhotoProvider, PhotoView } from 'react-photo-view';
import 'react-photo-view/dist/react-photo-view.css';
import type { CoverPicProps } from '@/types';
import LoadingSpinner from './LoadingSpinner';

/**
 * 谱面封面图片组件
 * 支持点击查看大图
 */
export default function CoverPic({ id, display }: CoverPicProps) {
  const [isLoaded, setIsLoaded] = useState(false);

  const url = endpoints.maichart.image(id);
  const urlfull = endpoints.maichart.fullImage(id);

  const idDisplay = display ? <div className="z-1 absolute bg-black/80 pr-1 pl-0.75 rounded-tl-[10px] rounded-br-[10px] select-none">{display}</div> : null;

  return (
    <>
      <PhotoProvider
        bannerVisible={false}
        loadingElement={<LoadingSpinner size="50px" />}
      >
        <PhotoView src={urlfull}>
          <img
            className={`float-left rounded-[10px] h-full aspect-square object-cover cursor-pointer transition-opacity duration-300 ease-in-out ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
            decoding="async"
            loading="lazy"
            src={url}
            alt=""
            onLoad={() => setIsLoaded(true)}
          />
        </PhotoView>
      </PhotoProvider>
      {idDisplay}
    </>
  );
}
