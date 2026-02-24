import type { LevelProps } from '@/types';
import { makeLevelClickCallback } from '@/utils/scrollUtils';



/**
 * 单个难度等级显示组件
 */
export default function Level({ level, difficulty, songid, isPlayer = false }: LevelProps) {
  const levelClickCallback = makeLevelClickCallback(songid, isPlayer);

  return (
    <div
      className="songLevel"
      id={`lv${level}`}
      style={{ display: 'unset' }}
      onClick={levelClickCallback}
    >
      {difficulty}
    </div>
  );
}
