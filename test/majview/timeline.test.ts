import { describe, expect, it } from 'vitest';
import { chartStart, soundEvents } from '@/majview/timeline.js';

type Note = { kind: string; time: number; end: number; travel?: number; mine?: boolean; brk?: boolean; ex?: boolean; firework?: boolean };
const tap = (time: number, extra: Partial<Note> = {}): Note => ({ kind: 'tap', time, end: time, ...extra });
const answers = (notes: Note[]) => soundEvents({ notes }).filter((e) => e.name === 'answer').map((e) => e.time);

describe('MajView sound events (aligned with MajdataPlay NoteAudioManager)', () => {
  it('plays one answer for notes at the same time', () => {
    expect(answers([tap(1), tap(1), tap(1)])).toEqual([1]);
  });

  it('merges answers less than one 60fps frame apart, keeping the first', () => {
    expect(answers([tap(1), tap(1.01), tap(1.02)])).toEqual([1, 1.02]);
  });

  it('adds an answer at the end of a hold, but not for holds shorter than a frame', () => {
    expect(answers([{ kind: 'hold', time: 1, end: 2 }])).toEqual([1, 2]);
    expect(answers([{ kind: 'hold', time: 1, end: 1.01 }])).toEqual([1]);
  });

  it('never answers for a slide path or a mine', () => {
    expect(answers([{ kind: 'slide', time: 1, travel: 1.25, end: 2 }, tap(3, { mine: true })])).toEqual([]);
  });

  it('touch holds start only the riser, stop it at the end and play a tap judge there (TouchHoldDrop)', () => {
    const events = soundEvents({ notes: [{ kind: 'touchHold', time: 1, end: 2.5 }] })
      .filter((e) => e.name !== 'answer')
      .map((e) => [e.name, e.time, e.length]);
    expect(events).toEqual([['touchHold_riser', 1, 1.5], ['judge', 2.5, 0]]);
  });

  it('requests each sound at most once per frame', () => {
    const judges = soundEvents({ notes: [tap(1), tap(1.005), tap(1.5)] }).filter((e) => e.name === 'judge');
    expect(judges.map((e) => e.time)).toEqual([1, 1.5]);
  });
});

describe('MajView clocks (aligned with MajdataPlay AnswerSoundSchedule)', () => {
  const clocks = (notes: Note[], firstBpm = 120) =>
    soundEvents({ notes, firstBpm }).filter((e) => e.name === 'clock').map((e) => e.time);

  it('puts four clocks before zero when a note falls within the first four beats', () => {
    expect(clocks([tap(0)])).toEqual([-2, -1.5, -1, -0.5]);
    expect(clocks([tap(0)], 60)).toEqual([-4, -3, -2, -1]);
    expect(chartStart({ notes: [tap(0)], firstBpm: 120 })).toBe(-2);
  });

  it('starts the clocks at zero when the first note comes later', () => {
    expect(clocks([tap(2)])).toEqual([0, 0.5, 1, 1.5]);
    expect(chartStart({ notes: [tap(2)], firstBpm: 120 })).toBe(0);
  });
});
