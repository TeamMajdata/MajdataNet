import type { LevelProps } from '@/types';
import { makeLevelClickCallback } from '@/utils/scrollUtils';
import { motion } from 'framer-motion';

// 难度配色（彩色背景 + 白字，保持 maimai 色相，放大版）
const levelColors: Record<string, string> = {
  '0': 'bg-[#4fa3ff]', // Easy
  '1': 'bg-[#3ed67b]', // Basic
  '2': 'bg-[#ffd23f]', // Advanced
  '3': 'bg-[#ff5252]', // Expert
  '4': 'bg-[#7b1fa2]', // Master
  '5': 'bg-[#d14ce6]', // ReMaster
  '6': 'bg-[#ff9e1b]', // Utage
};

/**
 * 单个难度等级显示组件
 */
export default function Level({ level, difficulty, songid, isPlayer = false }: LevelProps) {
  const levelClickCallback = makeLevelClickCallback(songid, isPlayer);

  return (
    <motion.div
      className={`float-left text-center font-bold w-6 h-6 text-[0.75rem] leading-[1.5rem] text-white border border-white/30 overflow-hidden cursor-pointer select-none ${levelColors[level] ?? ''}`}
      style={{ display: 'unset' }}
      onClick={levelClickCallback}
      whileHover={{ scale: 1.08 }}
      transition={{ duration: 0.125, ease: 'easeInOut' }}
    >
      {difficulty}
    </motion.div>
  );
}
