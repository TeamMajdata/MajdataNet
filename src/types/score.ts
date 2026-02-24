/**
 * 成绩相关类型定义
 */

import type { ComboState } from './enums';

// 成绩接口
export interface Score {
  player: {
    username: string;
  };
  acc: number;
  comboState: ComboState | number;
}

// 成绩数据接口
export interface ScoreData {
  username: string;
  dxAccSum: number;
}

// 最近游玩数据接口
export interface RecentPlayedData {
  chartId: string;
  title: string;
  artist: string;
  uploader: string;
  designer: string;
  level: string;
  difficulty: string;
  acc: number;
  comboState: ComboState | number;
}
