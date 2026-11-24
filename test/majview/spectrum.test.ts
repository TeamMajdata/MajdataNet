import { describe, expect, it } from 'vitest';
import {
  analyzeBands,
  auroraColor,
  downsample,
  makeFft,
  percentileRange,
} from '@/majview/spectrum.js';

// 波形染色用的 Aurora 三段分频：先确认 FFT / 分频 / 取色本身是对的。

const sine = (frequency: number, rate: number, length: number) => {
  const samples = new Float32Array(length);
  for (let i = 0; i < length; i++) samples[i] = Math.sin((2 * Math.PI * frequency * i) / rate);
  return samples;
};

const rate = 12000;

describe('FFT', () => {
  it('refuses a size that is not a power of two', () => {
    expect(() => makeFft(300)).toThrow('power of two');
  });

  it('puts a 1000Hz sine in the right bin', () => {
    const size = 256;
    const transform = makeFft(size);
    const real = sine(1000, 8000, size);
    const imag = new Float32Array(size);
    transform(real, imag);
    let best = 1;
    let bestMagnitude = 0;
    for (let bin = 1; bin < size / 2; bin++) {
      const magnitude = Math.hypot(real[bin], imag[bin]);
      if (magnitude > bestMagnitude) {
        bestMagnitude = magnitude;
        best = bin;
      }
    }
    // 8000/256 = 31.25Hz 一格，1000Hz 落在 32 号
    expect(best).toBe(32);
  });
});

describe('downsample', () => {
  it('averages groups of samples', () => {
    expect(Array.from(downsample(Float32Array.from([1, 3, 5, 7]), 2))).toEqual([2, 6]);
  });

  it('leaves the signal alone when the factor is 1', () => {
    const samples = Float32Array.from([0.5, -0.5]);
    expect(downsample(samples, 1)).toBe(samples);
  });
});

describe('Aurora colour', () => {
  it('saturates the strongest channel to 255', () => {
    expect(auroraColor(1, 0, 0)).toEqual([255, 0, 0]);
    expect(auroraColor(0, 0, 1)).toEqual([0, 0, 255]);
    // 三段相等、权重都是 1 时：低频 -3dB、高频 +4.5dB，蓝色最高、绿色高于红色
    const equal = auroraColor(1, 1, 1, { weights: [1, 1, 1] });
    expect(equal[2]).toBe(255);
    expect(equal[1]).toBeGreaterThan(equal[0]);
  });

  it('returns black for silence', () => {
    expect(auroraColor(0, 0, 0)).toEqual([0, 0, 0]);
  });
});

describe('analyzeBands', () => {
  it('splits a low, a mid and a high sine into the right band', () => {
    const low = analyzeBands(sine(100, rate, rate), rate);
    const mid = analyzeBands(sine(1000, rate, rate), rate);
    const high = analyzeBands(sine(4000, rate, rate), rate);
    const frame = 10;
    const colorOf = (analysis: ReturnType<typeof analyzeBands>) => [
      analysis.color[frame * 3],
      analysis.color[frame * 3 + 1],
      analysis.color[frame * 3 + 2],
    ];
    const lowColor = colorOf(low);
    const midColor = colorOf(mid);
    const highColor = colorOf(high);
    expect(lowColor[0]).toBeGreaterThan(200);
    expect(midColor[1]).toBeGreaterThan(200);
    expect(highColor[2]).toBeGreaterThan(200);
  });

  it('reports the hop and a usable energy reference', () => {
    const analysis = analyzeBands(sine(440, rate, rate), rate, { hop: 256 });
    expect(analysis.frames).toBeGreaterThan(10);
    expect(analysis.hopSeconds).toBeCloseTo(256 / rate, 10);
    expect(analysis.energy[10]).toBeGreaterThan(0);
    expect(analysis.reference).toBeGreaterThan(0);
  });

  it('survives audio shorter than one window', () => {
    const analysis = analyzeBands(sine(440, rate, 100), rate);
    expect(analysis.frames).toBe(0);
    expect(analysis.color).toHaveLength(0);
    expect(analysis.reference).toBe(1);
  });
});

describe('percentileRange', () => {
  it('takes the tails off', () => {
    const values = Float32Array.from({ length: 100 }, (_, i) => i + 1);
    const { low, high } = percentileRange(values, 0.05, 0.95);
    expect(Math.round(low)).toBe(6);
    expect(Math.round(high)).toBe(95);
  });

  it('handles an empty list', () => {
    expect(percentileRange(Float32Array.from([]))).toEqual({ low: 0, high: 0 });
  });
});
