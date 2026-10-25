import { useI18n } from '@/hooks';
import { PageLayout, ScoreCount, LoadingSpinner } from '@/components';

export default function UserRankingPage() {
  const { i18n, isReady } = useI18n();

  if (!isReady) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <LoadingSpinner className="border-white border-b-2 rounded-full w-12 h-12" />
      </div>
    );
  }

  return (
    <PageLayout className="pb-8">
      {/* 页面标题和说明 */}
      <div className="mt-4 sm:mt-8 mb-6 sm:mb-8 text-center">
        <h1
          className="mb-3 sm:mb-4 font-bold text-white text-3xl sm:text-4xl"
          style={{
            textShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
          }}
        >
          {i18n("ranking/user/UserRankingPage.UserRankingTitle", '用户排行榜')}
        </h1>
        <p
          className="mx-auto mt-3 sm:mt-4 max-w-2xl text-white/80 text-base sm:text-xl leading-relaxed"
          style={{
            textShadow: '0 1px 4px rgba(0, 0, 0, 0.2)',
          }}
        >
          {i18n("ranking/user/UserRankingPage.UserRankingDescription", '这里展示所有用户的总分排名')}
        </p>
      </div>

      {/* 排名列表 */}
      <div
        className="mx-auto p-3 sm:p-6 md:p-8 max-w-7xl"
        style={{
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.03))',
          backdropFilter: 'blur(10px)',
          borderRadius: '16px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
        }}
      >
        <ScoreCount uploader="" page={0} pageSize={100} />
      </div>
    </PageLayout>
  );
}
