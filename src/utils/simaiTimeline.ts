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
  /** 每个音符格子在该行里的列号（1-based，指向第一个非空白字符） */
  columns: number[];
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

/** 每个音符格子的行列位置（指向格子里的第一个非空白字符） */
function noteCellPositions(fumen: string): { line: number; column: number }[] {
  const out: { line: number; column: number }[] = [];
  let offset = 0;
  let line = 1;
  let lineStart = 0;
  let cellStart = 0;
  // 当前格子里第一个非空白字符的位置
  let firstOffset = -1;
  let firstLine = 1;
  let firstLineStart = 0;

  const flush = (end: number) => {
    const cell = fumen.slice(cellStart, end);
    if (noteBody(cell) !== '' && firstOffset >= 0) {
      out.push({ line: firstLine, column: firstOffset - firstLineStart + 1 });
    }
    firstOffset = -1;
    cellStart = end + 1;
  };

  for (const char of fumen) {
    if (char === ',') {
      flush(offset);
    } else {
      const space = char === ' ' || char === '\t' || char === '\r' || char === '\n';
      if (!space && firstOffset === -1) {
        firstOffset = offset;
        firstLine = line;
        firstLineStart = lineStart;
      }
      if (char === '\n') {
        line += 1;
        lineStart = offset + 1;
      }
    }
    offset += 1;
  }
  flush(fumen.length);
  return out;
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

  const cells = noteCellPositions(cleaned);
  const totalLines = Math.max(1, cleaned.split('\n').length);
  const times = timings.map((timing) => timing.time + offset);

  const lines = timings.map((_, index) => {
    const cell = cells.length === timings.length
      ? cells[index]
      // 数量对不上（异常谱面）：按比例落到某个格子上，别让跟随直接失效
      : cells.length
        ? cells[Math.min(cells.length - 1, Math.floor((index / timings.length) * cells.length))]
        : { line: 1, column: 1 };
    return Math.min(Math.max(cell.line, 1), totalLines);
  });
  const columns = timings.map((_, index) => {
    const cell = cells.length === timings.length
      ? cells[index]
      : cells.length
        ? cells[Math.min(cells.length - 1, Math.floor((index / timings.length) * cells.length))]
        : { line: 1, column: 1 };
    return Math.max(cell.column, 1);
  });

  return { times, lines, columns };
}

/** 当前时间对应第几个格子；早于第一个返回 null */
function indexAt(timeline: Timeline, seconds: number): number | null {
  const { times } = timeline;
  if (!times.length || seconds < times[0]) return null;
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
  return found;
}

/** 当前时间落在哪个格子上；早于第一个返回 null，晚于最后一个停在最后 */
export function lineAt(timeline: Timeline | null, seconds: number): number | null {
  if (!timeline) return null;
  const index = indexAt(timeline, seconds);
  return index === null ? null : (timeline.lines[index] ?? null);
}

/** 当前时间对应的文本位置（行 + 列），用来把光标精确放到那个音符上 */
export function positionAt(timeline: Timeline | null, seconds: number): { line: number; column: number } | null {
  if (!timeline) return null;
  const index = indexAt(timeline, seconds);
  if (index === null) return null;
  return { line: timeline.lines[index], column: timeline.columns[index] ?? 1 };
}

/**
 * 反过来：光标在第 line 行第 column 列时对应的时间。
 * 取这一行里最后一个「不晚于光标」的格子；光标在所有音符之前就取第一个。
 */
export function timeAtPosition(timeline: Timeline | null, line: number, column = 1): number | null {
  if (!timeline || !timeline.times.length) return null;
  const { times, lines, columns } = timeline;

  let found = -1;
  for (let index = 0; index < lines.length; index++) {
    const cellLine = lines[index];
    const cellColumn = columns[index] ?? 1;
    if (cellLine < line || (cellLine === line && cellColumn <= column)) found = index;
    else break;
  }
  if (found !== -1) return times[found] ?? null;

  // 光标在第一个音符之前：回到第一个
  return times[0] ?? null;
}

/** 兼容旧调用：只给行号时，取这一行的第一个格子 */
export function timeAtLine(timeline: Timeline | null, line: number): number | null {
  return timeAtPosition(timeline, line, 1);
}
