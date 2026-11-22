/**
 * 搜索框下面的联想下拉：首页搜索和个人空间的谱面搜索共用同一套样式和键盘高亮约定。
 * 输入框负责焦点和方向键，这里只负责渲染选项（选项上按下鼠标不会让输入框失焦）。
 */

import type { ComponentType } from 'react';
import { LuMic, LuMusic, LuPencilLine, LuSearch, LuTag, LuUser } from 'react-icons/lu';
import type { SuggestionKind } from '@/utils/searchSuggestions';

export interface SuggestionListboxItem {
  key: string;
  value: string;
  label: string;
  /** 右侧灰字（字段名或操作符说明） */
  hint: string;
  /** 没有 kind 的选项按操作符样式显示（等宽蓝字、搜索图标） */
  kind?: SuggestionKind;
  /** 选中后保持下拉打开（例如补全前缀） */
  keepOpen?: boolean;
}

const SUGGESTION_ICONS: Record<SuggestionKind, ComponentType<{ className?: string }>> = {
  title: LuMusic,
  artist: LuMic,
  designer: LuPencilLine,
  uploader: LuUser,
  tag: LuTag,
};

export default function SuggestionListbox<T extends SuggestionListboxItem>({ id, label, items, activeIndex, highlight, onHover, onPick }: {
  id: string;
  label: string;
  items: readonly T[];
  activeIndex: number;
  /** 加粗显示的匹配文字 */
  highlight: string;
  onHover: (index: number) => void;
  onPick: (item: T) => void;
}) {
  return (
    <ul
      id={id}
      role="listbox"
      aria-label={label}
      className="top-[calc(100%+0.5rem)] z-1001 absolute inset-x-0 bg-[rgb(14_16_22)] shadow-[0_20px_60px_rgb(0_0_0/50%)] m-0 p-1.5 border border-white/15 rounded-xl max-h-[min(24rem,60dvh)] overflow-y-auto list-none"
    >
      {items.map((item, index) => {
        const Icon = item.kind ? SUGGESTION_ICONS[item.kind] : LuSearch;
        const active = index === activeIndex;
        return (
          <li
            key={item.key}
            id={`${id}-${index}`}
            role="option"
            aria-selected={active}
            className={`flex items-center gap-3 px-2 py-1.5 rounded-lg min-h-11 text-sm cursor-pointer transition-colors ${active ? 'bg-white/[0.08] text-white' : 'text-white/80 hover:bg-white/[0.05]'}`}
            onMouseDown={(event) => event.preventDefault()}
            onMouseEnter={() => onHover(index)}
            onClick={() => onPick(item)}
          >
            {/* 图标放在小方块里，比光秃秃的灰图标更好对齐 */}
            <span aria-hidden="true" className={`grid place-items-center rounded-md w-7 h-7 shrink-0 ${item.kind ? 'bg-white/[0.06] text-white/55' : 'bg-blue-400/10 text-blue-300'}`}>
              <Icon className="w-3.5 h-3.5" />
            </span>
            {item.kind ? (
              <>
                <span className="flex-1 min-w-0 truncate"><HighlightMatch text={item.label} query={highlight} /></span>
                {/* 匹配的是哪个字段：小标签，不再是挤在右边、经常被截断的灰字 */}
                <span className="bg-white/[0.06] px-1.5 py-0.5 rounded text-[0.6875rem] text-white/50 leading-none whitespace-nowrap shrink-0">{item.hint}</span>
              </>
            ) : (
              // 搜索语法提示：上面是操作符，下面一行是说明，说明不再被截断
              <span className="flex flex-col flex-1 min-w-0">
                <span className="font-mono text-blue-200 leading-tight">{item.label}</span>
                <span className="mt-0.5 text-white/40 text-xs leading-snug">{item.hint}</span>
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/** 联想词里加粗匹配到的部分 */
function HighlightMatch({ text, query }: { text: string; query: string }) {
  const needle = query.trim().toLowerCase();
  const index = needle ? text.toLowerCase().indexOf(needle) : -1;
  if (index < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, index)}
      <span className="font-semibold text-white">{text.slice(index, index + needle.length)}</span>
      {text.slice(index + needle.length)}
    </>
  );
}
