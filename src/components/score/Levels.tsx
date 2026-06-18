import { makeLevelClickCallback } from "@/utils/scrollUtils";
import { renderLevel } from "@/utils/renderLevel";
import type { LevelsProps } from "@/types";

const levelColors: Record<number, string> = {
  0: "rgba(56,189,248,0.8)",
  1: "rgba(52,211,153,0.8)",
  2: "rgba(251,191,36,0.8)",
  3: "rgba(244,63,94,0.8)",
  4: "rgba(217,70,239,0.8)",
  5: "rgba(139,92,246,0.8)",
  6: "rgba(249,115,22,0.8)",
};

export default function Levels({
  levels,
  songid,
  isPlayer = false,
}: LevelsProps) {
  const processedLevels = levels.map((level) =>
    level == null || level === "" ? "-" : level,
  );

  const levelClickCallback = makeLevelClickCallback(songid, isPlayer);

  return (
    <div>
      {processedLevels.map((level, index) => (
        <div
          key={index}
          className="inline-flex items-center justify-center rounded-full w-8 h-8 cursor-pointer select-none"
          style={{
            display: level === "-" ? "none" : "inline-flex",
            color: "#fff",
            backgroundColor: levelColors[index] || "rgba(209,213,219,0.8)",
          }}
          onClick={levelClickCallback}
        >
          {renderLevel(level)}
        </div>
      ))}
    </div>
  );
}
