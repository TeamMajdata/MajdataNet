/**
 * 播放时间 ↔ 谱面文本位置的映射。
 *
 * 粒度是**逗号格子**，不是音符：`1,,2` 里中间那个空格子也是一格，有自己的时间。
 * `parseChart` 的 `commaTimings` 正好每个逗号一条（最后一个格子也有一条），
 * 所以直接用它给"每个格子"配时间即可，不需要再从音符反推。
 *
 * 这样 Ctrl+点击 / Ctrl+左右、拖动时间轴都能落在空逗号上，黄色小三角（光标时间）
 * 和文本光标始终是同一个位置。
 */
import { parseChart } from '@/majview/simai.js';

export type Timeline = {
  /** 每个逗号格子的开始时间（秒，已含 first 偏移） */
  times: number[];
  /** 每个格子第一个非空白字符所在的行号（1-based）；空格子取格子起点 */
  lines: number[];
  /** 同上，列号（1-based） */
  columns: number[];
};

type ParsedTiming = { time: number };

/** 把注释内容换成空格，保留换行和列位置，便于按行号对齐 */
function blankComments(fumen: string): string {
  return fumen.replace(/^[ \t]*\|\|[^\n]*/gm, (match) => match.replace(/[^\n]/g, ' '));
}

/** 按逗号切格子，返回每个格子的 [start, end) 偏移（end 不含逗号本身） */
function splitCells(fumen: string): { start: number; end: number }[] {
  const cells: { start: number; end: number }[] = [];
  let start = 0;
  for (let i = 0; i < fumen.length; i += 1) {
    if (fumen[i] === ',') {
      cells.push({ start, end: i });
      start = i + 1;
    }
  }
  cells.push({ start, end: fumen.length });
  return cells;
}

/** 行首偏移表 → 行号 / 列号（均 1-based） */
function lineStartsOf(fumen: string): number[] {
  const starts = [0];
  for (let i = 0; i < fumen.length; i += 1) if (fumen[i] === '\n') starts.push(i + 1);
  return starts;
}

function positionOf(lineStarts: number[], offset: number): { line: number; column: number } {
  let low = 0;
  let high = lineStarts.length - 1;
  while (low < high) {
    const mid = (low + high + 1) >> 1;
    if (lineStarts[mid] <= offset) low = mid;
    else high = mid - 1;
  }
  return { line: low + 1, column: offset - lineStarts[low] + 1 };
}

/**
 * 解析失败或没有格子时返回 null。
 * 格子数（逗号 + 1）和 `commaTimings` 数量对不上时按较短的算，避免异常谱面把位置整体错开。
 */
export function buildTimeline(fumen: string, offset = 0): Timeline | null {
  if (!fumen.trim()) return null;

  const cleaned = blankComments(fumen);
  let parsed: { commaTimings?: ParsedTiming[] };
  try {
    parsed = parseChart(cleaned) as { commaTimings?: ParsedTiming[] };
  } catch {
    return null;
  }

  const commas = parsed.commaTimings ?? [];
  if (!commas.length) return null;

  const cells = splitCells(cleaned);
  const count = Math.min(cells.length, commas.length);
  const lineStarts = lineStartsOf(cleaned);

  const times: number[] = [];
  const lines: number[] = [];
  const columns: number[] = [];
  for (let index = 0; index < count; index += 1) {
    const cell = cells[index];
    // 空格子（`,,`）没有非空白字符：光标就落在格子起点，也就是前一个逗号后面那一列
    let position = cell.start;
    while (position < cell.end && /\s/.test(cleaned[position])) position += 1;
    if (position >= cell.end) position = cell.start;
    const { line, column } = positionOf(lineStarts, position);
    times.push((commas[index].time ?? 0) + offset);
    lines.push(line);
    columns.push(column);
  }

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

/** 当前时间落在哪个格子；早于第一个返回 null，晚于最后一个停在最后 */
export function lineAt(timeline: Timeline | null, seconds: number): number | null {
  if (!timeline) return null;
  const index = indexAt(timeline, seconds);
  return index === null ? null : (timeline.lines[index] ?? null);
}

/** 当前时间对应的文本位置（行 + 列），用来把光标放到那个格子上（空格子也算） */
export function positionAt(timeline: Timeline | null, seconds: number): { line: number; column: number } | null {
  if (!timeline) return null;
  const index = indexAt(timeline, seconds);
  if (index === null) return null;
  return { line: timeline.lines[index], column: timeline.columns[index] ?? 1 };
}

/**
 * 反过来：光标在第 line 行第 column 列时所在的格子时间。
 * 取这一格（或光标前面最近的格子）；光标在第一个格子之前就取第一个。
 */
export function timeAtPosition(timeline: Timeline | null, line: number, column = 1): number | null {
  if (!timeline || !timeline.times.length) return null;
  const { times, lines, columns } = timeline;

  let found = -1;
  for (let index = 0; index < lines.length; index += 1) {
    const cellLine = lines[index];
    const cellColumn = columns[index] ?? 1;
    if (cellLine < line || (cellLine === line && cellColumn <= column)) found = index;
    else break;
  }
  if (found !== -1) return times[found] ?? null;

  // 光标在第一个格子之前：回到第一个
  return times[0] ?? null;
}

/** 兼容旧调用：只给行号时，取这一行的第一个格子 */
export function timeAtLine(timeline: Timeline | null, line: number): number | null {
  return timeAtPosition(timeline, line, 1);
}
