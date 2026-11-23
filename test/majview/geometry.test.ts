import { describe, expect, it } from 'vitest';
import paths from '@/majview/generated/paths.json';
import { lanePoint, slideShape } from '@/majview/geometry.js';

// paths.json is generated from the MajdataPlay slide prefabs by scripts/gen-majview-paths.mjs,
// so these tests guard the shape the renderer gets from it.

type Bar = [number, number, number, number, number];

describe('slide geometry (generated from the MajdataPlay prefabs)', () => {
  it('has bars and a Just arrow for every shape', () => {
    for (const [name, shape] of Object.entries(paths) as [string, { bars: Bar[]; just: number[] }][]) {
      expect(shape.bars.length, name).toBeGreaterThan(0);
      expect(shape.just, name).toHaveLength(3);
      for (const bar of shape.bars) {
        expect(bar, name).toHaveLength(5);
        for (const value of bar) expect(Number.isFinite(value), `${name}: ${bar}`).toBe(true);
      }
      for (const value of shape.just) expect(Number.isFinite(value), name).toBe(true);
    }
  });

  it('resolves every slide mark the parser can produce', () => {
    const slides: [number, string, number, number | undefined][] = [
      [1, '-', 3, undefined],
      [1, '-', 5, undefined],
      [1, 'v', 3, undefined],
      [1, 'v', 4, undefined],
      [1, 'p', 3, undefined],
      [1, 'q', 3, undefined],
      [1, 'pp', 3, undefined],
      [1, 'qq', 3, undefined],
      [1, '<', 5, undefined],
      [3, '>', 7, undefined],
      [1, '^', 3, undefined],
      [1, 'V', 5, 3],
      [1, 'V', 5, 7],
      [1, 's', 5, undefined],
      [3, 'z', 7, undefined],
      [1, 'w', 5, undefined],
    ];
    for (const [start, mark, end, via] of slides) {
      const shape = slideShape(start, mark, end, via);
      expect(shape.bars.length, `${start}${mark}${via ?? ''}${end}`).toBeGreaterThan(1);
      for (const bar of shape.bars) {
        expect(Number.isFinite(bar.x) && Number.isFinite(bar.y) && Number.isFinite(bar.angle)).toBe(true);
      }
      const endPoint = lanePoint(end);
      expect(shape.end.x).toBeCloseTo(endPoint.x, 6);
      expect(shape.end.y).toBeCloseTo(endPoint.y, 6);
    }
  });

  it('keeps the wifi shape special', () => {
    const shape = slideShape(1, 'w', 5);
    expect(shape.wifi).toBe(true);
    expect(shape.ends).toHaveLength(3);
    for (const point of shape.ends) expect(Number.isFinite(point.x) && Number.isFinite(point.y)).toBe(true);
  });

  it('caches a shape by start, mark, end and via', () => {
    expect(slideShape(1, '-', 3)).toBe(slideShape(1, '-', 3));
    expect(slideShape(1, '-', 3)).not.toBe(slideShape(1, '-', 5));
  });
});
