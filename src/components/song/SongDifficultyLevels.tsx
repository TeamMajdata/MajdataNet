import { getLevelName } from '@/utils/levelUtils';
import { endpoints } from '@/config/api';
import { renderLevel } from '@/utils/renderLevel';
import type { SongDifficultyLevelsProps } from '@/types';

export default function SongDifficultyLevels({
  levels,
  songid,
  selected,
  onSelect,
  isPlayer = false
}: SongDifficultyLevelsProps) {
  function choose(index: number) {
    onSelect?.(index);
    if (isPlayer && window.unitySendMessage) {
      const chart = new URL(endpoints.maichart.prefix(songid), location.origin);
      window.unitySendMessage('HandleJSMessages', 'ReceiveMessage', [
        chart + '/chart', chart + '/track', chart + '/image?fullImage=true', chart + '/video', 'lv' + index,
      ].join('\n'));
    }
  }

  return (
    <div className="song-difficulty-list">
      {levels.map((value, index) => {
        const level = value?.replace(/\s/g, '');
        if (!level) return null;
        const label = index === 6 ? 'UTAGE' : getLevelName(index);
        return (
          <button key={index} type="button" id={'lv' + index} data-level={index}
            aria-pressed={selected === index} onClick={() => choose(index)} disabled={!isPlayer && !onSelect}>
            <span>{label}</span><strong>{renderLevel(level)}</strong>
          </button>
        );
      })}
    </div>
  );
}
