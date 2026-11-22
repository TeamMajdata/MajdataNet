import { getLevelName } from '@/utils/levelUtils';
import { LEVEL_BG_CLASS } from '@/components/score/levelColors';
import type { SongDifficultyLevelsProps } from '@/types';

export default function SongDifficultyLevels({
  levels,
  selected,
  onSelect,
  orientation = 'horizontal',
}: SongDifficultyLevelsProps) {
  const vertical = orientation === 'vertical';

  // 难度切换决定下面预览 / 排行榜看的是哪张谱，做成一条分段页签：外面一个框，选中的那格是难度色实底，
  // 其余格子透明，只有定数带难度色。窄屏放不下时横向滚动，不换行
  return (
    // 纵向（电脑侧栏）：每个难度占一行，难度名在左、定数在右
    <div className={vertical
      ? 'flex flex-col gap-1 bg-white/[0.04] p-1 border border-white/10 rounded-xl w-full'
      : 'flex gap-1 bg-white/[0.04] p-1 border border-white/10 rounded-xl max-w-full overflow-x-auto [scrollbar-width:none] w-fit'}>
      {levels.map((value, index) => {
        const level = value?.replace(/\s/g, '');
        if (!level) return null;
        const label = index === 6 ? 'UTAGE' : getLevelName(index);
        const active = selected === index;
        return (
          <button key={index} type="button" id={'lv' + index} data-level={index}
            aria-pressed={active} onClick={() => onSelect?.(index)} disabled={!onSelect}
            className={`inline-flex shrink-0 items-center gap-1.5 px-3 rounded-lg ${vertical ? 'justify-between h-9 text-sm' : 'h-8 text-xs'} leading-none whitespace-nowrap transition-colors cursor-pointer disabled:cursor-default select-none ${active
              ? `${LEVEL_BG_CLASS[index] ?? 'bg-white/15'} text-white shadow-[0_2px_10px_rgb(0_0_0/0.35)]`
              : 'bg-transparent hover:bg-white/[0.07] text-white/60 hover:text-white'}`}>
            <span className="font-medium">{label}</span>
            <span className="font-bold text-sm tabular-nums" style={active ? undefined : { color: LEVEL_TEXT_COLORS[index] }}>{level}</span>
          </button>
        );
      })}
    </div>
  );
}

/** 没选中时定数的颜色：难度色的浅色版本，在深色底上看得清 */
const LEVEL_TEXT_COLORS: Record<number, string> = {
  0: '#7cc4ff', 1: '#7ee06a', 2: '#ffd24a', 3: '#ff8f8f', 4: '#d79bff', 5: '#f0a8f0', 6: '#ffb45c',
};
