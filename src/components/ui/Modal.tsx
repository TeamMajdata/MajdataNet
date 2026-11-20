import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';

/** 弹窗面板的默认外观；尺寸（max-w-*）等由 className 补充 */
const EXIT_SECONDS = 0.15;

/**
 * 传了 onUpdate 的元素 framer-motion 不会改用浏览器原生动画（WAAPI）。
 * 原生动画结束到元素被移除之间，内联的 opacity: 1 会露出来一帧，关闭时就会闪一下。
 */
const keepJsAnimation = () => {};

const MODAL_PANEL_CLASS = 'relative bg-[rgb(14_16_22/98%)] shadow-[0_24px_64px_rgb(0_0_0/50%)] border border-white/10 rounded-2xl w-full';

/**
 * 全站共用的弹窗：遮罩淡入淡出，面板轻微放大弹出，关闭时反向播放。
 * 用 `open` 控制显隐而不是条件渲染，这样关闭也有动画；Esc 和点遮罩默认关闭。
 */
export default function Modal({
  open,
  onClose,
  children,
  className = '',
  role = 'dialog',
  labelledBy,
  describedBy,
  dismissible = true,
  zIndexClass = 'z-[1001]',
  onExitComplete,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  /** 追加到面板上的类名，通常是 max-w-* 和内边距 */
  className?: string;
  role?: 'dialog' | 'alertdialog';
  labelledBy?: string;
  describedBy?: string;
  /** 为 false 时 Esc 和点遮罩都不会关闭（比如正在提交） */
  dismissible?: boolean;
  zIndexClass?: string;
  /** 关闭动画播完后调用 */
  onExitComplete?: () => void;
}) {
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!open || !dismissible) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, dismissible, onClose]);

  const panelMotion = reduceMotion
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0, transition: { duration: EXIT_SECONDS } }, transition: { duration: 0.15 } }
    : {
      initial: { opacity: 0, scale: 0.96, y: 8 },
      animate: { opacity: 1, scale: 1, y: 0 },
      exit: { opacity: 0, scale: 0.96, y: 8, transition: { duration: EXIT_SECONDS } },
      transition: { type: 'spring' as const, stiffness: 420, damping: 32 },
    };

  return createPortal(
    <AnimatePresence onExitComplete={onExitComplete}>
      {open && (
        <div
          className={`${zIndexClass} fixed inset-0 flex justify-center items-center p-4`}
          // 弹窗里的点击不要冒泡到触发它的卡片等元素上
          onClick={(event) => event.stopPropagation()}
        >
          <motion.div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            // 遮罩和面板的退出时长要一致，否则先结束的面板会闪回一帧
            exit={{ opacity: 0, transition: { duration: EXIT_SECONDS } }}
            transition={{ duration: 0.2 }}
            onUpdate={keepJsAnimation}
            onClick={dismissible ? onClose : undefined}
          />
          <motion.div
            role={role}
            aria-modal="true"
            aria-labelledby={labelledBy}
            aria-describedby={describedBy}
            className={`${MODAL_PANEL_CLASS} ${className}`}
            onUpdate={keepJsAnimation}
            {...panelMotion}
          >
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
