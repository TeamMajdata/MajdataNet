import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { LuTriangleAlert } from 'react-icons/lu';
import LoadingSpinner from './LoadingSpinner';
import Modal from './Modal';

/** 需要用户确认的操作（例如删除）用的小弹窗，替代浏览器自带的 confirm()；危险操作默认聚焦“取消”，回车不会误删 */
export default function ConfirmDialog({ open, title, message, confirmLabel, danger = false, busy = false, onConfirm, onCancel }: {
  open: boolean;
  title: string;
  message: ReactNode;
  confirmLabel: string;
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();

  return (
    <Modal
      open={open}
      onClose={onCancel}
      dismissible={!busy}
      role="alertdialog"
      labelledBy="confirm-dialog-title"
      describedBy="confirm-dialog-message"
      zIndexClass="z-[1002]"
      className="p-5 max-w-sm"
    >
      <div className="flex items-start gap-3">
        {danger && (
          <span className="place-items-center grid bg-red-500/10 rounded-full w-10 h-10 text-red-300 shrink-0">
            <LuTriangleAlert aria-hidden="true" className="w-5 h-5" />
          </span>
        )}
        <div className="min-w-0">
          <h2 id="confirm-dialog-title" className="m-0 font-semibold text-white! text-base! text-left!">{title}</h2>
          <p id="confirm-dialog-message" className="m-0 mt-1.5 text-white/60! text-sm leading-relaxed">{message}</p>
        </div>
      </div>
      <div className="flex justify-end gap-2 mt-5">
        <button
          type="button"
          autoFocus={danger}
          onClick={onCancel}
          disabled={busy}
          className="bg-white/[0.06] hover:bg-white/10 disabled:opacity-50 px-4 border border-white/10 hover:border-white/20 rounded-xl h-10 font-medium text-white/85 text-sm transition-colors cursor-pointer disabled:cursor-not-allowed"
        >
          {t("shared/ConfirmDialog.Cancel")}
        </button>
        <button
          type="button"
          autoFocus={!danger}
          onClick={onConfirm}
          disabled={busy}
          className={`inline-flex items-center gap-2 disabled:opacity-60 px-4 border-none rounded-xl h-10 font-semibold text-white text-sm transition-colors cursor-pointer disabled:cursor-not-allowed ${danger ? 'bg-red-500 hover:bg-red-400' : 'bg-blue-500 hover:bg-blue-400'}`}
        >
          {busy && <LoadingSpinner className="w-4 h-4" />}
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
