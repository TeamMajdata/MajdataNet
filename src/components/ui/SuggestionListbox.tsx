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
            className={`flex items-center gap-3 px-3 rounded-lg h-10 text-sm cursor-pointer ${active ? 'bg-white/[0.08] text-white' : 'text-white/80 hover:bg-white/[0.05]'}`}
            onMouseDown={(event) => event.preventDefault()}
            onMouseEnter={() => onHover(index)}
            onClick={() => onPick(item)}
          >
            <Icon aria-hidden="true" className="w-4 h-4 text-white/40 shrink-0" />
            <span className={`truncate ${item.kind ? '' : 'font-mono text-blue-200'}`}>
              {item.kind ? <HighlightMatch text={item.label} query={highlight} /> : item.label}
            </span>
            <span className="ml-auto pl-2 text-white/35 text-xs truncate shrink-0 max-w-[60%]">{item.hint}</span>
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
