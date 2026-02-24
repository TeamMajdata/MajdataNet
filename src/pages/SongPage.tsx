/**
 * 歌曲详情页 (占位)
 * TODO: 完整实现歌曲详情、评论、评分等功能
 */

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { loc, setLanguage } from '@/utils/i18n';
import { PageLayout } from '@/components';

export default function SongPage() {
  const [ready, setReady] = useState(false);
  const [searchParams] = useSearchParams();
  const songId = searchParams.get('id');

  useEffect(() => {
    setLanguage(localStorage.getItem('language') || navigator.language).then(() => {
      setReady(true);
    });
  }, []);

  if (!ready) return <div className="loading"></div>;

  return (
    <PageLayout className="song-page">
      <div className="content-container">
        <h1>{loc('SongDetails', '歌曲详情')}</h1>
        <p>Song ID: {songId || 'N/A'}</p>
        <p>{loc('ComingSoon', '即将推出...')}</p>
        <p>
          <a href="/">{loc('BackToHome', '返回主页')}</a>
        </p>
      </div>
    </PageLayout>
  );
}
