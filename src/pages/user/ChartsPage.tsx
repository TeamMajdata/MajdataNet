import { useTranslation } from 'react-i18next';
import { LuInfo } from 'react-icons/lu';
import { PageLayout, ChartUploader, SongList, LoadingSpinner } from '@/components';
import { apiPagesForView } from '@/components/song/songGrid';
import { useUserContext } from '@/hooks';
import { endpoints } from '@/config/api';

const NOTICE_TERMS = [
  'user/charts/ChartsPage.UploadNoticeTerms1',
  'user/charts/ChartsPage.UploadNoticeTerms2',
  'user/charts/ChartsPage.UploadNoticeTerms3',
  'user/charts/ChartsPage.UploadNoticeTerms4',
] as const;

/** 右栏的谱面网格：比全宽列表少一列 */
const MANAGE_GRID_CLASS = 'grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 w-full min-w-0';

export default function UserChartsPage() {
  const { t } = useTranslation();
  const { user, isLoading } = useUserContext();
  if (isLoading && !user) {
    return (
      <div className="flex justify-center items-center h-screen">
        <LoadingSpinner size="50px" />
      </div>
    );
  }

  return (
    <PageLayout showBackToHome={false}>
      <div className="mx-auto py-5 sm:py-8 w-full max-w-350 min-w-0">
        <header className="mb-5 sm:mb-6">
          <h1 className="m-0 font-semibold text-white! text-2xl! sm:text-3xl! text-left! tracking-tight">
            {t("user/charts/ChartsPage.ChartsManagement")}
          </h1>
        </header>

        {/* 桌面端左边上传、右边我的谱面；手机端上下排列 */}
        <div className="items-start gap-5 grid grid-cols-1 lg:grid-cols-[380px_minmax(0,1fr)]">
          <section className="lg:top-24 lg:sticky bg-white/[0.03] p-5 border border-white/10 rounded-2xl min-w-0" aria-labelledby="upload-heading">
            <h2 id="upload-heading" className="m-0 mb-4 font-semibold text-white! text-lg! text-left!">
              {t("user/charts/ChartsPage.UploadChart")}
            </h2>

            {/* 上传须知 */}
            <div className="bg-blue-400/[0.06] mb-5 p-3.5 border border-blue-400/20 rounded-xl">
              <div className="flex items-center gap-2 mb-2 font-medium text-blue-200 text-sm">
                <LuInfo aria-hidden="true" className="w-4 h-4 shrink-0" />
                {t("user/charts/ChartsPage.UploadNotice")}
              </div>
              <ol className="space-y-1.5 m-0 pl-5 text-white/70 text-xs leading-relaxed list-decimal marker:text-blue-300/70">
                {NOTICE_TERMS.map((key) => <li key={key}>{t(key)}</li>)}
              </ol>
            </div>

            <ChartUploader />
          </section>

          <section className="min-w-0" aria-labelledby="my-charts-heading">
            <div className="mb-4">
              <h2 id="my-charts-heading" className="m-0 font-semibold text-white! text-lg! text-left!">
                {t("user/charts/ChartsPage.MyCharts")}
              </h2>
              <p className="m-0 mt-1 text-white/50! text-sm">{t("user/charts/ChartsPage.ManageAllYourCharts")}</p>
            </div>
            <SongList
              url={apiPagesForView(0).map((apiPage) => endpoints.maichart.listSearchAndSort('uploader:' + user?.username, '', apiPage))}
              isManage={true}
              gridClassName={MANAGE_GRID_CLASS}
            />
          </section>
        </div>
      </div>
    </PageLayout>
  );
}
