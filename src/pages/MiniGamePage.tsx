/**
 * 小游戏页面
 * 迁移自 legacy/src/app/minigame/page.jsx
 */
import { PageLayout, MiniGame } from '@/components';
import { useI18n } from '@/hooks';

export default function MiniGamePage() {
  const { i18n } = useI18n();

  return (
    <PageLayout
      title={i18n("minigame/MiniGamePage.MiniGame")}
      showFooter={true}
    >
      <div className="flex justify-center p-4">
        <MiniGame />
      </div>
    </PageLayout>
  );
}
