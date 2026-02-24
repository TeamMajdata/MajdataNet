/**
 * 用户排行榜页面
 * 迁移自 legacy/src/app/user-ranking/page.jsx
 * 显示所有用户的总分排名
 */

import { useEffect, useState } from 'react';
import { setLanguage } from '@/utils/i18n';
import { useLoc } from '@/hooks';
import { PageLayout, ScoreCount } from '@/components';

export default function UserRankingPage() {
  const loc = useLoc();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setLanguage(localStorage.getItem('language') || navigator.language).then(() => {
      setReady(true);
    });
  }, []);

  if (!ready) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="border-white border-b-2 rounded-full w-12 h-12 animate-spin"></div>
      </div>
    );
  }

  return (
    <PageLayout className="pb-8">
      {/* 页面标题和说明 */}
      <div className="mt-8 mb-8 text-center">
        <h1 
          className="mb-4 font-bold text-4xl text-white"
          style={{
            textShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
          }}
        >
          {loc('UserRankingTitle', '用户排行榜')}
        </h1>
        <p 
          className="mx-auto mt-4 max-w-2xl text-white/80 text-xl leading-relaxed"
          style={{
            textShadow: '0 1px 4px rgba(0, 0, 0, 0.2)',
          }}
        >
          {loc('UserRankingDescription', '这里展示所有用户的总分排名')}
        </p>
      </div>

      {/* 排名列表 */}
      <div 
        className="mx-auto px-4 max-w-7xl"
        style={{
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.03))',
          backdropFilter: 'blur(10px)',
          borderRadius: '16px',
          padding: '2rem',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
        }}
      >
        <ScoreCount uploader="" page={0} pageSize={100} />
      </div>
    </PageLayout>
  );
}
