import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import type { IconType } from 'react-icons';
import { LuArrowDownUp, LuCheck, LuChevronDown } from 'react-icons/lu';
import Dropdown from '@/components/header/Dropdown';

/** 排序下拉菜单：样式与顶栏语言菜单一致，不用原生 select */
export default function SortMenu({ options, value, onChange, label, compact = false, icon: Icon = LuArrowDownUp, placement, disabled }: {
  options: string[];
  value: number;
  onChange: (value: number) => void;
  label: string;
  /** 紧凑版：没有边框和底色、矮一些，用在页签栏这类一行文字旁边 */
  compact?: boolean;
  /** 按钮左边的图标，null 不显示（例如播放速度） */
  icon?: IconType | null;
  placement?: 'down' | 'up';
  disabled?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const menuId = useId();

  useEffect(() => {
    if (isOpen) itemRefs.current[value]?.focus();
  }, [isOpen, value]);

  function handleItemKey(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (event.key === 'Escape' || event.key === 'Tab') {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
      }
      triggerRef.current?.focus();
      setIsOpen(false);
      return;
    }
    const count = options.length;
    let next: number;
    switch (event.key) {
      case 'ArrowDown': next = (index + 1) % count; break;
      case 'ArrowUp': next = (index + count - 1) % count; break;
      case 'Home': next = 0; break;
      case 'End': next = count - 1; break;
      default: return;
    }
    event.preventDefault();
    itemRefs.current[next]?.focus();
  }

  return (
    <div
      className="relative shrink-0"
      ref={containerRef}
      onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setIsOpen(false); }}
    >
      <button
        type="button"
        className={compact
          ? `flex items-center gap-1.5 px-2 border-0 rounded-lg h-8 text-sm whitespace-nowrap transition-colors cursor-pointer ${
            isOpen ? 'bg-white/10 text-white' : 'bg-transparent text-white/60 hover:bg-white/[0.06] hover:text-white'
          }`
          : `flex items-center gap-2 px-3 border rounded-xl h-11 text-white text-sm whitespace-nowrap transition-colors cursor-pointer ${
            isOpen ? 'bg-white/10 border-white/20' : 'bg-white/[0.04] border-white/10 hover:bg-white/[0.07]'
          }`}
        ref={triggerRef}
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={event => {
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            setIsOpen(true);
          }
        }}
        aria-haspopup="menu"
        aria-controls={isOpen ? menuId : undefined}
        aria-expanded={isOpen}
        aria-label={label + ' ' + options[value]}
      >
        {Icon && <Icon aria-hidden="true" className="w-4 h-4 text-white/45" />}
        {/* 紧凑版在窄屏上只留图标（完整名称在 aria-label 里），给旁边的页签让位；没有图标时文字得留着，不然按钮是空的 */}
        <span className={compact && Icon ? 'max-sm:hidden' : ''}>{options[value]}</span>
        <LuChevronDown aria-hidden="true" className={`w-3.5 h-3.5 text-white/45 transition-transform ${isOpen ? 'rotate-180' : ''} ${compact ? 'max-sm:hidden' : ''}`} />
      </button>
      <Dropdown
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        position="right"
        placement={placement}
        containerRef={containerRef}
        className="p-1.5 min-w-40!"
      >
        <ul className="flex flex-col gap-0.5 m-0 p-0 list-none" id={menuId} role="menu" aria-label={label}>
          {options.map((option, index) => {
            const selected = index === value;
            return (
              <li key={index} role="none">
                <button
                  type="button"
                  role="menuitemradio"
                  aria-checked={selected}
                  tabIndex={-1}
                  ref={element => { itemRefs.current[index] = element; }}
                  onKeyDown={event => handleItemKey(event, index)}
                  className={`flex justify-between items-center gap-3 px-3 rounded-lg w-full h-10 text-sm text-left transition-colors cursor-pointer ${
                    selected ? 'bg-blue-400/10 text-blue-100' : 'text-white/75 hover:bg-white/[0.06] hover:text-white'
                  }`}
                  onClick={() => {
                    triggerRef.current?.focus();
                    onChange(index);
                    setIsOpen(false);
                  }}
                >
                  {option}
                  {selected && <LuCheck aria-hidden="true" className="w-4 h-4 text-blue-300" />}
                </button>
              </li>
            );
          })}
        </ul>
      </Dropdown>
    </div>
  );
}
