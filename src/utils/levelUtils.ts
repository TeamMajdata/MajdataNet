/**
 * 难度等级相关工具函数
 */
import { DifficultyLevel } from '../types';

/**
 * 获取难度等级名称
 * @param level 难度等级数值
 * @returns 难度名称
 */
export function getLevelName(level: number): string {
  switch (level) {
    case DifficultyLevel.Easy:
      return 'Easy';
    case DifficultyLevel.Basic:
      return 'Basic';
    case DifficultyLevel.Advanced:
      return 'Advanced';
    case DifficultyLevel.Expert:
      return 'Expert';
    case DifficultyLevel.Master:
      return 'Master';
    case DifficultyLevel.ReMaster:
      return 'Re:Master';
    case DifficultyLevel.Utage:
      return 'UTAGE/Original';
    default:
      return 'Unknown';
  }
}
