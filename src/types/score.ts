/**
 * 成绩相关类型定义
 */

import type { ComboState } from './enums';
import type { UserBrief } from './user';

// 成绩接口
export interface ChartScore {
  player: {
    id?: string;
    username: string;
    nickname?: string;
    avatarId?: string;
  };
  acc: number;
  comboState: ComboState | number;
}

/** GET maiscore/leaderboard/chart/by-id/{chartId} 的响应 */
export interface ChartLeaderboardResponse {
  hash: string;
  /** 固定 7 项，下标为难度序号；没有 inote 的难度为 null */
  levelHashes: (string | null)[];
  /** 共 8 项，scores[level] 为该难度（按其 level hash 查询）的榜单；最后一项恒为空数组 */
  scores: ChartScore[][];
}

/** GET maiscore/leaderboard/chart/by-level/{levelHash} 的响应；没有成绩时 scores 为空数组 */
export interface LevelLeaderboardResponse {
  levelHash: string;
  scores: ChartScore[];
}

// 成绩数据接口
export interface ScoreData {
  username: string;
  userId: string;
  acc: { dx: number; classic: number };
  /** 玩家资料；账号已删除时为 null，旧版后端不返回。 */
  player?: UserBrief | null;
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
  timestamp?: string; // 最后游玩时间（可选）
}


export interface Score {
  acc: { "dx": number, "classic": number };
  dxScore: number;
  comboState: ComboState | number;
  chartLevel: number;
  hash: string;
  /**
   * 该难度的 level hash（64 位小写 hex），成绩按它唯一。
   * 迁移期间查不到谱面 metadata 的旧成绩没有这个字段（缺失或为 null），旧版后端也不返回。
   */
  levelHash?: string | null;
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
  hash: string;
  tags: string[];
  publicTags: string[];
}
export interface ScoreSumResponse {
  geneTime: string;
  players: ScoreData[];
}
