/**
 * 分段式页签（我的收藏、推荐榜等共用）：圆角底框里的几个按钮，选中的那个高亮。
 * 传了 idPrefix 时按钮带 `${idPrefix}-tab-${key}` 的 id，并用 aria-controls 指向 `${idPrefix}-panel-${key}`。
 */
export default function SegmentedTabs<K extends string>({ tabs, active, onSelect, label, idPrefix, className = '' }: {
  tabs: readonly { key: K; label: string }[];
  active: K;
  onSelect: (key: K) => void;
  /** 给读屏用的页签栏名称 */
  label?: string;
  idPrefix?: string;
  className?: string;
}) {
  return (
    <div className={`flex bg-white/[0.04] p-1 border border-white/10 rounded-xl w-fit max-w-full h-11 overflow-x-auto [scrollbar-width:none] ${className}`} role="tablist" aria-label={label}>
      {tabs.map(({ key, label: tabLabel }) => (
        <button
          key={key}
          type="button"
          role="tab"
          id={idPrefix && `${idPrefix}-tab-${key}`}
          aria-controls={idPrefix && `${idPrefix}-panel-${key}`}
          aria-selected={active === key}
          className={`px-4 rounded-lg font-medium text-sm whitespace-nowrap transition-colors cursor-pointer ${active === key ? 'bg-white/10 text-white shadow-[0_1px_0_rgb(255_255_255/8%)_inset]' : 'text-white/55 hover:text-white'}`}
          onClick={() => onSelect(key)}
        >
          {tabLabel}
        </button>
      ))}
    </div>
  );
}
