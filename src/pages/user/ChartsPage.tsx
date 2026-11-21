import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LuUpload } from 'react-icons/lu';
import { PageLayout, SongList, LoadingSpinner } from '@/components';
import ChartUploadDialog from '@/components/user/ChartUploadDialog';
import Pager from '@/components/ui/Pager';
import { apiPagesForView } from '@/components/song/songGrid';
import { useUserContext } from '@/hooks';
import { endpoints } from '@/config/api';

export default function UserChartsPage() {
  const { t } = useTranslation();
  const { user, isLoading } = useUserContext();
  const [uploading, setUploading] = useState(false);
  const [page, setPage] = useState(0);
  /** SongList 发现某页不足一屏时报告的最后一页 */
  const [lastPage, setLastPage] = useState<number | null>(null);
  const [firstPageEmpty, setFirstPageEmpty] = useState(false);
  if (isLoading && !user) {
    return (
      <div className="flex justify-center items-center h-screen">
        <LoadingSpinner size="50px" />
      </div>
    );
  }

  return (
    <PageLayout showBackToHome={false}>
      <div className="mx-auto py-5 sm:py-8 w-full max-w-320 min-w-0">
        {/* Header：标题和说明居左，上传按钮在右 */}
        <header className="flex justify-between items-center gap-4 mb-5 sm:mb-6">
          <div className="min-w-0">
            <h1 className="m-0 font-semibold text-white! text-2xl! sm:text-3xl! text-left! tracking-tight">
              {t("user/charts/ChartsPage.ChartsManagement")}
            </h1>
            <p className="m-0 mt-1.5 text-white/55! text-sm">{t("user/charts/ChartsPage.ManageAllYourCharts")}</p>
          </div>
          <button
            type="button"
            onClick={() => setUploading(true)}
            className="inline-flex items-center gap-2 bg-blue-500 hover:bg-blue-400 px-4 border-none rounded-xl h-11 font-semibold text-white text-sm whitespace-nowrap transition-colors cursor-pointer shrink-0"
          >
            <LuUpload aria-hidden="true" className="w-4 h-4" />
            {t("user/charts/ChartsPage.UploadChart")}
          </button>
        </header>

        <SongList
          url={apiPagesForView(page).map((apiPage) => endpoints.maichart.listSearchAndSort('uploader:' + user?.username, '', apiPage))}
          page={page}
          setMax={setLastPage}
          onDataLoaded={(hasData) => { if (page === 0) setFirstPageEmpty(!hasData); }}
          isManage={true}
        />
        {/* 第一页就不足一屏（或一张都没有）时不显示翻页 */}
        {!(page === 0 && (lastPage === 0 || firstPageEmpty)) && (
          <div className="flex justify-center mt-8 sm:mt-10">
            <Pager
              page={page}
              hasNext={lastPage === null || page < lastPage}
              onPageChange={(next) => {
                setPage(next);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />
          </div>
        )}
      </div>

      <ChartUploadDialog open={uploading} onClose={() => setUploading(false)} />
    </PageLayout>
  );
}
