import { useTranslation } from 'react-i18next';
import { LuCheck, LuDownload, LuLoaderCircle, LuMinus, LuX } from 'react-icons/lu';

export type DownloadFileKey = 'track' | 'bg' | 'chart' | 'video';
export type DownloadFileState = 'loading' | 'done' | 'failed' | 'missing';
export type DownloadStatus = 'loading' | 'done' | 'failed';

const FILE_LABEL_KEYS = {
  track: 'shared/Download.FileTrack',
  bg: 'shared/Download.FileBg',
  chart: 'shared/Download.FileChart',
  video: 'shared/Download.FileVideo',
} as const;

const FILE_ORDER: DownloadFileKey[] = ['track', 'bg', 'chart', 'video'];

/** 一次谱面下载只用一条通知：标题、整体进度和每个文件的状态 */
export default function DownloadToast({ title, status, files, progress }: {
  title: string;
  status: DownloadStatus;
  files: Record<DownloadFileKey, DownloadFileState>;
  /** 0–1；服务器没给文件大小时为 undefined，显示不确定进度 */
  progress?: number;
}) {
  const { t } = useTranslation();
  const percent = progress === undefined ? undefined : Math.round(progress * 100);

  const statusIcon = status === 'done'
    ? <LuCheck className="w-4 h-4" />
    : status === 'failed' ? <LuX className="w-4 h-4" /> : <LuDownload className="w-4 h-4" />;
  const statusTone = status === 'done'
    ? 'bg-emerald-400/15 text-emerald-300'
    : status === 'failed' ? 'bg-red-400/15 text-red-300' : 'bg-blue-400/15 text-blue-300';
  const statusText = status === 'done'
    ? t("shared/Download.Done")
    : status === 'failed' ? t("shared/Download.Failed") : t("shared/Download.Downloading");

  return (
    <div className="flex flex-col gap-2.5 w-full min-w-0">
      <div className="flex items-center gap-3 min-w-0">
        <span aria-hidden="true" className={`place-items-center grid rounded-lg w-8 h-8 shrink-0 ${statusTone}`}>{statusIcon}</span>
        <div className="flex-1 min-w-0">
          <p className="m-0 font-medium text-white! text-sm truncate">{title}</p>
          <p className="m-0 text-white/50! text-xs">{statusText}</p>
        </div>
        {status === 'loading' && percent !== undefined && (
          <span className="text-white/60 text-xs tabular-nums shrink-0">{percent}%</span>
        )}
      </div>

      {status === 'loading' && (
        <div className="relative bg-white/10 rounded-full h-1 overflow-hidden" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}>
          {percent === undefined
            ? <div className="download-toast-indeterminate absolute inset-y-0 bg-blue-400 rounded-full w-1/3" />
            : <div className="bg-blue-400 rounded-full h-full transition-[width] duration-200" style={{ width: `${percent}%` }} />}
        </div>
      )}

      <div className="flex flex-wrap gap-1.5">
        {FILE_ORDER.map((key) => {
          const state = files[key];
          const tone = state === 'done'
            ? 'text-emerald-300 bg-emerald-400/10'
            : state === 'failed' ? 'text-red-300 bg-red-400/10' : 'text-white/45 bg-white/[0.05]';
          return (
            <span key={key} className={`inline-flex items-center gap-1 px-1.5 rounded-md h-5 text-[0.7rem] ${tone}`}>
              {state === 'loading' && <LuLoaderCircle aria-hidden="true" className="w-3 h-3 animate-spin" />}
              {state === 'done' && <LuCheck aria-hidden="true" className="w-3 h-3" />}
              {state === 'failed' && <LuX aria-hidden="true" className="w-3 h-3" />}
              {state === 'missing' && <LuMinus aria-hidden="true" className="w-3 h-3" />}
              {t(FILE_LABEL_KEYS[key])}
            </span>
          );
        })}
      </div>
    </div>
  );
}
