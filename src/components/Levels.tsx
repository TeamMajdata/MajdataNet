import { makeLevelClickCallback } from '@/utils/scrollUtils';
import { renderLevel } from '@/utils/renderLevel';
import type { LevelsProps } from '@/types';
import { motion } from 'framer-motion';

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
        <motion.div
          key={index}
          className={`float-left text-center rounded-[5px] font-bold m-[0.1rem] w-[1.3rem] h-[1.3rem] text-[0.65rem] leading-[1.2rem] border border-gray-500 overflow-hidden cursor-pointer select-none ${levelColors[index] || ''}`}
          style={{ display: level === '-' ? 'none' : 'unset' }}
          onClick={levelClickCallback}
          whileHover={{ scale: 1.1, filter: 'brightness(1.2)' }}
          transition={{ duration: 0.125, ease: 'easeInOut' }}
        >
          {renderLevel(level)}
        </motion.div>
      ))}
    </div>
  );
}
