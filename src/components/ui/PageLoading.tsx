import { useTranslation } from 'react-i18next';
import { PageLayout } from '@/components';
import LoadingSpinner from './LoadingSpinner';

/**
 * 整页加载中：带页头、背景和页脚的正常页面外壳，转圈和提示在中间。
 * 路由加载、登录检查、页面自己取数据时都用它，前后衔接时看起来是同一个界面。
 */
export default function PageLoading() {
  const { t } = useTranslation();
  return (
    <PageLayout centered>
      <div className="flex flex-col justify-center items-center gap-4 py-10" role="status">
        <LoadingSpinner size={40} />
        <p className="m-0 text-white/55! text-sm">{t('shared/PageLoading.Loading')}</p>
      </div>
    </PageLayout>
  );
}
