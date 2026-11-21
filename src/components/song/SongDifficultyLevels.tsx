import { getLevelName } from '@/utils/levelUtils';
import { endpoints } from '@/config/api';
import { LEVEL_BG_CLASS } from '@/components/score/levelColors';
import type { SongDifficultyLevelsProps } from '@/types';

export default function SongDifficultyLevels({
  levels,
  songid,
  selected,
  onSelect,
  isPlayer = false
}: SongDifficultyLevelsProps) {
  function choose(index: number) {
    onSelect?.(index);
    if (isPlayer && window.unitySendMessage) {
      const chart = new URL(endpoints.maichart.prefix(songid), location.origin);
      window.unitySendMessage('HandleJSMessages', 'ReceiveMessage', [
        chart + '/chart', chart + '/track', chart + '/image?fullImage=true', chart + '/video', 'lv' + index,
      ].join('\n'));
    }
  }

  // 选中的难度是首页谱面卡片上那种难度色实底标签；其余是中性的深色标签，只有定数带难度色，
  // 这样一排里只有一个色块，不会一片发灰的颜色
  return (
    <div className="flex flex-wrap gap-1.5">
      {levels.map((value, index) => {
        const level = value?.replace(/\s/g, '');
        if (!level) return null;
        const label = index === 6 ? 'UTAGE' : getLevelName(index);
        const active = selected === index;
        return (
          <button key={index} type="button" id={'lv' + index} data-level={index}
            aria-pressed={active} onClick={() => choose(index)} disabled={!isPlayer && !onSelect}
            className={`inline-flex items-center gap-1.5 px-2.5 border rounded-lg h-8 text-xs leading-none whitespace-nowrap transition-colors cursor-pointer disabled:cursor-default select-none ${active
              ? `${LEVEL_BG_CLASS[index] ?? 'bg-white/15'} border-white/25 text-white shadow-[0_4px_14px_rgb(0_0_0/0.35)]`
              : 'bg-white/[0.05] hover:bg-white/10 border-white/10 hover:border-white/20 text-white/65 hover:text-white'}`}>
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
  0: '#9cc4ff', 1: '#8ee08e', 2: '#e6e27a', 3: '#ff8f8f', 4: '#d79bff', 5: '#f0a8f0', 6: '#ffb45c',
};
