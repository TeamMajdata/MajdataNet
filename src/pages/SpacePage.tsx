/**
 * 个人空间页面 (占位)
 * TODO: 完整实现个人空间、谱面列表等功能
 */

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { loc, setLanguage } from '@/utils/i18n';
import { PageLayout } from '@/components';

export default function SpacePage() {
  const [ready, setReady] = useState(false);
  const [searchParams] = useSearchParams();
  const userId = searchParams.get('id');

  useEffect(() => {
    setLanguage(localStorage.getItem('language') || navigator.language).then(() => {
      setReady(true);
    });
  }, []);

  if (!ready) return <div className="loading"></div>;

  return (
    <PageLayout>
      <div className="content-container">
        <h1>{loc('PersonalSpace', '个人空间')}</h1>
        <p>User: {userId || 'N/A'}</p>
        <p>{loc('ComingSoon', '即将推出...')}</p>
        <p>
          <a href="/">{loc('BackToHome', '返回主页')}</a>
        </p>
      </div>
    </PageLayout>
  );
}
