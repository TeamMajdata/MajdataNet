/**
 * 枚举类型定义
 */

// 难度等级枚举
export const DifficultyLevel = {
  Easy: 0,
  Basic: 1,
  Advanced: 2,
  Expert: 3,
  Master: 4,
  ReMaster: 5,
  Utage: 6,
} as const;
export type DifficultyLevel = (typeof DifficultyLevel)[keyof typeof DifficultyLevel];

// Combo状态枚举
export const ComboState = {
  None: 0,
  FC: 1,
  FCPlus: 2,
  AP: 3,
  APPlus: 4,
} as const;
export type ComboState = (typeof ComboState)[keyof typeof ComboState];
