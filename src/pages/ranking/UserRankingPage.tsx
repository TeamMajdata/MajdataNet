/**
 * 肝帝榜：按所有成绩的总达成率给玩家排名
 */

import { useTranslation } from 'react-i18next';
import { PageLayout, ScoreCount } from '@/components';

export default function UserRankingPage() {
  const { t } = useTranslation();

  return (
    <PageLayout showBackToHome={false}>
      <div className="mx-auto py-5 sm:py-8 w-full max-w-320 min-w-0">
        <header className="mb-5 sm:mb-6">
          <h1 className="m-0 font-semibold text-white! text-2xl! sm:text-3xl! text-left! tracking-tight">
            {t("ranking/user/UserRankingPage.UserRankingTitle")}
          </h1>
          <p className="m-0 mt-1.5 text-white/55! text-sm">{t("ranking/user/UserRankingPage.UserRankingDescription")}</p>
        </header>

        <ScoreCount uploader="" page={0} pageSize={100} />
      </div>
    </PageLayout>
  );
}
