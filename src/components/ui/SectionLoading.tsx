import { useTranslation } from 'react-i18next';
import LoadingSpinner from './LoadingSpinner';

/**
 * 页面里某一块（列表、评分、评论等）加载中：统一的转圈大小、间距和一行小字。
 * 整页加载用 PageLoading。
 */
export default function SectionLoading({ className = 'py-16' }: { className?: string }) {
  const { t } = useTranslation();
  return (
    <div className={`flex flex-col justify-center items-center gap-3 w-full ${className}`} role="status">
      <LoadingSpinner size={32} />
      <p className="m-0 text-white/45! text-xs">{t('shared/PageLoading.Loading')}</p>
    </div>
  );
}
