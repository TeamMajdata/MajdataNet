import { describe, expect, it } from 'vitest';
import { buildTimeline, lineAt, positionAt, timeAtLine, timeAtPosition } from '@/utils/simaiTimeline';

/** 逗号格子数 = 逗号数 + 1；parseChart 的 commaTimings 也是这个数量 */
const cellCount = (fumen: string) => (fumen.match(/,/g)?.length ?? 0) + 1;

describe('buildTimeline', () => {
  it('每个逗号格子都有一条时间（包括空逗号）', () => {
    const fumen = '(120){4},1,,2,,';
    const timeline = buildTimeline(fumen)!;
    expect(timeline).not.toBeNull();
    expect(timeline.times.length).toBe(cellCount(fumen));
    expect(timeline.lines.length).toBe(timeline.times.length);
    expect(timeline.columns.length).toBe(timeline.times.length);
  });

  it('多行谱面里，后面的格子落在后面的行', () => {
    const fumen = '(120){4},1,2,3,4,\n5,6,7,8,';
    const timeline = buildTimeline(fumen)!;
    expect(timeline.lines[0]).toBe(1);
    expect(timeline.lines[timeline.lines.length - 1]).toBe(2);
    expect(timeline.lines.at(-1)).toBeGreaterThan(1);
  });

  it('时间单调不减，并包含 first 偏移', () => {
    const plain = buildTimeline('(120){4},1,2,3,4,', 0)!;
    const shifted = buildTimeline('(120){4},1,2,3,4,', 0.5)!;
    expect(shifted.times[0] - plain.times[0]).toBeCloseTo(0.5, 5);
    for (let i = 1; i < plain.times.length; i++) {
      expect(plain.times[i]).toBeGreaterThanOrEqual(plain.times[i - 1]);
    }
  });

  it('空格子有自己的时间和位置：前后相邻的注释/音符不会挤掉它', () => {
    // 第 3 格是空的：它的时间和位置必须落在 1 和 2 之间
    const timeline = buildTimeline('(120){4},1,,2,')!;
    const empty = 2;
    expect(timeline.times[empty]).toBeGreaterThan(timeline.times[1]);
    expect(timeline.times[empty]).toBeLessThan(timeline.times[3]);
    expect(timeline.lines[empty]).toBe(1);
  });

  it('注释行被抹成空格，不参与定位', () => {
    const withComment = buildTimeline('|| 1,2,3 是说明\n(120){4},1,2,')!;
    const plain = buildTimeline('\n(120){4},1,2,')!;
    expect(withComment.times.length).toBe(plain.times.length);
    expect(withComment.lines[0]).toBe(2);
  });

  it('空谱面或坏谱面返回 null', () => {
    expect(buildTimeline('')).toBeNull();
    expect(buildTimeline('   ')).toBeNull();
    expect(buildTimeline('(180,1,2,')).toBeNull();
  });
});

describe('lineAt / positionAt', () => {
  const timeline = buildTimeline('(180){4},1,2,\n3,4,')!;

  it('早于第一个格子返回 null', () => {
    expect(lineAt(timeline, -10)).toBeNull();
    expect(positionAt(timeline, -10)).toBeNull();
  });

  it('超过最后一个格子仍然停在最后一格', () => {
    const last = timeline.times.at(-1)! + 100;
    expect(lineAt(timeline, last)).toBe(timeline.lines.at(-1));
    expect(positionAt(timeline, last)?.line).toBe(timeline.lines.at(-1));
  });

  it('时间落在两个格子之间时取前一个格子（空逗号也能落上去）', () => {
    const between = (timeline.times[2] + timeline.times[3]) / 2;
    expect(positionAt(timeline, between)).toEqual({ line: timeline.lines[2], column: timeline.columns[2] });
  });

  it('每个格子都能 position → time 往返', () => {
    for (let index = 0; index < timeline.times.length; index++) {
      const position = positionAt(timeline, timeline.times[index])!;
      expect(position).toEqual({ line: timeline.lines[index], column: timeline.columns[index] });
      expect(timeAtPosition(timeline, position.line, position.column)).toBeCloseTo(timeline.times[index], 5);
    }
  });

  it('空时间轴返回 null', () => {
    expect(lineAt(null, 1)).toBeNull();
    expect(timeAtLine(null, 3)).toBeNull();
  });
});

describe('timeAtPosition', () => {
  const timeline = buildTimeline('(180){4},1,2,\n3,4,')!;

  it('光标在某个尾格上，返回那一格的时间', () => {
    const last = timeline.lines.length - 1;
    expect(timeAtPosition(timeline, timeline.lines[last], timeline.columns[last])).toBeCloseTo(timeline.times[last], 5);
  });

  it('光标在行首时，回退到这一行之前的格子', () => {
    // 第 2 行行首在第一行的最后一个格子之后
    expect(timeAtPosition(timeline, 2, 1)).toBeGreaterThanOrEqual(timeline.times[0]);
  });

  it('光标在所有格子之前，回到第一个', () => {
    expect(timeAtPosition(timeline, 1, 1)).toBeCloseTo(timeline.times[0], 5);
    expect(timeAtLine(timeline, 0)).toBeCloseTo(timeline.times[0], 5);
  });

  it('和 lineAt 互为反函数（同一时间轴上）', () => {
    // 取第 2 行行首那一格：timeAtLine 只给行号时按这一行的第一格算
    const index = timeline.lines.findIndex((line, i) => line === 2 && timeline.columns[i] === 1);
    expect(index).toBeGreaterThanOrEqual(0);
    const time = timeline.times[index];
    const line = lineAt(timeline, time)!;
    expect(timeAtLine(timeline, line)).toBeCloseTo(time, 5);
  });
});

describe('Ctrl+左右 / Ctrl+点击 的落点', () => {
  // 1,,2 中间那个空逗号：以前没有时间，Ctrl+右 跳过它，光标位置和三角对不上
  const fumen = '(120){4},1,,2,';
  const timeline = buildTimeline(fumen)!;

  it('空逗号在时间轴上占一个位置', () => {
    expect(timeline.times.length).toBe(cellCount(fumen));
    const columns = timeline.columns;
    // 三个音符/空格子的列号依次递增，说明空逗号有自己的列
    expect(columns[1]).toBeGreaterThan(columns[0]);
    expect(columns[2]).toBeGreaterThan(columns[1]);
    expect(columns[3]).toBeGreaterThan(columns[2]);
  });

  it('光标落在空逗号上时，时间就是那一格的时间', () => {
    const emptyIndex = 2;
    expect(timeAtPosition(timeline, timeline.lines[emptyIndex], timeline.columns[emptyIndex])).toBeCloseTo(
      timeline.times[emptyIndex],
      5,
    );
  });
});
