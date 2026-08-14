import { makeLevelClickCallback } from '@/utils/scrollUtils';
import { renderLevel } from '@/utils/renderLevel';
import type { LevelsProps } from '@/types';
import { motion } from 'framer-motion';

// 难度配色（彩色背景 + 白字，保持 maimai 色相，放大版）
const levelColors: Record<number, string> = {
  0: 'bg-[#4fa3ff]', // Easy
  1: 'bg-[#3ed67b]', // Basic
  2: 'bg-[#ffd23f]', // Advanced
  3: 'bg-[#ff5252]', // Expert
  4: 'bg-[#7b1fa2]', // Master
  5: 'bg-[#d14ce6]', // ReMaster
  6: 'bg-[#ff9e1b]', // Utage
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
          className={`float-left text-center font-bold w-6 h-6 text-[0.75rem] leading-[1.5rem] text-white border border-white/30 overflow-hidden cursor-pointer select-none ${levelColors[index] ?? ''}`}
          style={{ display: level === '-' ? 'none' : 'unset' }}
          onClick={levelClickCallback}
          whileHover={{ scale: 1.08 }}
          transition={{ duration: 0.125, ease: 'easeInOut' }}
        >
          {renderLevel(level)}
        </motion.div>
      ))}
    </div>
  );
}
