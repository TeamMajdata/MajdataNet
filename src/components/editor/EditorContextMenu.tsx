/**
 * 谱面编辑框的右键菜单（`=` 也行）：镜像变换在前，撤销 / 重做在后。
 *
 * 打开后菜单自己拿焦点，可以直接用 ↑ / ↓ + Enter 选，Esc 收起；鼠标悬停也会同步高亮项。
 * 位置由调用方给（鼠标坐标，或 `=` 时光标的屏幕位置），这里只负责夹在视口内。
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  LuFlipHorizontal, LuFlipVertical, LuRefreshCw, LuRedo2, LuRotateCcw, LuRotateCw, LuUndo2,
} from 'react-icons/lu';
import type { IconType } from 'react-icons';
import type { MirrorKind } from '@/utils/simaiMirror';

const MIRRORS = [
  { kind: 'lr', labelKey: 'editor/EditorPage.MirrorHorizontal', Icon: LuFlipHorizontal },
  { kind: 'ud', labelKey: 'editor/EditorPage.MirrorVertical', Icon: LuFlipVertical },
  { kind: '180', labelKey: 'editor/EditorPage.Mirror180', Icon: LuRefreshCw },
  { kind: 'cw45', labelKey: 'editor/EditorPage.RotateCw', Icon: LuRotateCw },
  { kind: 'ccw45', labelKey: 'editor/EditorPage.RotateCcw', Icon: LuRotateCcw },
] as const satisfies readonly { kind: MirrorKind; labelKey: string; Icon: IconType }[];

export type EditorContextMenuProps = {
  x: number;
  y: number;
  /** 没有选区时镜像不可用（只作用于选区） */
  hasSelection: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onTransform: (kind: MirrorKind) => void;
  onClose: () => void;
};

const WIDTH = 208;
const HEIGHT = 268;

type Action = {
  id: string;
  label: string;
  Icon: IconType;
  hint?: string;
  disabled: boolean;
  run: () => void;
};

export default function EditorContextMenu({
  x, y, hasSelection, onUndo, onRedo, onTransform, onClose,
}: EditorContextMenuProps) {
  const { t } = useTranslation();
  const ref = useRef<HTMLDivElement>(null);

  const actions = useMemo<Action[]>(() => [
    ...MIRRORS.map(({ kind, labelKey, Icon }) => ({
      id: kind,
      label: t(labelKey),
      Icon,
      disabled: !hasSelection,
      run: () => onTransform(kind),
    })),
    // 撤销 / 重做放在镜像后面
    { id: 'undo', label: t('editor/EditorPage.Undo'), Icon: LuUndo2, hint: 'Ctrl+Z', disabled: false, run: onUndo },
    { id: 'redo', label: t('editor/EditorPage.Redo'), Icon: LuRedo2, hint: 'Ctrl+Y', disabled: false, run: onRedo },
  ], [hasSelection, onRedo, onTransform, onUndo, t]);

  // 默认落在第一个可用项上（没有选区时跳过灰色的镜像）
  const [active, setActive] = useState(() => Math.max(0, actions.findIndex((action) => !action.disabled)));

  // 打开就把焦点拿过来：这样 ↑ / ↓ / Enter 不会落到 Monaco 里
  useEffect(() => {
    ref.current?.focus();
  }, []);

  // 点外面收起。用 capture 是因为 Monaco 会把事件拦在自己的 DOM 里
  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) onClose();
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    return () => document.removeEventListener('pointerdown', onPointerDown, true);
  }, [onClose]);

  const activate = (index: number) => {
    const action = actions[index];
    if (!action || action.disabled) return;
    onClose();
    action.run();
  };

  /** 上下移动一格，跳过不可用的项（没有选区时镜像都是灰的） */
  const move = (delta: number) => {
    const count = actions.length;
    if (!count) return;
    let next = active;
    for (let step = 0; step < count; step += 1) {
      next = (next + delta + count) % count;
      if (!actions[next].disabled) break;
    }
    setActive(next);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        move(1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        move(-1);
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        activate(active);
        break;
      case 'Escape':
        event.preventDefault();
        event.stopPropagation();
        onClose();
        break;
      default:
        break;
    }
  };

  const style = {
    left: Math.max(8, Math.min(x, window.innerWidth - WIDTH - 8)),
    top: Math.max(8, Math.min(y, window.innerHeight - HEIGHT - 8)),
  };

  const renderItem = (action: Action, index: number) => (
    <button
      key={action.id}
      type="button"
      role="menuitem"
      disabled={action.disabled}
      title={action.disabled ? t('editor/EditorPage.SelectRangeFirst') : action.label}
      className={index === active ? 'is-active' : undefined}
      onPointerEnter={() => { if (!action.disabled) setActive(index); }}
      onClick={() => activate(index)}
    >
      <action.Icon aria-hidden="true" />
      {action.label}
      {action.hint && <kbd>{action.hint}</kbd>}
    </button>
  );

  const mirrorCount = MIRRORS.length;

  return (
    <div
      ref={ref}
      className="editor-context-menu"
      style={style}
      role="menu"
      aria-label={t('editor/EditorPage.MenuEdit')}
      tabIndex={-1}
      onKeyDown={onKeyDown}
    >
      {actions.slice(0, mirrorCount).map((action, index) => renderItem(action, index))}
      <div className="editor-menu-sep" />
      {actions.slice(mirrorCount).map((action, index) => renderItem(action, mirrorCount + index))}
    </div>
  );
}
