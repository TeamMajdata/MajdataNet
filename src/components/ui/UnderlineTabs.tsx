/**
 * 下划线样式的页签栏（个人空间、推荐榜等共用）。
 * 只负责页签按钮；对应的面板由页面自己渲染，id 为 `${idPrefix}-panel-${key}`，
 * 并用 aria-labelledby 指向 `${idPrefix}-tab-${key}`。
 */
export default function UnderlineTabs<K extends string>({ tabs, active, onSelect, idPrefix, label }: {
  tabs: readonly { key: K; label: string }[];
  active: K;
  onSelect: (key: K) => void;
  idPrefix: string;
  /** 给读屏用的页签栏名称 */
  label: string;
}) {
  return (
    <div className="flex gap-6 mb-6 border-white/10 border-b overflow-x-auto [scrollbar-width:none]" role="tablist" aria-label={label}>
      {tabs.map(({ key, label: tabLabel }) => (
        <button
          key={key}
          type="button"
          role="tab"
          id={`${idPrefix}-tab-${key}`}
          aria-controls={`${idPrefix}-panel-${key}`}
          aria-selected={active === key}
          onClick={() => onSelect(key)}
          className={`-mb-px bg-transparent px-0.5 py-3 border-0 border-b-2 border-solid font-medium text-sm whitespace-nowrap transition-colors cursor-pointer ${active === key ? 'border-blue-400 text-white' : 'border-transparent text-white/55 hover:text-white'}`}
        >
          {tabLabel}
        </button>
      ))}
    </div>
  );
}
