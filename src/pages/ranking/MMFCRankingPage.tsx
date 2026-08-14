import { useEffect, useState } from 'react';
import { setLanguage } from '@/utils/i18n';
import { useLoc } from '@/hooks';
import { PageLayout, EventBanner, LoadingSpinner, MMFCScoreCount } from '@/components';
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
        <LoadingSpinner className="w-12 h-12" />
      </div>
    );
  }

  // MMFC活动信息
  const mmfcEvent: Event = {
    id: 'mmfc12',
    href: '/ranking/mmfc',
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
      <div className="mx-auto mt-8 px-4 max-w-5xl">
        <div className="rounded-xl p-5 md:p-8">
          <div className="mb-6 text-center">
            <h2 className="mb-2 font-bold text-ink text-2xl md:text-3xl">
              {loc('MMFCRankingListTitle', '打榜排名')}
            </h2>
            <p className="text-ink-2 text-base">
              {loc('MMFCRankingListDescription', '参赛选手对 mmfc_bot 谱面的游玩总分排名')}
            </p>
          </div>

          {/* 显示指定用户对 mmfc_bot 谱面的游玩总分排名 */}
          <MMFCScoreCount />
        </div>
      </div>
    </PageLayout>
  );
}
