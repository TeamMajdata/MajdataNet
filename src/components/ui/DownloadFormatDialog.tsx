import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { LuFileArchive, LuSmartphone, LuX } from 'react-icons/lu';

export type DownloadFormat = 'zip' | 'adx';

const OPTIONS = [
  { format: 'zip', Icon: LuFileArchive, label: 'ZIP', description: 'shared/DownloadFormatDialog.ZipDescription' },
  { format: 'adx', Icon: LuSmartphone, label: 'ADX', description: 'shared/DownloadFormatDialog.AdxDescription' },
] as const;

export default function DownloadFormatDialog({ title, lastFormat, onDone }: {
  title: string;
  lastFormat: DownloadFormat | null;
  onDone: (format: DownloadFormat | null) => void;
}) {
  const { t } = useTranslation();
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 上次用过的格式获得焦点，直接回车就能沿用
    dialogRef.current?.querySelector<HTMLButtonElement>(`[data-format="${lastFormat ?? 'zip'}"]`)?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onDone(null);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [lastFormat, onDone]);

  return (
    <div className="z-[10000] fixed inset-0 flex justify-center items-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => onDone(null)} />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="download-format-title"
        className="relative bg-[rgb(14_16_22/98%)] shadow-[0_24px_64px_rgb(0_0_0/50%)] p-5 border border-white/10 rounded-2xl w-full max-w-sm"
      >
        <div className="flex justify-between items-start gap-3 mb-4">
          <div className="min-w-0">
            <h2 id="download-format-title" className="m-0 font-semibold text-white! text-lg! text-left!">
              {t('shared/DownloadFormatDialog.Title')}
            </h2>
            <p className="m-0 mt-1 text-white/50! text-sm truncate">{title}</p>
          </div>
          <button
            type="button"
            onClick={() => onDone(null)}
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
              onClick={() => onDone(format)}
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
    </div>
  );
}
