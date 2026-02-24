import React from 'react';
import { makeLevelClickCallback } from '@/utils/scrollUtils';

export interface LevelProps {
  /** 等级数字，如 "13+", "14" */
  level: string;
  /** 难度等级，如 "Master", "Expert" */
  difficulty: string;
  /** 歌曲ID */
  songid: string;
  /** 是否为玩家页面 */
  isPlayer?: boolean;
}

/**
 * 单个难度等级显示组件
 */
export default function Level({ level, difficulty, songid, isPlayer = false }: LevelProps) {
  const levelClickCallback = makeLevelClickCallback(songid, isPlayer);

  return (
    <div
      className="songLevel"
      id={`lv${level}`}
      style={{ display: 'unset' }}
      onClick={levelClickCallback}
    >
      {difficulty}
    </div>
  );
}
