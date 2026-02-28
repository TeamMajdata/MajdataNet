/**
 * 成绩相关类型定义
 */

import type { ComboState } from './enums';

// 成绩接口
export interface ChartScore {
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


export interface Score{
  acc: {"dx": number, "classic": number};
  dxScore: number;
  comboState : ComboState | number;
  chartLevel: number;
  hash: string;
  chartInfo: ChartInfo;
  timestamp: string; // 最后游玩时间
}

interface ChartInfo {
  id: string;
  title: string;
  artist: string;
  designer: string;
  description: string;
  levels: string[];
  uploader: string;
  timestamp: string;
  lastActive: string;
  hash: string;
  tags: string[];
  publicTags: string[];
}