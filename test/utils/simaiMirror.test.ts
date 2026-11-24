import { describe, expect, it } from 'vitest';
import { transformFumen, type MirrorKind } from '@/utils/simaiMirror';
import { compileChart, readMaidata } from '@/majview/simai.js';

const LANES = '1,2,3,4,5,6,7,8,';

describe('位置映射', () => {
  const expected: Record<MirrorKind, string> = {
    lr: '8,7,6,5,4,3,2,1,',
    ud: '4,3,2,1,8,7,6,5,',
    '180': '5,6,7,8,1,2,3,4,',
    cw45: '2,3,4,5,6,7,8,1,',
    ccw45: '8,1,2,3,4,5,6,7,',
  };

  for (const [kind, want] of Object.entries(expected)) {
    it(`${kind}: ${LANES} → ${want}`, () => {
      expect(transformFumen(LANES, kind as MirrorKind)).toBe(want);
    });
  }

  it('触控区字母不动，数字按同一套映射', () => {
    expect(transformFumen('A1,B2,E3,C,D4,', 'lr')).toBe('A8,B7,E6,C,D5,');
  });
});

describe('不该动的东西', () => {
  it('BPM、拍号、时长括号原样保留', () => {
    expect(transformFumen('(180){16}1h[4:1],', 'lr')).toBe('(180){16}8h[4:1],');
    expect(transformFumen('(150){4}1-5[8:1],', 'ud')).toBe('(150){4}4-8[8:1],');
  });

  it('注释整行原样保留', () => {
    expect(transformFumen('|| 1,2,3,4 是说明\n1,2,', 'lr')).toBe('|| 1,2,3,4 是说明\n8,7,');
  });

  it('修饰符 b / x / h / $ 原样保留', () => {
    expect(transformFumen('1b,2x,3h[2:1],4$,', '180')).toBe('5b,6x,7h[2:1],8$,');
  });
});

describe('slide 方向符号', () => {
  it('镜像翻转手性', () => {
    expect(transformFumen('1>5,', 'lr')).toBe('8<4,');
    expect(transformFumen('1<5,', 'lr')).toBe('8>4,');
    expect(transformFumen('1p5,1q5,', 'ud')).toBe('4q8,4p8,');
    expect(transformFumen('1pp5,1qq5,', 'ud')).toBe('4qq8,4pp8,');
    expect(transformFumen('1s5,1z5,', '180')).toBe('5z1,5s1,');
  });

  it('旋转保持手性', () => {
    expect(transformFumen('1>5,', 'cw45')).toBe('2>6,');
    expect(transformFumen('1p5,', 'ccw45')).toBe('8p4,');
  });

  it('^ 与 V 的 via 也跟着位置走', () => {
    expect(transformFumen('1^5,', 'lr')).toBe('8^4,');
    // LR：1→8、3→6、5→4，via 也走同一套
    expect(transformFumen('1V35,', 'lr')).toBe('8V64,');
  });
});

describe('自洽性', () => {
  const sample = '(180){16}1,2-5[4:1],3h[2:1],A4,B5<C,6pp8,,,';
  const mirrors: MirrorKind[] = ['lr', 'ud', '180'];

  it('镜像两次回到原样', () => {
    for (const kind of mirrors) {
      expect(transformFumen(transformFumen(sample, kind), kind)).toBe(sample);
    }
  });

  it('任意两种镜像的组合仍与顺序无关（三种都是对合置换）', () => {
    expect(transformFumen(transformFumen(sample, 'lr'), 'ud'))
      .toBe(transformFumen(transformFumen(sample, 'ud'), 'lr'));
  });

  it('同向旋转八次回到原样', () => {
    for (const kind of ['cw45', 'ccw45'] as MirrorKind[]) {
      let text = sample;
      for (let i = 0; i < 8; i++) text = transformFumen(text, kind);
      expect(text).toBe(sample);
    }
  });

  it('+45 与 −45 互为逆操作', () => {
    expect(transformFumen(transformFumen(sample, 'cw45'), 'ccw45')).toBe(sample);
  });
});

describe('变换后的文本仍然能解析', () => {
  const sample = '(180){16}1,2-5[4:1],3h[2:1],A4,B5,C,6pp8,,,1>4,2<7,';
  const kinds: MirrorKind[] = ['lr', 'ud', '180', 'cw45', 'ccw45'];

  for (const kind of kinds) {
    it(`${kind} 变换后 compileChart 不抛异常`, () => {
      const text = transformFumen(sample, kind);
      const chart = compileChart(readMaidata(`&inote_1=${text}`), 0);
      expect(chart.notes.length).toBeGreaterThan(0);
    });
  }
});
