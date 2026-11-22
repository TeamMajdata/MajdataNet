import { useTranslation } from 'react-i18next';
import { PageLayout } from '@/components';
import { isBooted } from '@/utils/boot';
import LoadingSpinner from './LoadingSpinner';

/**
 * 整页加载中，转圈和提示在中间。路由加载、登录检查、页面自己取数据时都用它：
 * - 刚打开网页、第一个页面还没出来时：盖满整个窗口的纯色背景，接着 index.html 里 JS 加载前的那屏；
 * - 之后站内跳转：放在带页头、背景和页脚的正常页面外壳里。
 * 转圈按时间对齐，前后两个加载界面衔接时不会从头转。
 */
export default function PageLoading() {
  const { t } = useTranslation();
  const content = (
    <>
      <LoadingSpinner size={40} />
      <p className="m-0 text-white/55! text-sm">{t('shared/PageLoading.Loading')}</p>
    </>
  );
  if (!isBooted()) {
    return (
      <div className="z-1050 fixed inset-0 flex flex-col justify-center items-center gap-4 bg-[rgb(var(--background-start))]" role="status">
        {content}
      </div>
    );
  }
  return (
    <PageLayout centered>
      <div className="flex flex-col justify-center items-center gap-4 py-10" role="status">
        {content}
      </div>
    </PageLayout>
  );
}
