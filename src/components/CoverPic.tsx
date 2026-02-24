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

  const idDisplay = display ? <div className="songId">{display}</div> : null;

  return (
    <>
      <PhotoProvider
        bannerVisible={false}
        loadingElement={<div className="loading"></div>}
      >
        <PhotoView src={urlfull}>
          <img
            className={`songImg ${isLoaded ? 'loadedImg' : 'loadingImg'}`}
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
