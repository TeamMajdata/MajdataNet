import { describe, expect, it } from 'vitest';
import { SCRUB_SECONDS_PER_WIDTH, seekTarget, swipeValue } from '@/majview/gestures.js';

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

describe('MajView board value swipe', () => {
  it('raises the value when the finger moves up and covers the whole range over the board height', () => {
    expect(swipeValue(1, -200, 400, 0, 2, 0.1)).toBe(2);
    expect(swipeValue(1, 100, 400, 0, 2, 0.1)).toBe(0.5);
    expect(swipeValue(1, -100, 400, 0, 2, 0.1)).toBe(1.5);
  });

  it('rounds to the step and stays inside the range', () => {
    expect(swipeValue(8, 37, 400, 0, 10, 1)).toBe(7);
    expect(swipeValue(8, -900, 400, 0, 10, 1)).toBe(10);
    expect(swipeValue(1, 900, 400, 0, 2, 0.1)).toBe(0);
  });

  it('keeps the start value without a measurable board', () => {
    expect(swipeValue(0.7, 50, 0, 0, 2, 0.1)).toBe(0.7);
  });
});
