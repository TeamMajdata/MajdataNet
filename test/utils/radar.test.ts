import { describe, expect, it } from 'vitest';
import { parseRequestedLevel } from '@/utils/radar';

describe('parseRequestedLevel', () => {
  const levels = ['', '', '', '11', '13+', '', null];

  it('returns the requested difficulty when the chart has it', () => {
    expect(parseRequestedLevel('4', levels)).toBe(4);
    expect(parseRequestedLevel('3', levels)).toBe(3);
  });

  it('ignores missing, empty, out-of-range or malformed values', () => {
    expect(parseRequestedLevel(null, levels)).toBeUndefined();
    expect(parseRequestedLevel('5', levels)).toBeUndefined();
    expect(parseRequestedLevel('6', levels)).toBeUndefined();
    expect(parseRequestedLevel('7', levels)).toBeUndefined();
    expect(parseRequestedLevel('4.0', levels)).toBeUndefined();
    expect(parseRequestedLevel('', levels)).toBeUndefined();
  });
});
