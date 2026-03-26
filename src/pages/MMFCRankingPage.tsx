/**
 * MMFC排行榜页面
 * 迁移自 legacy/src/app/mmfc-ranking/page.jsx
 * 显示指定参与者对 mmfc_bot 谱面的游玩总分排名
 */

import { useEffect, useState } from 'react';
import { setLanguage } from '@/utils/i18n';
import { useLoc } from '@/hooks';
import { PageLayout, EventBanner } from '@/components';
import LoadingSpinner from '@/components/LoadingSpinner';
import MMFCScoreCount from '@/components/MMFCScoreCount';
import { EventCategory, type Event } from '@/types';

export default function MMFCRankingPage() {
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
        <LoadingSpinner className="border-white border-b-2 rounded-full w-12 h-12" />
      </div>
    );
  }

  // MMFC活动信息
  const mmfcEvent: Event = {
    id: 'mmfc12',
    href: '/mmfc-ranking',
    src: '/events/MMFC12.jpg',
    alt: loc('MMFCRankingTitle', 'MMFC排行榜'),
    title: loc('MMFCRankingTitle', 'MMFC排行榜'),
    category: EventCategory.Major,
    createDate: new Date().toISOString().split('T')[0],
    endDate: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().split('T')[0],
    description: loc('MMFCRankingDescription', 'MMFC打榜活动排名'),
  };

  return (
    <PageLayout className="pb-8">
      {/* MMFC活动横幅 */}
      <div className="mt-4">
        <EventBanner event={mmfcEvent} />
      </div>

      {/* 打榜排名 */}
      <div
        className="mx-auto mt-8 px-4 max-w-5xl"
        style={{
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.03))',
          backdropFilter: 'blur(10px)',
          borderRadius: '16px',
          padding: '2rem',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
        }}
      >
        <div className="mb-6 text-center">
          <h2
            className="mb-2 font-bold text-white text-3xl"
            style={{
              textShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
            }}
          >
            {loc('MMFCRankingListTitle', '打榜排名')}
          </h2>
          <p
            className="text-white/70 text-base"
            style={{
              textShadow: '0 1px 4px rgba(0, 0, 0, 0.2)',
            }}
          >
            {loc('MMFCRankingListDescription', '参赛选手对 mmfc_bot 谱面的游玩总分排名')}
          </p>
        </div>

        {/* 显示指定用户对 mmfc_bot 谱面的游玩总分排名 */}
        <MMFCScoreCount />
      </div>
    </PageLayout>
  );
}
