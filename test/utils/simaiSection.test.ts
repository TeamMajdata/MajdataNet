import { describe, expect, it } from 'vitest';
import { extractDifficulty } from '@/utils/simaiSection';

const file = [
  '&title=Song',
  '&inote_1=(120){4},1,2,',
  'E',
  '&inote_5=(160){4},1-2[4:1],',
  'B2,6h[4:1],',
  'E',
  '&lv_5=14',
].join('\r\n');

describe('extractDifficulty', () => {
  it('returns the selected difficulty and stops at the next field', () => {
    expect(extractDifficulty(file, 0)).toBe('(120){4},1,2,\nE');
    expect(extractDifficulty(file, 4)).toBe('(160){4},1-2[4:1],\nB2,6h[4:1],\nE');
  });

  it('returns an empty string when the difficulty is missing', () => {
    expect(extractDifficulty(file, 6)).toBe('');
    expect(extractDifficulty(file, 9)).toBe('');
  });

  it('does not confuse inote_1 with inote_10', () => {
    expect(extractDifficulty('&inote_10=1,\n&inote_1=2,', 9)).toBe('1,');
    expect(extractDifficulty('&inote_10=1,\n&inote_1=2,', 0)).toBe('2,');
  });

  it('strips BOM and accepts spaces around the equals sign', () => {
    expect(extractDifficulty('\uFEFF&inote_2 = 1,2,', 1)).toBe('1,2,');
  });
});
