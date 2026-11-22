import { useState } from 'react';
import { Link } from 'react-router-dom';
import { endpoints } from '@/config/api';
import type { CoverPicProps } from '@/types';

/**
 * 谱面封面图片组件
 * 传 to 时点击跳转到该地址，否则只展示。
 * （以前还能点开看大图，但没有地方用；看大图在谱面页单独做，免得把图片查看器带进首屏）
 */
export default function CoverPic({ id, display, to, radiusClassName = 'rounded-[10px]' }: CoverPicProps) {
  const [isLoaded, setIsLoaded] = useState(false);

  const url = endpoints.maichart.image(id);

  const idDisplay = display ? <div className={`z-1 absolute bg-black/80 pr-1 pl-0.75 rounded-br-md select-none ${radiusClassName.replace(/rounded-/, 'rounded-tl-')}`}>{display}</div> : null;

  const image = (
    <img
      className={`float-left ${radiusClassName} h-full aspect-square object-cover transition-opacity duration-300 ease-in-out ${to ? 'cursor-pointer' : ''} ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
      decoding="async"
      loading="lazy"
      src={url}
      alt=""
      onLoad={() => setIsLoaded(true)}
    />
  );

  const cover = to ? <Link to={to} tabIndex={-1} aria-hidden="true">{image}</Link> : image;

  return (
    <>
      {cover}
      {idDisplay}
    </>
  );
}
