import { describe, expect, it } from 'vitest';
import remarkChartMarks from '@/utils/remarkChartMarks';
import { chartMarkInRange, parseChartMarkHref, type ChartMarkTarget } from '@/components/song/chartMarks';

type Node = { type: string; value?: string; url?: string; children?: Node[] };

function marks(text: string) {
  const tree: Node = { type: 'root', children: [{ type: 'paragraph', children: [{ type: 'text', value: text }] }] };
  remarkChartMarks()(tree);
  return tree.children![0].children!
    .filter((n) => n.type === 'link')
    .map((n) => [n.children![0].value, parseChartMarkHref(n.url!)]);
}

describe('chart marks in comments', () => {
  it('recognizes m:ss and mm:ss times', () => {
    expect(marks('0:25 和 1:25 还有01:25')).toEqual([
      ['0:25', { kind: 'time', value: 25 }],
      ['1:25', { kind: 'time', value: 85 }],
      ['01:25', { kind: 'time', value: 85 }],
    ]);
  });

  it('ignores invalid seconds and clock-like triples', () => {
    expect(marks('1:75 12:30:45 1:5')).toEqual([]);
  });

  it('recognizes combo counts written as cb or combo', () => {
    expect(marks('200cb 这里，300 Combo 那里，400COMBO')).toEqual([
      ['200cb', { kind: 'combo', value: 200 }],
      ['300 Combo', { kind: 'combo', value: 300 }],
      ['400COMBO', { kind: 'combo', value: 400 }],
    ]);
    expect(marks('a200cb 200cbx')).toEqual([]);
  });

  it('leaves existing links alone', () => {
    const tree: Node = { type: 'root', children: [{ type: 'link', url: 'https://x', children: [{ type: 'text', value: '1:25' }] }] };
    remarkChartMarks()(tree);
    expect(tree.children![0].children).toEqual([{ type: 'text', value: '1:25' }]);
  });

  it('only accepts marks inside the current chart', () => {
    const target: ChartMarkTarget = { length: 120, maxCombo: 500, jump: () => {} };
    expect(chartMarkInRange(target, { kind: 'time', value: 120 })).toBe(true);
    expect(chartMarkInRange(target, { kind: 'time', value: 121 })).toBe(false);
    expect(chartMarkInRange(target, { kind: 'combo', value: 500 })).toBe(true);
    expect(chartMarkInRange(target, { kind: 'combo', value: 501 })).toBe(false);
    expect(chartMarkInRange(target, { kind: 'combo', value: 0 })).toBe(false);
    expect(chartMarkInRange(null, { kind: 'time', value: 1 })).toBe(false);
  });
});
