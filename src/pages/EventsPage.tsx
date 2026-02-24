/**
 * 活动页面 (占位)
 * TODO: 完整实现活动列表和筛选功能
 */

import { useEffect, useState } from 'react';
import { loc, setLanguage } from '@/utils/i18n';
import { PageLayout } from '@/components';

export default function EventsPage() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setLanguage(localStorage.getItem('language') || navigator.language).then(() => {
      setReady(true);
    });
  }, []);

  if (!ready) return <div className="loading"></div>;

  return (
    <PageLayout className="events-page">
      <div className="content-container">
        <h1>{loc('Events', '活动')}</h1>
        <p>{loc('ComingSoon', '即将推出...')}</p>
        <p>
          <a href="/">{loc('BackToHome', '返回主页')}</a>
        </p>
      </div>
    </PageLayout>
  );
}
