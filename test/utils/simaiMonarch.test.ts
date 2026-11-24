import { describe, expect, it } from 'vitest';
import { SIMAI_TOKEN_RULES } from '@/utils/simaiMonarch';

/**
 * Monaco 的 Monarch 会按顺序逐条尝试、第一个匹配即采用，并且把正则锚定在当前位置。
 * 这里用同样的规则跑一遍，验证 token 规则本身和优先级（不需要启动编辑器）。
 */
function tokenize(line: string): string[] {
  const out: string[] = [];
  let pos = 0;
  while (pos < line.length) {
    let matched = false;
    for (const [regex, token] of SIMAI_TOKEN_RULES) {
      const match = new RegExp(`^(?:${regex.source})`).exec(line.slice(pos));
      if (match?.[0]) {
        out.push(`${token}:${match[0]}`);
        pos += match[0].length;
        matched = true;
        break;
      }
    }
    if (!matched) {
      out.push(`plain:${line[pos]}`);
      pos += 1;
    }
  }
  return out;
}

describe('simai Monarch rules', () => {
  it('prefers slide over tap', () => {
    expect(tokenize('1-2[4:1]')).toEqual(['slide:1-2', 'period:[4:1]']);
    expect(tokenize('-5[8:1]')).toEqual(['slide:-5', 'period:[8:1]']);
  });

  it('handles hold and touch before tap', () => {
    expect(tokenize('6h[4:1]')).toEqual(['hold:6h', 'period:[4:1]']);
    expect(tokenize('A1h[4:1]')).toEqual(['touch:A1h', 'period:[4:1]']);
    expect(tokenize('Ch[4:3]')).toEqual(['touch:Ch', 'period:[4:3]']);
    expect(tokenize('B2/E3')).toEqual(['touch:B2', 'each:/', 'touch:E3']);
  });

  it('tells break notes apart from taps', () => {
    expect(tokenize('1b')).toEqual(['break:1b']);
    expect(tokenize('8bx')).toEqual(['break:8bx']);
    expect(tokenize('1x')).toEqual(['tap:1x']);
  });

  it('tells the end marker from an E touch note', () => {
    expect(tokenize('E')).toEqual(['end:E']);
    expect(tokenize('E7')).toEqual(['touch:E7']);
  });

  it('supports two-finger taps and star modifiers', () => {
    expect(tokenize('12,1$$')).toEqual(['tap:12', 'delimiter:,', 'tap:1$$']);
    expect(tokenize('1-2[4:1]m')).toEqual(['slide:1-2', 'period:[4:1]', 'modifier:m']);
  });

  it('handles slide chains, branches and multi-segment paths', () => {
    expect(tokenize('4-6[8:1]*-5[8:1]')).toEqual([
      'slide:4-6', 'period:[8:1]', 'delimiter:*', 'slide:-5', 'period:[8:1]',
    ]);
    expect(tokenize('7<6-4[8:1]')).toEqual(['slide:7<6-4', 'period:[8:1]']);
    expect(tokenize('4qq1[4:3]')).toEqual(['slide:4qq1', 'period:[4:3]']);
    expect(tokenize('1V35[4:1]')).toEqual(['slide:1V35', 'period:[4:1]']);
  });

  it('handles bpm, measure, speed and comments', () => {
    expect(tokenize('(160){4}')).toEqual(['bpm:(160)', 'measure:{4}']);
    expect(tokenize('HS*1.5>')).toEqual(['speed:HS*1.5>']);
    expect(tokenize('<HS*2>')).toEqual(['speed:<HS*2>']);
    expect(tokenize('|| note 1,2')).toEqual(['comment:|| note 1,2']);
  });
});
