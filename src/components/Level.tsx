import type { LevelProps } from '@/types';
import { makeLevelClickCallback } from '@/utils/scrollUtils';
import { motion } from 'framer-motion';

// 难度等级背景色映射
const levelColors: Record<string, string> = {
  '0': 'bg-[rgb(111_171_250)]', // Easy
  '1': 'bg-[rgb(93_212_93)]',   // Basic
  '2': 'bg-[rgb(202_202_84)]',  // Advanced
  '3': 'bg-[rgb(255_91_91)]',   // Expert
  '4': 'bg-[rgb(134_23_134)]',  // Master
  '5': 'bg-[rgb(189_63_189)]',  // ReMaster
  '6': 'bg-[rgb(255_145_0)]',   // Utage
};

/**
 * 单个难度等级显示组件
 */
export default function Level({ level, difficulty, songid, isPlayer = false }: LevelProps) {
  const levelClickCallback = makeLevelClickCallback(songid, isPlayer);

  return (
    <motion.div
      className={`float-left text-center rounded-[5px] font-bold m-[0.1rem] w-[1.3rem] h-[1.3rem] text-[0.65rem] leading-[1.2rem] border border-gray-500 overflow-hidden cursor-pointer select-none ${levelColors[String(level)] || ''}`}
      style={{ display: 'unset' }}
      onClick={levelClickCallback}
      whileHover={{ scale: 1.1, filter: 'brightness(1.2)' }}
      transition={{ duration: 0.125, ease: 'easeInOut' }}
    >
      {difficulty}
    </motion.div>
  );
}
