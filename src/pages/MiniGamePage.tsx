/**
 * 小游戏页面
 */
import { useTranslation } from 'react-i18next';
import { PageLayout, MiniGame } from '@/components';

export default function MiniGamePage() {
  const { t } = useTranslation();

  return (
    <PageLayout
      title={t("minigame/MiniGamePage.MiniGame")}
      showFooter={true}
    >
      <div className="flex justify-center p-4">
        <MiniGame />
      </div>
    </PageLayout>
  );
}
