/**
 * 编辑器里的浮动窗：居中、可拖标题栏、无遮罩。
 * 没有 backdrop，所以窗开着的时编辑器照常能点、能输入。
 */
import { useCallback, useEffect, useRef, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { LuX } from 'react-icons/lu';

type Props = {
  title: string;
  onClose: () => void;
  children: ReactNode;
  /** 附加说明，显示在窗底部 */
  hint?: string;
  /** 窗宽，默认 212 */
  width?: number;
};

export default function EditorWindow({ title, onClose, children, hint, width = 212 }: Props) {
  const { t } = useTranslation();
  const ref = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ dx: number; dy: number } | null>(null);
  /** 用户拖过之后就不再自动居中 */
  const draggedRef = useRef(false);

  const center = useCallback(() => {
    const el = ref.current;
    if (!el || draggedRef.current) return;
    el.style.left = `${Math.round((window.innerWidth - el.offsetWidth) / 2)}px`;
    el.style.top = `${Math.round((window.innerHeight - el.offsetHeight) / 2)}px`;
  }, []);

  // 居中对齐：内容（比如 portal 进来的设置面板）渲染后高度会变，所以跟着尺寸重新居中
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    center();
    const observer = new ResizeObserver(center);
    observer.observe(el);
    return () => observer.disconnect();
  }, [center]);

  const onPointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el || (event.target as HTMLElement).closest('button')) return;
    draggedRef.current = true;
    dragRef.current = { dx: event.clientX - el.offsetLeft, dy: event.clientY - el.offsetTop };
    event.currentTarget.setPointerCapture(event.pointerId);
  }, []);

  const onPointerMove = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const el = ref.current;
    const drag = dragRef.current;
    if (!el || !drag) return;
    el.style.left = `${event.clientX - drag.dx}px`;
    el.style.top = `${event.clientY - drag.dy}px`;
  }, []);

  const stopDrag = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    dragRef.current = null;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
  }, []);

  return (
    <div ref={ref} className="editor-window" role="dialog" aria-label={title} style={{ width }}>
      <div
        className="editor-window-head"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={stopDrag}
        onPointerCancel={stopDrag}
      >
        <span className="editor-window-grip" aria-hidden="true">⠿</span>
        <span className="editor-window-title">{title}</span>
        <button type="button" onClick={onClose} aria-label={t('editor/EditorWindow.Close')} className="editor-window-close">
          <LuX aria-hidden="true" />
        </button>
      </div>
      <div className="editor-window-body">{children}</div>
      {hint && <div className="editor-window-hint">{hint}</div>}
    </div>
  );
}
