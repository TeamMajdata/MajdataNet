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

/**
 * 每个「timing」对应的行列位置（指向该段里的第一个非空白字符）。
 *
 * 必须和 parseChart 的计数规则完全一致，否则位置会整体错位：
 * - 只有带音符的格子才产生 timing（去掉前导 (...) / {...} 后非空）；
 * - 一个格子里的反引号会把内容拆成多段，每段各产生一个 timing（假 each）。
 */
function noteCellPositions(fumen: string): { line: number; column: number }[] {
  const out: { line: number; column: number }[] = [];
  const lineStarts = [0];
  for (let i = 0; i < fumen.length; i++) if (fumen[i] === '\n') lineStarts.push(i + 1);

  const positionOf = (offset: number) => {
    let low = 0;
    let high = lineStarts.length - 1;
    while (low < high) {
      const mid = (low + high + 1) >> 1;
      if (lineStarts[mid] <= offset) low = mid;
      else high = mid - 1;
    }
    return { line: low + 1, column: offset - lineStarts[low] + 1 };
  };

  let cellStart = 0;
  const flush = (cellEnd: number) => {
    const cell = fumen.slice(cellStart, cellEnd);
    // 跳过前导空白和 (...) / {...} 声明，定位从真正的音符正文开始
    let bodyStart = 0;
    for (;;) {
      while (bodyStart < cell.length && /\s/.test(cell[bodyStart])) bodyStart += 1;
      if (cell[bodyStart] !== '(' && cell[bodyStart] !== '{') break;
      const closer = cell[bodyStart] === '(' ? ')' : '}';
      const end = cell.indexOf(closer, bodyStart + 1);
      if (end === -1) break;
      bodyStart = end + 1;
    }
    const body = cell.slice(bodyStart);
    if (body.trim() !== '') {
      // 和 parseChart 一样按反引号切段（空段跳过）
      let partStart = 0;
      for (;;) {
        const tick = body.indexOf('`', partStart);
        const partEnd = tick === -1 ? body.length : tick;
        const part = body.slice(partStart, partEnd);
        if (part !== '') {
          const lead = part.search(/\S/);
          out.push(positionOf(cellStart + bodyStart + partStart + (lead === -1 ? 0 : lead)));
        }
        if (tick === -1) break;
        partStart = tick + 1;
      }
    }
    cellStart = cellEnd + 1;
  };

  for (let i = 0; i < fumen.length; i++) if (fumen[i] === ',') flush(i);
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
