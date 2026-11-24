import { describe, expect, it } from 'vitest';
import { buildTimeline, lineAt, positionAt, timeAtLine, timeAtPosition } from '@/utils/simaiTimeline';
import { parseChart } from '@/majview/simai.js';

describe('buildTimeline', () => {
  it('格子和逗号一一对应时，行号正确', () => {
    const fumen = '(120){4},1,2,3,4,';
    const timeline = buildTimeline(fumen);
    expect(timeline).not.toBeNull();
    expect(timeline!.lines.length).toBe(timeline!.times.length);
    // 整个谱面只有一行
    expect(new Set(timeline!.lines)).toEqual(new Set([1]));
  });

  it('多行谱面里，后面的格子落在后面的行', () => {
    const fumen = '(120){4},1,2,3,4,\n5,6,7,8,';
    const timeline = buildTimeline(fumen)!;
    const firstLine = timeline.lines[0];
    const lastLine = timeline.lines[timeline.lines.length - 1];
    expect(firstLine).toBe(1);
    expect(lastLine).toBeGreaterThan(1);
  });

  it('时间单调不减，并包含 first 偏移', () => {
    const plain = buildTimeline('(120){4},1,2,3,4,', 0)!;
    const shifted = buildTimeline('(120){4},1,2,3,4,', 0.5)!;
    expect(shifted.times[0] - plain.times[0]).toBeCloseTo(0.5, 5);
    for (let i = 1; i < plain.times.length; i++) {
      expect(plain.times[i]).toBeGreaterThanOrEqual(plain.times[i - 1]);
    }
  });

  it('音符格子的数量与 parseChart 的 timing 数量一致（关键假设）', () => {
    const samples = [
      '(150){8},1,2,3,4,5,6,7,8,\n(180){4},1h[2:1],2,3,4,',
      '(120){4},1,2,{16}3,4,',
      '(120){4},1,,2,,',
      '(120){4},1,2,(180)3,4,',
      '(120){4},,,,1,',
    ];
    for (const fumen of samples) {
      const timeline = buildTimeline(fumen)!;
      expect(timeline.times.length).toBe(parseChart(fumen).noteTimings.length);
    }
  });

  it('纯命令格子（BPM / 拍号）不占一行映射', () => {
    const fumen = '(150){8},1,2,\n(180){4},3,4,';
    const timeline = buildTimeline(fumen)!;
    // 4 个音符格子：1、2、3、4
    expect(timeline.times.length).toBe(4);
    expect(timeline.lines[0]).toBe(1);
    expect(timeline.lines[3]).toBe(2);
  });

  it('注释不算音符内容', () => {
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

describe('lineAt', () => {
  const timeline = buildTimeline('(120){4},1,2,3,4,\n5,6,7,8,')!;

  it('早于第一个音符返回 null', () => {
    expect(lineAt(timeline, -10)).toBeNull();
  });

  it('落在区间里返回对应行', () => {
    const mid = timeline.times[Math.floor(timeline.times.length / 2)];
    const line = lineAt(timeline, mid);
    expect(line).toBeGreaterThanOrEqual(1);
  });

  it('超过最后一个音符仍然停在最后一行', () => {
    const last = timeline.times[timeline.times.length - 1] + 100;
    expect(lineAt(timeline, last)).toBe(timeline.lines[timeline.lines.length - 1]);
  });

  it('空时间轴返回 null', () => {
    expect(lineAt(null, 1)).toBeNull();
  });
});

describe('timeAtLine', () => {
  const timeline = buildTimeline('(120){4},1,2,\n3,4,')!;

  it('光标在某个音符行，返回那一行的时间', () => {
    const line = timeline.lines[0];
    expect(timeAtLine(timeline, line)).toBeCloseTo(timeline.times[0], 5);
  });

  it('光标在最后一行之后，停在最后一个音符', () => {
    expect(timeAtLine(timeline, 99)).toBeCloseTo(timeline.times[timeline.times.length - 1], 5);
  });

  it('光标在所有音符之前，回到第一个音符', () => {
    expect(timeAtLine(timeline, 0)).toBeCloseTo(timeline.times[0], 5);
  });

  it('和 lineAt 互为反函数（同一时间轴上）', () => {
    const time = timeline.times[2];
    const line = lineAt(timeline, time)!;
    expect(timeAtLine(timeline, line)).toBeCloseTo(time, 5);
  });

  it('空时间轴返回 null', () => {
    expect(timeAtLine(null, 3)).toBeNull();
  });
});

describe('位置映射（行 + 列）', () => {
  // (180){4},1,2,\n3,4,   →  1 在第 10 列、2 在第 12 列、3 在第二行第 1 列、4 在第 3 列
  const timeline = buildTimeline('(180){4},1,2,\n3,4,')!;

  it('每个格子记下自己的行号', () => {
    expect(timeline.lines).toEqual([1, 1, 2, 2]);
  });

  it('每个格子记下自己的列号', () => {
    expect(timeline.columns).toEqual([10, 12, 1, 3]);
  });

  it('positionAt 给出精确的行列，而不是行首', () => {
    expect(positionAt(timeline, timeline.times[0])).toEqual({ line: 1, column: 10 });
    expect(positionAt(timeline, timeline.times[1])).toEqual({ line: 1, column: 12 });
    expect(positionAt(timeline, timeline.times[2])).toEqual({ line: 2, column: 1 });
  });

  it('timeAtPosition 按列区分同一行里的多个音符', () => {
    // 第 1 行：第 10 列是第一个音符，第 11 列还属于它
    expect(timeAtPosition(timeline, 1, 11)).toBeCloseTo(timeline.times[0], 5);
    // 第 12 列就是第二个音符了
    expect(timeAtPosition(timeline, 1, 12)).toBeCloseTo(timeline.times[1], 5);
    // 再往后还是第二个
    expect(timeAtPosition(timeline, 1, 30)).toBeCloseTo(timeline.times[1], 5);
  });

  it('timeAtPosition 在行首时回退到这一行的第一个音符', () => {
    expect(timeAtPosition(timeline, 1, 1)).toBeCloseTo(timeline.times[0], 5);
    expect(timeAtPosition(timeline, 2, 1)).toBeCloseTo(timeline.times[2], 5);
  });

  it('positionAt 和 timeAtPosition 在音符位置上互为反函数', () => {
    for (let index = 0; index < timeline.times.length; index++) {
      const position = positionAt(timeline, timeline.times[index])!;
      expect(timeAtPosition(timeline, position.line, position.column)).toBeCloseTo(timeline.times[index], 5);
    }
  });
});
