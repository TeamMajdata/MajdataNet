import type { ComponentType } from 'react';

/**
 * 下划线样式的页签栏（个人空间、推荐榜等共用）。
 * 页签可以带图标和计数（计数显示成名字后面的小圆角数字）。
 * 只负责页签按钮；对应的面板由页面自己渲染，id 为 `${idPrefix}-panel-${key}`，
 * 并用 aria-labelledby 指向 `${idPrefix}-tab-${key}`。
 */
export default function UnderlineTabs<K extends string>({ tabs, active, onSelect, idPrefix, label }: {
  tabs: readonly { key: K; label: string; icon?: ComponentType<{ className?: string }>; count?: number }[];
  active: K;
  onSelect: (key: K) => void;
  idPrefix: string;
  /** 给读屏用的页签栏名称 */
  label: string;
}) {
  return (
    <div className="flex gap-6 mb-6 border-white/10 border-b overflow-x-auto [scrollbar-width:none]" role="tablist" aria-label={label}>
      {tabs.map(({ key, label: tabLabel, icon: Icon, count }) => (
        <button
          key={key}
          type="button"
          role="tab"
          id={`${idPrefix}-tab-${key}`}
          aria-controls={`${idPrefix}-panel-${key}`}
          aria-selected={active === key}
          onClick={() => onSelect(key)}
          className={`-mb-px inline-flex items-center gap-1.5 bg-transparent px-0.5 py-3 border-0 border-b-2 border-solid font-medium text-sm whitespace-nowrap transition-colors cursor-pointer ${active === key ? 'border-blue-400 text-white' : 'border-transparent text-white/55 hover:text-white'}`}
        >
          {Icon && <Icon aria-hidden="true" className="w-4 h-4 shrink-0" />}
          {tabLabel}
          {count !== undefined && (
            <span className={`px-1.5 rounded-full min-w-5 font-medium text-[0.7rem] text-center tabular-nums leading-[1.125rem] ${active === key ? 'bg-white/15 text-white/90' : 'bg-white/[0.08] text-white/55'}`}>{count}</span>
          )}
        </button>
      ))}
    </div>
  );
}
