import { describe, expect, it } from 'vitest';
import { SCRUB_SECONDS_PER_WIDTH, seekTarget } from '@/majview/gestures.js';

describe('MajView board seek gesture', () => {
  it('seeks forward when the finger moves right and backward when it moves left', () => {
    expect(seekTarget(30, 100, 400, 0, 200)).toBe(45);
    expect(seekTarget(30, -100, 400, 0, 200)).toBe(15);
  });

  it('maps a full board width to 60 seconds', () => {
    expect(seekTarget(0, 400, 400, 0, 300)).toBe(SCRUB_SECONDS_PER_WIDTH);
  });

  it('spreads a short chart across the whole width instead of seeking past the end', () => {
    expect(seekTarget(0, 200, 400, 0, 20)).toBe(10);
  });

  it('keeps the target inside the chart, including the clock before zero', () => {
    expect(seekTarget(1, -400, 400, -2, 200)).toBe(-2);
    expect(seekTarget(199, 400, 400, 0, 200)).toBe(200);
  });

  it('does nothing without a measurable board or a loaded chart', () => {
    expect(seekTarget(12, 100, 0, 0, 200)).toBe(12);
    expect(seekTarget(12, 100, 400, 5, 5)).toBe(12);
  });
});
