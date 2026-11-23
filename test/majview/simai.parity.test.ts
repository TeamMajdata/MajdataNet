import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseChart } from '@/majview/simai.js';

// The fixtures are recorded from MajSimai 3.0.1 (see test/fixtures/simai/README.md). parseChart
// has to produce the same timing points, the same notes, the same flags and the same related
// notes as SimaiParser.ParseChart, down to the float rounding of BPM, HS and SV.

type GoldenNote = {
  type: string;
  start: number;
  area: string;
  hold: number;
  slideStart: number;
  slideTime: number;
  raw: string;
  break: boolean;
  ex: boolean;
  mine: boolean;
  star: boolean;
  starDouble: boolean;
  each: boolean;
  hanabi: boolean;
  forceStar: boolean;
  fakeRotate: boolean;
  tapHeadSlide: boolean;
  usingSV: boolean;
  related: number[];
};

type GoldenTiming = {
  time: number;
  bpm: number;
  hs: number;
  sv: number;
  raw: string;
  notes: GoldenNote[];
};

type Golden = { ok: true; timings: GoldenTiming[] } | { ok: false; error: string };

const fixtures = join(process.cwd(), 'test/fixtures/simai');
const charts: string[] = JSON.parse(readFileSync(join(fixtures, 'charts.json'), 'utf8'));
const golden: Golden[] = JSON.parse(readFileSync(join(fixtures, 'golden.json'), 'utf8'));

const normalize = (text: string): Golden => {
  let parsed;
  try {
    parsed = parseChart(text);
  } catch (error) {
    return { ok: false, error: (error as Error).name };
  }
  return {
    ok: true,
    timings: parsed.noteTimings.map((tp) => ({
      time: tp.time,
      bpm: tp.bpm,
      hs: tp.hs,
      sv: tp.sv,
      raw: tp.raw,
      notes: tp.notes.map((n) => ({
        type: n.type,
        start: n.start,
        area: n.area,
        hold: n.hold,
        slideStart: n.slideStart,
        slideTime: n.slideTime,
        raw: n.raw,
        break: n.isBreak,
        ex: n.isEx,
        mine: n.isMine,
        star: n.isStar,
        starDouble: n.isStarDouble,
        each: n.isEach,
        hanabi: n.isHanabi,
        forceStar: n.isForceStar,
        fakeRotate: n.isFakeRotate,
        tapHeadSlide: n.isTapHeadSlide,
        usingSV: n.usingSV,
        related: n.related.map((related) => tp.notes.indexOf(related)),
      })),
    })),
  };
};

// Times are doubles, but MajSimai computes them from float BPM, HS and SV, so compare numbers
// with a tolerance instead of bit equality.
const compare = (actual: unknown, expected: unknown, path: string, diffs: string[]) => {
  if (typeof actual === 'number' && typeof expected === 'number') {
    if (Math.abs(actual - expected) > 1e-9) diffs.push(`${path}: ${actual} !== ${expected}`);
    return;
  }
  if (Array.isArray(actual) && Array.isArray(expected)) {
    if (actual.length !== expected.length) {
      diffs.push(`${path}: ${actual.length} items, expected ${expected.length}`);
      return;
    }
    actual.forEach((value, index) => compare(value, expected[index], `${path}[${index}]`, diffs));
    return;
  }
  if (actual && expected && typeof actual === 'object' && typeof expected === 'object') {
    const keys = new Set([...Object.keys(actual), ...Object.keys(expected)]);
    for (const key of keys) {
      compare(
        (actual as Record<string, unknown>)[key],
        (expected as Record<string, unknown>)[key],
        `${path}.${key}`,
        diffs,
      );
    }
    return;
  }
  if (actual !== expected) diffs.push(`${path}: ${JSON.stringify(actual)} !== ${JSON.stringify(expected)}`);
};

describe('MajSimai parity', () => {
  it('has a recorded result for every chart', () => {
    expect(golden).toHaveLength(charts.length);
  });

  it('parses every fixture exactly like MajSimai 3.0.1', () => {
    const diffs: string[] = [];
    charts.forEach((text, index) => {
      const before = diffs.length;
      compare(normalize(text), golden[index], `#${index}`, diffs);
      if (diffs.length > before) diffs.splice(before, 0, `--- chart #${index}: ${JSON.stringify(text)}`);
    });
    expect(diffs).toEqual([]);
  });

  it('keeps the error cases failing the same way', () => {
    const errors = charts
      .map((text, index) => [normalize(text), golden[index]] as const)
      .filter(([, expected]) => !expected.ok)
      .map(([actual, expected]) => [actual.ok ? 'ok' : (actual as { error: string }).error, (expected as { error: string }).error]);
    expect(errors.length).toBeGreaterThan(0);
    for (const [actual, expected] of errors) expect(actual).toBe(expected);
  });
});
