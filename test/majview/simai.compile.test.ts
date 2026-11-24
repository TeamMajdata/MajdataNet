import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { compileChart } from '@/majview/simai.js';

// compileChart adapts the MajSimai model to the note model the MajView renderer draws with:
// the same chart has to reach the renderer with the same kinds, times, flags and slide paths.

type RenderedNote = {
  kind: string;
  lane: number;
  area?: string;
  time: number;
  end: number;
  travel?: number;
  speed: number;
  mine: boolean;
  brk: boolean;
  ex: boolean;
  firework: boolean;
  star: boolean;
  rotate: boolean;
  each: boolean;
  double?: boolean;
  spinPeriod?: number;
  link?: { lane: number; length: number };
  segments?: { start: number; end: number; mark: string; to: number; shape: { bars: unknown[] } }[];
};

const compile = (text: string, first?: string) =>
  compileChart({ inote_1: text, ...(first === undefined ? {} : { first_1: first }) }, 0) as {
    notes: RenderedNote[];
    warnings: { token: string; message: string }[];
    firstBpm: number;
    last: number;
    commaTimings: { time: number; bpm: number; sigNum: number; sigDen: number }[];
  };

const at = (notes: RenderedNote[], kind: string) => notes.filter((n) => n.kind === kind);

describe('compileChart (MajSimai model to the renderer model)', () => {
  it('places taps, holds, touches and slides on their timing points', () => {
    const chart = compile('(120){4}1,2h[4:1],B1,1-3[8:1],');
    expect(chart.notes.map((n) => [n.kind, n.lane, n.time, n.end])).toEqual([
      ['tap', 1, 0, 0],
      ['hold', 2, 0.5, 1],
      ['touch', 1, 1, 1],
      ['star', 1, 1.5, 1.5],
      // A slide starts one beat after its star head and lasts [8:1] = a quarter of a beat.
      ['slide', 1, 1.5, 2.25],
    ]);
    expect(at(chart.notes, 'touch')[0].area).toBe('B');
    expect(at(chart.notes, 'slide')[0].travel).toBe(2);
    expect(chart.firstBpm).toBe(120);
  });

  it('gives a star head its slide as the spin period', () => {
    const [star] = at(compile('(120){4}1-3[8:1],').notes, 'star');
    expect(star.spinPeriod).toBe(0.25);
    const [tapHead] = at(compile('(120){4}1@-3[8:1],').notes, 'tap');
    expect(tapHead.kind).toBe('tap');
    expect(tapHead.spinPeriod).toBeUndefined();
  });

  it('draws a forced star tap as a star without spinning it', () => {
    const chart = compile('(120){4}4$,1$$,');
    expect(chart.notes.map((n) => n.kind)).toEqual(['tap', 'tap']);
    expect(chart.notes[0]).toMatchObject({ star: true, rotate: false });
    expect(chart.notes[0].spinPeriod).toBeUndefined();
    expect(chart.notes[1]).toMatchObject({ star: true, rotate: true });
  });

  it('draws a slide without a head as a single slide note', () => {
    const chart = compile('(120){4}1?-3[8:1],1!-5[8:1],');
    expect(chart.notes.map((n) => n.kind)).toEqual(['slide', 'slide']);
    expect(chart.notes[0].lane).toBe(1);
    expect(chart.notes[1].lane).toBe(1);
  });

  it('splits a connected slide into segments that cover its length', () => {
    const [slide] = at(compile('(120){4}1-3[8:1]-5[4:1],').notes, 'slide');
    expect(slide.segments).toHaveLength(2);
    expect(slide.segments?.map((s) => s.mark)).toEqual(['-', '-']);
    // The renderer compares segment times with the chart clock, so they are absolute times.
    expect(slide.segments?.[0].start).toBe(slide.travel);
    expect(slide.segments?.at(-1)?.end).toBe(slide.end);
    const covered = slide.segments?.reduce((sum, s) => sum + (s.end - s.start), 0) ?? 0;
    // 1-3 lasts [8:1] = 0.25s and 1-3-5 adds [4:1] = 0.5s.
    expect(covered).toBeCloseTo(slide.end - (slide.travel ?? 0), 10);
    expect(slide.end - (slide.travel ?? 0)).toBeCloseTo(0.75, 10);
  });

  it('shifts slide segments with the &first offset like the rest of the chart', () => {
    const [slide] = at(compile('(120){4}1-3[8:1],', '2.5').notes, 'slide');
    expect(slide.travel).toBe(3);
    expect(slide.segments?.[0].start).toBe(3);
    expect(slide.segments?.[0].end).toBe(3.25);
  });

  it('spreads a chain length written on the last segment over the whole chain', () => {
    const [slide] = at(compile('(120){4}1-3-5[4:1],').notes, 'slide');
    // [4:1] at 120 BPM is 0.5s for the whole path: the two equal segments take 0.25s each.
    expect(slide.end - (slide.travel ?? 0)).toBeCloseTo(0.5, 10);
    expect(slide.segments?.map((s) => Number((s.end - s.start).toFixed(6)))).toEqual([0.25, 0.25]);
    expect(slide.segments?.[0].start).toBe(0.5);
    expect(slide.segments?.[1].end).toBe(slide.end);
  });

  it('weights unequal segments by their number of bars', () => {
    const [slide] = at(compile('(120){4}1-5-7[4:1],').notes, 'slide');
    const [a, b] = slide.segments ?? [];
    const weight = (segment: { shape: { bars: unknown[] } }) => segment.shape.bars.length + 1;
    expect((a.end - a.start) / (b.end - b.start)).toBeCloseTo(weight(a) / weight(b), 10);
    expect(a.end).toBeCloseTo(b.start, 10);
  });

  it('keeps every slide of the fixture charts in the chart clock', () => {
    // The renderer compares segment times with the playback time directly, so a segment that
    // starts at 0 instead of at travel would never be drawn.
    const charts: string[] = JSON.parse(
      readFileSync(join(process.cwd(), 'test/fixtures/simai/charts.json'), 'utf8'),
    );
    const problems: string[] = [];
    for (const text of charts) {
      let chart;
      try {
        chart = compile(text);
      } catch {
        continue;
      }
      for (const note of chart.notes) {
        if (note.kind !== 'slide' || !note.segments?.length) continue;
        const first = note.segments[0].start;
        const last = note.segments.at(-1)!.end;
        if (Math.abs(first - (note.travel ?? 0)) > 1e-9) problems.push(`${text}: starts at ${first}`);
        if (Math.abs(last - note.end) > 1e-9) problems.push(`${text}: ends at ${last}`);
        const covered = note.segments.reduce((sum, s) => sum + (s.end - s.start), 0);
        if (Math.abs(covered - (note.end - (note.travel ?? 0))) > 1e-9) {
          problems.push(`${text}: covers ${covered}`);
        }
        note.segments.forEach((segment, i) => {
          if (i > 0 && Math.abs(segment.start - note.segments![i - 1].end) > 1e-9) {
            problems.push(`${text}: segment ${i} starts at ${segment.start}`);
          }
        });
      }
    }
    expect(problems).toEqual([]);
  });

  it('marks a slide each only by its non-mine slides (IsEachNote)', () => {
    const both = compile('(120){4}1-3[8:1]/2-4[8:1],');
    expect(at(both.notes, 'slide').map((n) => n.each)).toEqual([true, true]);

    const withMine = compile('(120){4}1-3[8:1]/2-4[8:1]m,');
    expect(at(withMine.notes, 'slide').map((n) => n.each)).toEqual([false, false]);
  });

  it('never marks a mine note as an each', () => {
    const chart = compile('(120){4}1m/2,');
    expect(chart.notes.map((n) => [n.mine, n.each])).toEqual([
      [true, false],
      [false, false],
    ]);
  });

  it('keeps each, break, mine, EX, force star and fake rotate', () => {
    const chart = compile('(120){4}1/2,3b,4m,5x,6$,7$$,');
    const [left, right] = chart.notes;
    expect(left.each).toBe(true);
    expect(right.each).toBe(true);
    expect(left.link).toEqual({ lane: 1, length: 1 });
    expect(chart.notes.slice(2).map((n) => [n.brk, n.mine, n.ex, n.star, n.rotate])).toEqual([
      [true, false, false, false, false],
      [false, true, false, false, false],
      [false, false, true, false, false],
      [false, false, false, true, false],
      [false, false, false, true, true],
    ]);
  });

  it('gives a break slide its own break flag, not the head one', () => {
    const headBreak = compile('(120){4}1b-3[8:1],');
    expect(at(headBreak.notes, 'star')[0].brk).toBe(true);
    expect(at(headBreak.notes, 'slide')[0].brk).toBe(false);
    const pathBreak = compile('(120){4}1-3b[8:1],');
    expect(at(pathBreak.notes, 'star')[0].brk).toBe(false);
    expect(at(pathBreak.notes, 'slide')[0].brk).toBe(true);
  });

  it('carries hanabi touch holds and the C sensor', () => {
    const chart = compile('(120){4}B1hf[4:1],C1,');
    expect(chart.notes.map((n) => [n.kind, n.area, n.lane])).toEqual([
      ['touchHold', 'B', 1],
      ['touch', 'C', 8],
    ]);
    expect(chart.notes[0].firework).toBe(true);
    expect(chart.notes[0].end).toBe(0.5);
  });

  it('applies the &first offset and stops at the E marker', () => {
    const chart = compile('(120){4}1,2,E,3,', '2.5');
    expect(chart.notes.map((n) => n.time)).toEqual([2.5, 3]);
  });

  it('exposes the comma timings for the seek bar, shifted like the notes', () => {
    const chart = compile('(120){4}1,2,(240)3,4,', '2');
    expect(chart.commaTimings.map((timing) => timing.bpm)).toEqual([120, 120, 240, 240, 240]);
    expect(chart.commaTimings.map((timing) => timing.time)).toEqual([2, 2.5, 3, 3.25, 3.5]);
  });

  it('carries the time signature of the chart for the beat grid', () => {
    const chart = compile('(120)||s3/4\n1,2,3,');
    expect(chart.commaTimings.every((timing) => timing.sigNum === 3 && timing.sigDen === 4)).toBe(true);
  });

  it('warns about slides the renderer cannot draw instead of failing the chart', () => {
    const chart = compile('(120){4}1s3[8:1],2,');
    expect(chart.warnings.map((w) => w.token)).toEqual(['1s3[8:1]']);
    // The head only exists for its slide, so it goes away with it.
    expect(chart.notes.map((n) => n.kind)).toEqual(['tap']);
  });

  it('keeps a star head when one of its slides is still drawable', () => {
    const chart = compile('(120){4}1s3[8:1]*1-5[8:1],');
    expect(chart.notes.map((n) => n.kind)).toEqual(['star', 'slide']);
    expect(chart.notes[1].segments).toHaveLength(1);
    expect(chart.warnings).toHaveLength(1);
  });

  it('skips Slide Code paths with a warning', () => {
    const chart = compile('(120){4}1A357K1[2:1],2,');
    expect(chart.warnings.map((w) => w.message)).toEqual(['Slide Code is not supported']);
    expect(chart.notes.map((n) => n.kind)).toEqual(['tap']);
  });

  it('rejects a difficulty without a chart or notes', () => {
    expect(() => compileChart({}, 0)).toThrow('This difficulty has no chart.');
    expect(() => compile('(120){4},,,')).toThrow('This difficulty is empty.');
  });
});
