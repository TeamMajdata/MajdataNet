import { useTranslation } from 'react-i18next';
import LoadingSpinner from './LoadingSpinner';

/** 整页加载中：转圈加一行提示，固定在窗口正中（不受页头和页面高度影响） */
export default function PageLoading() {
  const { t } = useTranslation();
  return (
    <div className="fixed inset-0 flex flex-col justify-center items-center gap-4" role="status">
      <LoadingSpinner size={40} />
      <p className="m-0 text-white/55! text-sm">{t('shared/PageLoading.Loading')}</p>
    </div>
  );
}
