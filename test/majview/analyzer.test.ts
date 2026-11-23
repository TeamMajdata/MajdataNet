import { describe, expect, it } from 'vitest';
import { ANALYZER_BAR_COUNT, analyzeChart } from '@/majview/analyzer.js';

const note = (time: number, kind: string) => ({ time, kind });

describe('chart analyzer (aligned with MajdataPlay ChartAnalyzer)', () => {
  it('returns 64 empty bars for an empty chart', () => {
    const { bars, max } = analyzeChart([], 10);
    expect(bars).toHaveLength(ANALYZER_BAR_COUNT);
    expect(Math.max(...bars.map((bar) => bar.tap + bar.slide + bar.touch))).toBe(0);
    expect(max).toBe(0);
  });

  it('counts a tap and a hold as a tap, a slide as two and a touch as one', () => {
    const { bars } = analyzeChart(
      [note(0, 'tap'), note(0, 'hold'), note(0, 'slide'), note(0, 'touch'), note(0, 'star')],
      10,
    );
    // tap 2 + slide 2 + touch 1 = 5 is the busiest bar, so it becomes 1 high in three parts.
    expect(bars[0].tap).toBeCloseTo(2 / 5, 10);
    expect(bars[0].slide).toBeCloseTo(2 / 5, 10);
    expect(bars[0].touch).toBeCloseTo(1 / 5, 10);
  });

  it('puts a note in the bar of its time and clamps the end to the last bar', () => {
    const { bars } = analyzeChart([note(5, 'tap'), note(12, 'tap')], 10);
    expect(bars[32].tap).toBe(1);
    expect(bars[ANALYZER_BAR_COUNT - 1].tap).toBe(1);
    expect(bars[0].tap).toBe(0);
  });

  it('shifts the bars with the chart start', () => {
    const { bars } = analyzeChart([note(2, 'tap')], 10, 2);
    expect(bars[0].tap).toBe(1);
  });

  it('ignores a chart without a length', () => {
    const { bars, max } = analyzeChart([note(0, 'tap')], 0);
    expect(max).toBe(0);
    expect(bars[0].tap).toBe(0);
  });
});
