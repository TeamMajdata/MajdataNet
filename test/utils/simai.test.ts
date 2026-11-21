import { describe, expect, it } from 'vitest';
import { formatDuration, parseChartBpm } from '@/utils/simai';

const chart = [
  '&title=Song',
  '&first=0',
  '&lv_4=12',
  '&inote_4=(150){4},1,2,',
  '(180){8}3,4,',
  'E',
  '&lv_7=14?',
  '&inote_7=(170){4},,,1bx>5[4:1],',
  'E',
].join('\n');

describe('parseChartBpm', () => {
  it('reads the BPM of the selected difficulty (index 6 is inote_7)', () => {
    expect(parseChartBpm(chart, 6)).toEqual({ min: 170, max: 170 });
  });

  it('returns the range when the BPM changes', () => {
    expect(parseChartBpm(chart, 3)).toEqual({ min: 150, max: 180 });
  });

  it('falls back to every difficulty when the selected one is missing', () => {
    expect(parseChartBpm(chart, 0)).toEqual({ min: 150, max: 180 });
  });

  it('prefers &wholebpm', () => {
    expect(parseChartBpm('&wholebpm=200\n' + chart, 6)).toEqual({ min: 200, max: 200 });
  });

  it('returns undefined without BPM marks', () => {
    expect(parseChartBpm('&title=x\n&inote_1=1,2,\nE', 0)).toBeUndefined();
  });
});

describe('formatDuration', () => {
  it('formats as m:ss', () => {
    expect(formatDuration(125.4)).toBe('2:05');
    expect(formatDuration(59.6)).toBe('1:00');
  });
});
