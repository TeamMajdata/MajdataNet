/**
 * 小游戏页面
 */
import { useTranslation } from 'react-i18next';
import { PageLayout, MiniGame } from '@/components';

export default function MiniGamePage() {
  const { t } = useTranslation();

  return (
    <PageLayout>
      {/* 标题居中，和下面居中的游戏画面对齐；字号和其他页面的标题一致 */}
      <div className="mx-auto py-5 sm:py-8 w-full max-w-160 min-w-0">
        <h1 className="m-0 mb-5 sm:mb-6 font-semibold text-white! text-2xl! sm:text-3xl! text-center! tracking-tight">
          {t("minigame/MiniGamePage.MiniGame")}
        </h1>
        <MiniGame />
      </div>
    </PageLayout>
  );
}
