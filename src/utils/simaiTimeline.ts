/**
 * 播放时间 → 谱面文本行，用于「文本跟随」。
 *
 * parseChart 对"逗号分隔的格子"一条条计时，但**只有音符格子会产生 timing**：
 * 纯命令格子（`(180)`、`{16}`、`(180){16}`）和空格子（`,,`）都不会。
 * 所以这里先按同样的规则把格子筛出来，再和 parseChart 的时间一一对上。
 */
import { parseChart } from '@/majview/simai.js';

export type Timeline = {
  /** 每个音符格子的开始时间（秒，已含 first 偏移） */
  times: number[];
  /** 每个音符格子所在的文本行号（1-based） */
  lines: number[];
};

type ParsedTiming = { time: number };

/** 把注释内容换成空格，保留换行和列位置，便于按行号对齐 */
function blankComments(fumen: string): string {
  return fumen.replace(/^[ \t]*\|\|[^\n]*/gm, (match) => match.replace(/[^\n]/g, ' '));
}

/** 去掉格子开头的 `(...)` / `{...}` 命令前缀，返回剩下的音符正文 */
function noteBody(cell: string): string {
  let rest = cell.trim();
  for (;;) {
    if (!rest.startsWith('(') && !rest.startsWith('{')) return rest;
    const closer = rest[0] === '(' ? ')' : '}';
    const end = rest.indexOf(closer);
    // 括号没闭合就当作有内容，交给 parseChart 去报错
    if (end === -1) return rest;
    rest = rest.slice(end + 1).trim();
  }
}

/** 每个音符格子所在的行号 */
function noteCellLines(fumen: string): number[] {
  const lines: number[] = [];
  let line = 1;
  let cellStartLine = 1;
  let cell = '';

  const flush = () => {
    if (noteBody(cell) !== '') {
      // 格子可能跨行，取第一个非空白字符所在行
      const offset = cell.search(/\S/);
      const extra = offset === -1 ? 0 : (cell.slice(0, offset).match(/\n/g)?.length ?? 0);
      lines.push(cellStartLine + extra);
    }
    cell = '';
    cellStartLine = line;
  };

  for (const char of fumen) {
    if (char === ',') {
      flush();
      continue;
    }
    if (char === '\n') line += 1;
    cell += char;
  }
  flush();
  return lines;
}

export function buildTimeline(fumen: string, offset = 0): Timeline | null {
  if (!fumen.trim()) return null;

  const cleaned = blankComments(fumen);
  let parsed: { noteTimings?: ParsedTiming[] };
  try {
    parsed = parseChart(cleaned) as { noteTimings?: ParsedTiming[] };
  } catch {
    return null;
  }

  const timings = parsed.noteTimings ?? [];
  if (!timings.length) return null;

  const cellLines = noteCellLines(cleaned);
  const totalLines = Math.max(1, cleaned.split('\n').length);
  const times = timings.map((timing) => timing.time + offset);

  const lines = timings.map((_, index) => {
    const line = cellLines.length === timings.length
      ? cellLines[index]
      // 数量对不上（异常谱面）：按比例落到某个格子上，别让跟随直接失效
      : cellLines.length
        ? cellLines[Math.min(cellLines.length - 1, Math.floor((index / timings.length) * cellLines.length))]
        : 1;
    return Math.min(Math.max(line, 1), totalLines);
  });

  return { times, lines };
}

/** 当前时间落在哪个格子上；早于第一个返回 null，晚于最后一个停在最后 */
export function lineAt(timeline: Timeline | null, seconds: number): number | null {
  if (!timeline || !timeline.times.length) return null;
  const { times, lines } = timeline;
  if (seconds < times[0]) return null;

  let low = 0;
  let high = times.length - 1;
  let found = 0;
  while (low <= high) {
    const mid = (low + high) >> 1;
    if (times[mid] <= seconds) {
      found = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  return lines[found] ?? null;
}
