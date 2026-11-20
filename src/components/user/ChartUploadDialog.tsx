import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LuTriangleAlert, LuX } from 'react-icons/lu';
import ChartUploader from './ChartUploader';

const NOTICE_TERMS = [
  'user/charts/ChartsPage.UploadNoticeTerms1',
  'user/charts/ChartsPage.UploadNoticeTerms2',
  'user/charts/ChartsPage.UploadNoticeTerms3',
  'user/charts/ChartsPage.UploadNoticeTerms4',
  'user/charts/ChartsPage.UploadNoticeTerms5',
  'user/charts/ChartsPage.UploadNoticeTerms6',
] as const;

/** 上传谱面的弹窗：先看上传须知，同意后才显示文件选择 */
export default function ChartUploadDialog({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div className="z-[1001] fixed inset-0 flex justify-center items-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="chart-upload-title"
        className="relative flex flex-col bg-[rgb(14_16_22/98%)] shadow-[0_24px_64px_rgb(0_0_0/50%)] border border-white/10 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden"
      >
        <header className="flex justify-between items-center gap-3 px-5 pt-5 pb-3">
          <h2 id="chart-upload-title" className="m-0 font-semibold text-white! text-lg! text-left!">
            {accepted ? t("user/charts/ChartsPage.UploadChart") : t("user/charts/ChartsPage.UploadNotice")}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("user/charts/ChartsPage.Cancel")}
            className="place-items-center grid hover:bg-white/10 rounded-full w-8 h-8 text-white/50 hover:text-white transition-colors cursor-pointer shrink-0"
          >
            <LuX aria-hidden="true" className="w-4 h-4" />
          </button>
        </header>

        <div className="px-5 pb-5 min-h-0 overflow-y-auto">
          {accepted ? (
            <ChartUploader />
          ) : (
            <>
              <div className="bg-amber-400/[0.07] p-4 border border-amber-400/25 rounded-xl">
                <div className="flex items-center gap-2 mb-2.5 text-amber-200 text-sm">
                  <LuTriangleAlert aria-hidden="true" className="w-4 h-4 shrink-0" />
                  {t("user/charts/ChartsPage.NoticeIntro")}
                </div>
                <ol className="space-y-2 m-0 pl-5 text-white/80 text-sm leading-relaxed list-decimal marker:text-amber-300/80">
                  {NOTICE_TERMS.map((key) => <li key={key}>{t(key)}</li>)}
                </ol>
              </div>
              <div className="flex justify-end gap-2 mt-5">
                <button type="button" onClick={onClose} className="bg-white/[0.06] hover:bg-white/10 px-4 border border-white/10 hover:border-white/20 rounded-xl h-10 font-medium text-white/85 text-sm transition-colors cursor-pointer">
                  {t("user/charts/ChartsPage.Cancel")}
                </button>
                <button type="button" autoFocus onClick={() => setAccepted(true)} className="bg-blue-500 hover:bg-blue-400 px-5 border-none rounded-xl h-10 font-semibold text-white text-sm transition-colors cursor-pointer">
                  {t("user/charts/ChartsPage.AcceptNotice")}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
