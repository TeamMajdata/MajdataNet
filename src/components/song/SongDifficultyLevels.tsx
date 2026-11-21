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

  // 和首页谱面卡片上的难度标签同一种样式（难度色实底、白字），放大一号并带上难度名；
  // 没选中的半透明，选中的不透明并加一圈白边
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
            className={`inline-flex items-center gap-1.5 px-2.5 rounded-md h-7 text-white text-xs leading-none whitespace-nowrap transition-[opacity,box-shadow,filter] cursor-pointer disabled:cursor-default select-none ${LEVEL_BG_CLASS[index] ?? 'bg-white/15'} ${active
              ? 'shadow-[0_0_0_2px_rgb(255_255_255/85%)]'
              : 'opacity-45 hover:opacity-80 shadow-[0_0_0_1px_rgb(255_255_255/12%)_inset]'}`}>
            <span className="font-semibold">{label}</span>
            <span className="font-bold text-sm tabular-nums">{level}</span>
          </button>
        );
      })}
    </div>
  );
}
