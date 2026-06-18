/**
 * SongDifficultyLevels 组件 - 显示歌曲所有难度等级
 * 迁移自 legacy/src/app/song/SongDifficultyLevels.jsx
 */

import React from "react";
import { renderLevel } from "@/utils/renderLevel";
import type { SongDifficultyLevelsProps } from "@/types";

export default function SongDifficultyLevels({
  levels,
  songid,
  isPlayer = false,
}: SongDifficultyLevelsProps) {
  // 处理空值
  if (!levels || !Array.isArray(levels)) {
    return <div>No difficulty levels available</div>;
  }
  const processedLevels = levels.map((level) => {
    if (level == null || level === "") {
      return "-";
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
      const httpprefix = location.protocol + "//" + location.host;
      let root = "/api3/api";
      if (!root.startsWith("http")) {
        root = httpprefix + root;
      }
      const maichart = root + "/maichart/" + songid;
      const maidata = maichart + "/chart";
      const track = maichart + "/track";
      const bg = maichart + "/image?fullImage=true";
      const mv = maichart + "/video";
      window.unitySendMessage(
        "HandleJSMessages",
        "ReceiveMessage",
        `${maidata}\n${track}\n${bg}\n${mv}\n${id}`,
      );
    }
  };

  // 难度名称映射
  const levelNames = [
    "Easy",
    "Basic",
    "Advanced",
    "Expert",
    "Master",
    "Re:Master",
    "UTAGE",
  ];

  // 难度渐变背景映射（清新亮色）
  const levelGradients = [
    "linear-gradient(90deg, rgb(147 197 253 / 50%), rgb(191 219 254 / 30%))",
    "linear-gradient(90deg, rgb(134 239 172 / 50%), rgb(187 247 208 / 30%))",
    "linear-gradient(90deg, rgb(253 224 71 / 50%), rgb(254 240 138 / 30%))",
    "linear-gradient(90deg, rgb(252 165 165 / 50%), rgb(254 202 202 / 30%))",
    "linear-gradient(90deg, rgb(196 181 253 / 50%), rgb(221 214 254 / 30%))",
    "linear-gradient(90deg, rgb(244 168 222 / 50%), rgb(249 199 239 / 30%))",
    "linear-gradient(90deg, rgb(199 210 254 / 50%), rgb(224 231 255 / 30%))",
  ];

  return (
    <div className="flex flex-row flex-wrap gap-2 w-auto">
      {processedLevels.map((level, index) => {
        if (level === "-") return null;

        return (
          <div
            key={index}
            className={`flex flex-row items-center justify-between gap-3 px-4 py-2 rounded-full w-40 shrink-0 transition-all duration-200 ease-out min-h-10 ${
              isPlayer
                ? "cursor-pointer hover:translate-x-1 hover:shadow-lg"
                : ""
            }`}
            style={{ background: levelGradients[index] }}
            id={`lv${index}`}
            onClick={levelClickCallback}
            title={`${levelNames[index]} ${level}`}
          >
            <span className="flex-1 font-semibold text-gray-700 text-xs uppercase tracking-wide">
              {levelNames[index]}
            </span>
            <span className="min-w-8 font-bold text-gray-800 text-2xl text-right">
              {renderLevel(level)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
