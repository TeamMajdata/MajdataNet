import { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { LuChevronLeft, LuChevronRight, LuChevronsLeft } from 'react-icons/lu';

/**
 * 紧凑的翻页器。`page` 从 0 开始，显示给用户时从 1 开始；
 * 页码输入框按 Enter 或失焦后才跳转，输入过程中不会一直请求。
 */
export default function Pager({ page, hasNext, onPageChange }: {
  page: number;
  hasNext: boolean;
  onPageChange: (page: number) => void;
}) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<string | null>(null);

  const commit = () => {
    if (draft === null) return;
    const target = parseInt(draft, 10);
    setDraft(null);
    if (Number.isInteger(target) && target >= 1 && target - 1 !== page) onPageChange(target - 1);
  };

  const button = 'place-items-center grid bg-white/[0.04] hover:bg-white/[0.08] disabled:hover:bg-white/[0.04] disabled:opacity-35 border border-white/10 rounded-xl w-10 h-10 text-white/80 transition-colors cursor-pointer disabled:cursor-not-allowed';

  return (
    <nav className="flex items-center gap-2" aria-label={t("shared/Pager.PageNumber")}>
      {page > 0 && (
        <button type="button" className={button} onClick={() => onPageChange(0)} aria-label={t("shared/Pager.First")} title={t("shared/Pager.First")}>
          <LuChevronsLeft aria-hidden="true" className="w-4 h-4" />
        </button>
      )}
      <button type="button" className={button} disabled={page <= 0} onClick={() => onPageChange(page - 1)} aria-label={t("shared/Pager.Previous")}>
        <LuChevronLeft aria-hidden="true" className="w-4 h-4" />
      </button>
      <div className="flex items-center gap-2 px-1 text-white/55 text-sm whitespace-nowrap">
        <Trans
          i18nKey="shared/Pager.PageInput"
          components={{
            input: (
              <input
                type="number"
                inputMode="numeric"
                min={1}
                value={draft ?? String(page + 1)}
                onChange={(event) => setDraft(event.target.value)}
                onBlur={commit}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') event.currentTarget.blur();
                  if (event.key === 'Escape') { setDraft(null); event.currentTarget.blur(); }
                }}
                aria-label={t("shared/Pager.PageNumber")}
                className="bg-white/[0.04] [appearance:textfield] border border-white/10 focus:border-blue-400/60 rounded-lg outline-none focus:ring-2 focus:ring-blue-400/20 w-14 h-10 font-medium text-white text-sm text-center tabular-nums [&::-webkit-inner-spin-button]:appearance-none"
              />
            ),
          }}
        />
      </div>
      <button type="button" className={button} disabled={!hasNext} onClick={() => onPageChange(page + 1)} aria-label={t("shared/Pager.Next")}>
        <LuChevronRight aria-hidden="true" className="w-4 h-4" />
      </button>
    </nav>
  );
}
