/**
 * SongDifficultyLevels 组件 - 显示歌曲所有难度等级
 * 迁移自 legacy/src/app/song/SongDifficultyLevels.jsx
 */

import React from 'react';
import { renderLevel } from '@/utils/renderLevel';
import type { SongDifficultyLevelsProps } from '@/types';

export default function SongDifficultyLevels({ 
  levels, 
  isPlayer = false 
}: SongDifficultyLevelsProps) {
  // 处理空值
  const processedLevels = levels.map((level) => {
    if (level == null || level === '') {
      return '-';
    }
    return level;
  });

  const levelClickCallback = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isPlayer) return;
    const target = e.currentTarget;
    const id = target.id;
    if (!id) return;
    
    // 使用全局的 window.unitySendMessage (Majdata组件会设置)
    if (window.unitySendMessage) {
      window.unitySendMessage('HandleJSMessages', 'ReceiveMessage', 'changeDifficulty\n' + id);
    }
  };

  // 难度名称映射
  const levelNames = [
    'Easy',
    'Basic',
    'Advanced',
    'Expert',
    'Master',
    'Re:Master',
    'UTAGE',
  ];

  // 难度颜色类名映射
  const levelColorClasses = [
    'level-easy',
    'level-basic',
    'level-advanced',
    'level-expert',
    'level-master',
    'level-remaster',
    'level-utage',
  ];

  return (
    <div className="difficulty-levels-list">
      {processedLevels.map((level, index) => {
        if (level === '-') return null;

        return (
          <div
            key={index}
            className={`difficulty-level-item ${levelColorClasses[index]} ${
              isPlayer ? 'clickable' : ''
            }`}
            id={`lv${index}`}
            onClick={levelClickCallback}
            title={`${levelNames[index]} ${level}`}
          >
            <span className="difficulty-level-name">{levelNames[index]}</span>
            <span className="difficulty-level-value">{renderLevel(level)}</span>
          </div>
        );
      })}
    </div>
  );
}
