import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LuFileArchive, LuSmartphone, LuX } from 'react-icons/lu';
import Modal from './Modal';

export type DownloadFormat = 'zip' | 'adx';

const OPTIONS = [
  { format: 'zip', Icon: LuFileArchive, label: 'ZIP', description: 'shared/DownloadFormatDialog.ZipDescription' },
  { format: 'adx', Icon: LuSmartphone, label: 'ADX', description: 'shared/DownloadFormatDialog.AdxDescription' },
] as const;

/**
 * 选好（或取消）后立刻通过 onDone 回报结果，弹窗自己播完关闭动画后再调用 onClosed 让外面卸载
 */
export default function DownloadFormatDialog({ title, lastFormat, onDone, onClosed }: {
  title: string;
  lastFormat: DownloadFormat | null;
  onDone: (format: DownloadFormat | null) => void;
  onClosed: () => void;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(true);
  const dialogRef = useRef<HTMLDivElement>(null);
  const finish = (format: DownloadFormat | null) => {
    if (!open) return;
    setOpen(false);
    onDone(format);
  };

  useEffect(() => {
    // 上次用过的格式获得焦点，直接回车就能沿用
    dialogRef.current?.querySelector<HTMLButtonElement>(`[data-format="${lastFormat ?? 'zip'}"]`)?.focus();
  }, [lastFormat]);

  return (
    <Modal
      open={open}
      onClose={() => finish(null)}
      onExitComplete={onClosed}
      labelledBy="download-format-title"
      zIndexClass="z-[10000]"
      className="p-5 max-w-sm"
    >
      <div ref={dialogRef}>
        <div className="flex justify-between items-start gap-3 mb-4">
          <div className="min-w-0">
            <h2 id="download-format-title" className="m-0 font-semibold text-white! text-lg! text-left!">
              {t('shared/DownloadFormatDialog.Title')}
            </h2>
            <p className="m-0 mt-1 text-white/50! text-sm truncate">{title}</p>
          </div>
          <button
            type="button"
            onClick={() => finish(null)}
            aria-label={t('shared/DownloadFormatDialog.Cancel')}
            className="place-items-center grid hover:bg-white/10 rounded-full w-8 h-8 text-white/50 hover:text-white transition-colors cursor-pointer shrink-0"
          >
            <LuX aria-hidden="true" className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-col gap-2">
          {OPTIONS.map(({ format, Icon, label, description }) => (
            <button
              key={format}
              type="button"
              data-format={format}
              onClick={() => finish(format)}
              className="group flex items-center gap-3 bg-white/[0.03] hover:bg-white/[0.07] focus-visible:bg-white/[0.07] p-3 border border-white/10 hover:border-blue-400/50 focus-visible:border-blue-400/60 rounded-xl outline-none w-full text-left transition-colors cursor-pointer"
            >
              <span className="place-items-center grid bg-white/[0.06] rounded-lg w-10 h-10 text-white/70 group-hover:text-blue-300 shrink-0">
                <Icon aria-hidden="true" className="w-5 h-5" />
              </span>
              <span className="flex flex-col flex-1 min-w-0">
                <span className="flex items-center gap-2 font-semibold text-white text-sm">
                  {label}
                  {format === lastFormat && (
                    <span className="bg-blue-400/15 px-1.5 py-0.5 rounded font-medium text-[11px] text-blue-200">
                      {t('shared/DownloadFormatDialog.LastUsed')}
                    </span>
                  )}
                </span>
                <span className="text-white/50 text-xs">{t(description)}</span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </Modal>
  );
}
