/**
 * SongDifficultyLevels 组件 - 显示歌曲所有难度等级
 * 迁移自 legacy/src/app/song/SongDifficultyLevels.jsx
 */

import React from 'react';
import { renderLevel } from '@/utils/renderLevel';
import { apiroot3 } from '@/config/api';
import type { SongDifficultyLevelsProps } from '@/types';

export default function SongDifficultyLevels({ 
  levels,
  songid,
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
      const httpprefix = location.protocol + '//' + location.host;
      let root = apiroot3;
      if (!root.startsWith('http')) {
        root = httpprefix + root;
      }
      const maichart = root + '/maichart/' + songid;
      const maidata = maichart + '/chart';
      const track = maichart + '/track';
      const bg = maichart + '/image?fullImage=true';
      const mv = maichart + '/video';
      window.unitySendMessage(
        'HandleJSMessages',
        'ReceiveMessage',
        `${maidata}\n${track}\n${bg}\n${mv}\n${id}`
      );
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

  // 难度渐变背景映射
  const levelGradients = [
    'linear-gradient(90deg, rgb(59 130 246 / 60%), rgb(59 130 246 / 40%))',
    'linear-gradient(90deg, rgb(34 197 94 / 60%), rgb(34 197 94 / 40%))',
    'linear-gradient(90deg, rgb(234 179 8 / 60%), rgb(234 179 8 / 40%))',
    'linear-gradient(90deg, rgb(239 68 68 / 60%), rgb(239 68 68 / 40%))',
    'linear-gradient(90deg, rgb(168 85 247 / 60%), rgb(168 85 247 / 40%))',
    'linear-gradient(90deg, rgb(192 38 211 / 60%), rgb(192 38 211 / 40%))',
    'linear-gradient(90deg, rgb(139 92 246 / 60%), rgb(139 92 246 / 40%))',
  ];

  return (
    <div className="flex flex-row flex-wrap gap-2 w-auto">
      {processedLevels.map((level, index) => {
        if (level === '-') return null;

        return (
          <div
            key={index}
            className={`flex flex-row items-center justify-between gap-3 px-4 py-2 rounded w-40 shrink-0 transition-all duration-200 ease-out min-h-10 ${
              isPlayer ? 'cursor-pointer hover:translate-x-1 hover:shadow-lg' : ''
            }`}
            style={{ background: levelGradients[index] }}
            id={`lv${index}`}
            onClick={levelClickCallback}
            title={`${levelNames[index]} ${level}`}
          >
            <span className="flex-1 font-semibold text-white text-xs uppercase tracking-wide">
              {levelNames[index]}
            </span>
            <span className="min-w-8 font-black text-white text-2xl text-right" style={{ textShadow: '0 2px 8px rgb(0 0 0 / 0.4)' }}>
              {renderLevel(level)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
