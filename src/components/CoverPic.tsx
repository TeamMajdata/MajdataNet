import { useState } from 'react';
import { apiroot3 } from '@/config/api';
import { PhotoProvider, PhotoView } from 'react-photo-view';
import 'react-photo-view/dist/react-photo-view.css';
import type { CoverPicProps } from '@/types';

/**
 * 谱面封面图片组件
 * 支持点击查看大图
 */
export default function CoverPic({ id, display }: CoverPicProps) {
  const [isLoaded, setIsLoaded] = useState(false);

  const url = `${apiroot3}/maichart/${id}/image`;
  const urlfull = `${apiroot3}/maichart/${id}/image?fullImage=true`;

  const idDisplay = display ? <div className="z-1 absolute bg-black/80 pr-1 pl-0.75 rounded-tl-[10px] rounded-br-[10px] select-none">{display}</div> : null;

  return (
    <>
      <PhotoProvider
        bannerVisible={false}
        loadingElement={<div className="m-auto border-[3px] border-[rgb(var(--background-start))] border-t-white border-solid rounded-full w-12.5 h-12.5 animate-[spin_0.1s_linear_infinite]"></div>}
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
