import { useI18n } from '@/hooks';
import { PageLayout, EventBanner, LoadingSpinner, MMFCScoreCount } from '@/components';
import { EventCategory, type Event } from '@/types';

export default function MMFCRankingPage() {
  const { i18n, isReady } = useI18n();

  if (!isReady) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <LoadingSpinner className="border-white border-b-2 rounded-full w-12 h-12" />
      </div>
    );
  }

  // MMFC活动信息
  const mmfcEvent: Event = {
    id: 'mmfc12',
    href: '/ranking/mmfc',
    src: '/events/MMFC12.jpg',
    alt: i18n("ranking/mmfc/MMFCRankingPage.MMFCRankingTitle", 'MMFC排行榜'),
    title: i18n("ranking/mmfc/MMFCRankingPage.MMFCRankingTitle", 'MMFC排行榜'),
    category: EventCategory.Major,
    createDate: new Date().toISOString().split('T')[0],
    endDate: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().split('T')[0],
    description: i18n("ranking/mmfc/MMFCRankingPage.MMFCRankingDescription", 'MMFC打榜活动排名'),
  };

  return (
    <PageLayout className="pb-8">
      {/* MMFC活动横幅 */}
      <div className="mt-4">
        <EventBanner event={mmfcEvent} />
      </div>

      {/* 打榜排名 */}
      <div
        className="mx-auto mt-5 sm:mt-8 p-3 sm:p-6 md:p-8 max-w-5xl"
        style={{
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.03))',
          backdropFilter: 'blur(10px)',
          borderRadius: '16px',
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
            {i18n("ranking/mmfc/MMFCRankingPage.MMFCRankingListTitle", '打榜排名')}
          </h2>
          <p
            className="text-white/70 text-base"
            style={{
              textShadow: '0 1px 4px rgba(0, 0, 0, 0.2)',
            }}
          >
            {i18n("ranking/mmfc/MMFCRankingPage.MMFCRankingListDescription", '参赛选手对 mmfc_bot 谱面的游玩总分排名')}
          </p>
        </div>

        {/* 显示指定用户对 mmfc_bot 谱面的游玩总分排名 */}
        <MMFCScoreCount />
      </div>
    </PageLayout>
  );
}
