import { makeLevelClickCallback } from '@/utils/scrollUtils';
import type { LevelsProps } from '@/types';
import { Link } from 'react-router-dom';
import { LEVEL_BG_CLASS as levelColors } from './levelColors';


// 只有一个难度时显示的完整名称
const levelNames = ['Easy', 'Basic', 'Advanced', 'Expert', 'Master', 'Re:Master', 'Utage'];

/**
 * 多难度等级列表组件
 * 标签宽度随文字变化；只有一个难度时显示“难度名 + 等级”。
 */
export default function Levels({ levels, songid, isPlayer = false, linkToSong = false }: LevelsProps) {
  // 难度顺序：0=Easy, 1=Basic, 2=Advanced, 3=Expert, 4=Master, 5=ReMaster, 6=Utage
  const available = levels
    .map((level, index) => ({ level, index }))
    .filter((item): item is { level: string; index: number } => item.level != null && item.level !== '');
  const single = available.length === 1;

  const levelClickCallback = makeLevelClickCallback(songid, isPlayer);

  return (
    <div className="flex flex-wrap gap-1">
      {available.map(({ level, index }) => {
        const className = `inline-flex items-center gap-1 px-1.5 rounded-md min-w-5.5 h-5 font-bold text-[0.7rem] text-white leading-none whitespace-nowrap justify-center hover:brightness-125 shadow-[0_0_0_1px_rgb(255_255_255/12%)_inset] transition-[filter] cursor-pointer select-none no-underline ${levelColors[index] || ''}`;
        const content = <>
          {single && <span className="font-semibold">{levelNames[index]}</span>}
          <span>{level}</span>
        </>;
        return linkToSong ? (
          <Link key={index} to={`/song?id=${songid}&level=${index}`} className={className}>{content}</Link>
        ) : (
          <button key={index} type="button" className={className} onClick={levelClickCallback}>{content}</button>
        );
      })}
    </div>
  );
}
