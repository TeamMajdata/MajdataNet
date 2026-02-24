/**
 * 小游戏页面
 * 迁移自 legacy/src/app/minigame/page.jsx
 */
import { PageLayout, MiniGame } from '@/components';
import { useLoc } from '@/hooks';

export default function MiniGamePage() {
  const loc = useLoc();

  return (
    <PageLayout
      title={loc('MiniGame')}
      className="minigame-page"
      showFooter={true}
    >
      <div className="flex justify-center p-4">
        <MiniGame />
      </div>
    </PageLayout>
  );
}
