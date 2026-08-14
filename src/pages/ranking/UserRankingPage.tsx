import { useEffect, useState } from 'react';
import { setLanguage } from '@/utils/i18n';
import { useLoc } from '@/hooks';
import { PageLayout, ScoreCount, LoadingSpinner } from '@/components';

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
        <LoadingSpinner className="w-12 h-12" />
      </div>
    );
  }

  return (
    <PageLayout className="pb-8">
      {/* 页面标题和说明 */}
      <div className="mt-8 mb-8 text-center">
        <h1 className="mb-4 font-bold text-ink text-[2rem]">
          {loc('UserRankingTitle', '用户排行榜')}
        </h1>
        <p className="mt-4 max-w-2xl text-ink-2 text-lg leading-relaxed">
          {loc('UserRankingDescription', '这里展示所有用户的总分排名')}
        </p>
      </div>

      {/* 排名列表 */}
      <div className="px-4">
        <div className="rounded-xl p-5 md:p-8">
          <ScoreCount uploader="" page={0} pageSize={100} />
        </div>
      </div>
    </PageLayout>
  );
}
