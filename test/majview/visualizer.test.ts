import { describe, expect, it } from 'vitest';
import { beatWindow, bpmChanges, buildWaveform, noteColor, noteRange, VISUALIZER_COLORS } from '@/majview/visualizer.js';

// 时间轴的纯计算部分：波形包络、BPM 变化、窗口里的拍线、窗口里的音符范围。
// 画布本身在 jsdom 里没有实现；绘制在 visualizer.js 里按这些结果逐帧画。

const audio = (samples: number[], duration = 1) =>
  ({ length: samples.length, duration, getChannelData: () => Float32Array.from(samples) }) as unknown as AudioBuffer;

const timing = (time: number, bpm: number, sigNum = 4, sigDen = 4) => ({ time, bpm, sigNum, sigDen });

describe('seek bar waveform', () => {
  it('keeps the lowest and the highest sample of every bucket', () => {
    // float32 里能精确表示的值，免得断言被 float64 和 float32 的舍入差绊住
    const wave = buildWaveform(audio([0.125, -0.5, 0.25, 0, 0.75, -0.125, 0, 0]), 2);
    expect(Array.from(wave ?? [])).toEqual([-0.5, 0.25, -0.125, 0.75]);
  });

  it('never asks for more buckets than there are samples', () => {
    const wave = buildWaveform(audio([0.5, -0.5]), 2048);
    expect(wave).toHaveLength(4);
  });

  it('gives up on a buffer without samples or length', () => {
    expect(buildWaveform(null)).toBeNull();
    expect(buildWaveform(audio([], 0))).toBeNull();
  });
});

describe('seek bar BPM changes', () => {
  it('keeps one entry per new BPM and shifts it by the offset', () => {
    const changes = bpmChanges(
      [timing(0, 120), timing(1, 120), timing(2, 180, 3, 4)],
      0.5,
    );
    expect(changes).toEqual([
      { time: 0.5, bpm: 120, numerator: 4, denominator: 4 },
      { time: 2.5, bpm: 180, numerator: 3, denominator: 4 },
    ]);
  });

  it('ignores the timings before the first BPM and defaults the signature', () => {
    const changes = bpmChanges([timing(0, 0), { time: 1, bpm: 150 }], 0);
    expect(changes).toEqual([{ time: 1, bpm: 150, numerator: 4, denominator: 4 }]);
    expect(bpmChanges(undefined, 0)).toEqual([]);
  });
});

describe('seek bar beat grid', () => {
  it('puts a strong line on the first beat of every 4/4 bar', () => {
    const { strong, weak } = beatWindow(bpmChanges([timing(0, 120)], 0), 0, 4);
    expect(strong).toEqual([0, 2]);
    expect(weak).toEqual([0.5, 1, 1.5, 2.5, 3, 3.5]);
  });

  it('keeps the bar phase when the window starts in the middle of a bar', () => {
    // 窗口从 3 秒开始：强拍仍然是绝对的 4 秒和 6 秒，不会因为窗口左端变成强拍
    const { strong, weak } = beatWindow(bpmChanges([timing(0, 120)], 0), 3, 7);
    expect(strong).toEqual([4, 6]);
    expect(weak).toEqual([3, 3.5, 4.5, 5, 5.5, 6.5]);
  });

  it('counts the beats of a bar from the signature', () => {
    expect(beatWindow(bpmChanges([timing(0, 120, 3, 4)], 0), 0, 4).strong).toEqual([0, 1.5, 3]);
    // 6/8：一拍是八分音符，一小节六拍
    expect(beatWindow(bpmChanges([timing(0, 120, 6, 8)], 0), 0, 4).strong).toEqual([0, 1.5, 3]);
  });

  it('restarts the bar at every BPM change', () => {
    const { strong } = beatWindow(bpmChanges([timing(0, 120), timing(2, 240)], 0), 0, 4);
    expect(strong).toEqual([0, 2, 3]);
  });

  it('draws nothing without a BPM or a window', () => {
    expect(beatWindow([], 0, 10)).toEqual({ strong: [], weak: [] });
    expect(beatWindow(bpmChanges([timing(0, 120)], 0), 5, 5)).toEqual({ strong: [], weak: [] });
  });
});

describe('seek bar note colour', () => {
  it('draws a mine grey whatever else the note is', () => {
    expect(noteColor({ mine: true }, '#ffb6c1')).toBe(VISUALIZER_COLORS.mine);
    expect(noteColor({ mine: true, brk: true, each: true }, '#ffb6c1')).toBe(VISUALIZER_COLORS.mine);
  });

  it('keeps break and each ahead of the plain colour', () => {
    expect(noteColor({ mine: false, brk: true }, '#00bfff')).toBe(VISUALIZER_COLORS.break);
    expect(noteColor({ mine: false, each: true }, '#00bfff')).toBe(VISUALIZER_COLORS.each);
    expect(noteColor({ mine: false }, '#00bfff')).toBe('#00bfff');
  });
});

describe('seek bar note window', () => {
  const notes = [
    { time: 0, end: 0 },
    { time: 2, end: 5 },
    { time: 4, end: 4 },
    { time: 8, end: 8 },
  ];

  it('finds the notes whose body overlaps the window', () => {
    expect(noteRange(notes, 4.5, 6, 3)).toEqual({ start: 1, end: 3 });
  });

  it('walks back far enough for a long note that started before the window', () => {
    const long = [{ time: 0, end: 10 }, { time: 5, end: 5 }];
    expect(noteRange(long, 8, 9, 10)).toEqual({ start: 0, end: 2 });
  });

  it('returns an empty range when nothing is near', () => {
    expect(noteRange(notes, 100, 110, 3)).toEqual({ start: 4, end: 4 });
    expect(noteRange([], 0, 10)).toEqual({ start: 0, end: 0 });
  });
});
