import { makeLevelClickCallback } from '@/utils/scrollUtils';
import { renderLevel } from '@/utils/renderLevel';
import type { LevelsProps } from '@/types';

// 难度等级背景色映射
const levelColors: Record<number, string> = {
  0: 'bg-[rgb(111_171_250)]', // Easy
  1: 'bg-[rgb(93_212_93)]',   // Basic
  2: 'bg-[rgb(202_202_84)]',  // Advanced
  3: 'bg-[rgb(255_91_91)]',   // Expert
  4: 'bg-[rgb(134_23_134)]',  // Master
  5: 'bg-[rgb(189_63_189)]',  // ReMaster
  6: 'bg-[rgb(255_145_0)]',   // Utage
};

/**
 * 多难度等级列表组件
 * 标签宽度随文字变化。
 */
export default function Levels({ levels, songid, isPlayer = false }: LevelsProps) {
  // 难度顺序：0=Easy, 1=Basic, 2=Advanced, 3=Expert, 4=Master, 5=ReMaster, 6=Utage
  const available = levels
    .map((level, index) => ({ level, index }))
    .filter((item): item is { level: string; index: number } => item.level != null && item.level !== '');

  const levelClickCallback = makeLevelClickCallback(songid, isPlayer);

  return (
    <div className="flex flex-wrap gap-1">
      {available.map(({ level, index }) => (
        <button
          key={index}
          type="button"
          className={`inline-flex items-center gap-1 px-1.5 rounded-md min-w-5.5 h-5 font-bold text-[0.7rem] text-white leading-none whitespace-nowrap justify-center hover:brightness-125 shadow-[0_0_0_1px_rgb(255_255_255/12%)_inset] transition-[filter] cursor-pointer select-none ${levelColors[index] || ''}`}
          onClick={levelClickCallback}
        >
          <span>{renderLevel(level)}</span>
        </button>
      ))}
    </div>
  );
}
