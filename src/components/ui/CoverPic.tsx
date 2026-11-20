import { useState } from 'react';
import { Link } from 'react-router-dom';
import { endpoints } from '@/config/api';
import { PhotoProvider, PhotoView } from 'react-photo-view';
import 'react-photo-view/dist/react-photo-view.css';
import type { CoverPicProps } from '@/types';
import LoadingSpinner from './LoadingSpinner';

/**
 * 谱面封面图片组件
 * 传 to 时点击跳转到该地址；zoomable 时点击查看大图；否则只展示。
 */
export default function CoverPic({ id, display, to, zoomable = true }: CoverPicProps) {
  const [isLoaded, setIsLoaded] = useState(false);

  const url = endpoints.maichart.image(id);
  const urlfull = endpoints.maichart.fullImage(id);

  const idDisplay = display ? <div className="z-1 absolute bg-black/80 pr-1 pl-0.75 rounded-tl-[10px] rounded-br-[10px] select-none">{display}</div> : null;

  const image = (
    <img
      className={`float-left rounded-[10px] h-full aspect-square object-cover transition-opacity duration-300 ease-in-out ${to || zoomable ? 'cursor-pointer' : ''} ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
      decoding="async"
      loading="lazy"
      src={url}
      alt=""
      onLoad={() => setIsLoaded(true)}
    />
  );

  let cover = image;
  if (to) {
    cover = <Link to={to} tabIndex={-1} aria-hidden="true">{image}</Link>;
  } else if (zoomable) {
    cover = (
      <PhotoProvider
        bannerVisible={false}
        loadingElement={<LoadingSpinner size="50px" />}
      >
        <PhotoView src={urlfull}>{image}</PhotoView>
      </PhotoProvider>
    );
  }

  return (
    <>
      {cover}
      {idDisplay}
    </>
  );
}
