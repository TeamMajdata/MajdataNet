import { useTranslation } from 'react-i18next';
import LoadingSpinner from './LoadingSpinner';

/**
 * 整页加载中：盖住整个窗口（包括页头）的深色遮罩，转圈和提示在正中。
 * 路由加载、登录检查、页面自己取数据时都用它；转圈按时间对齐，前后两个遮罩衔接时不会从头转。
 */
export default function PageLoading() {
  const { t } = useTranslation();
  return (
    <div className="z-1050 fixed inset-0 flex flex-col justify-center items-center gap-4 bg-[rgb(var(--background-start))]" role="status">
      <LoadingSpinner size={40} />
      <p className="m-0 text-white/55! text-sm">{t('shared/PageLoading.Loading')}</p>
    </div>
  );
}
