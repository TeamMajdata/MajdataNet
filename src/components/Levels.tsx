import { makeLevelClickCallback } from '@/utils/scrollUtils';
import { renderLevel } from '@/utils/renderLevel';

export interface LevelsProps {
  /** 难度等级数组，索引对应：[Easy, Basic, Advanced, Expert, Master, ReMaster, Utage] */
  levels: (string | null | undefined)[];
  /** 歌曲ID */
  songid: string;
  /** 是否为玩家页面 */
  isPlayer?: boolean;
}

/**
 * 多难度等级列表组件
 * 显示所有可用的难度等级（最多7个）
 */
export default function Levels({ levels, songid, isPlayer = false }: LevelsProps) {
  // 预处理等级数组，将空值替换为 "-"
  const processedLevels = levels.map((level) => 
    (level == null || level === '') ? '-' : level
  );

  const levelClickCallback = makeLevelClickCallback(songid, isPlayer);

  // 难度顺序：0=Easy, 1=Basic, 2=Advanced, 3=Expert, 4=Master, 5=ReMaster, 6=Utage
  return (
    <div>
      {processedLevels.map((level, index) => (
        <div
          key={index}
          className="songLevel"
          id={`lv${index}`}
          style={{ display: level === '-' ? 'none' : 'unset' }}
          onClick={levelClickCallback}
        >
          {renderLevel(level)}
        </div>
      ))}
    </div>
  );
}
