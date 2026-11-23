import { describe, expect, it } from 'vitest';
import { chartStart, displayIndex, holdSpan, soundEvents } from '@/majview/timeline.js';

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

  it('ends every long hold with a plain tap judge, even EX and break holds (HoldDrop.End)', () => {
    const judgesAt = (hold: Partial<Note>) =>
      soundEvents({ notes: [{ kind: 'hold', time: 1, end: 2, ...hold }] })
        .filter((e) => e.time === 2 && e.name.startsWith('judge'))
        .map((e) => e.name);
    expect(judgesAt({})).toEqual(['judge']);
    expect(judgesAt({ ex: true })).toEqual(['judge']);
    expect(judgesAt({ brk: true })).toEqual(['judge']);
  });

  it('merging notes a few ms apart keeps one-shot sounds full length', () => {
    const merged = soundEvents({ notes: [tap(80.7273), tap(80.7386)] }).filter((e) => e.name === 'judge' || e.name === 'answer');
    expect(merged.map((e) => [e.name, e.time, e.length])).toEqual([['answer', 80.7273, 0], ['judge', 80.7273, 0]]);
  });

  it('requests each sound at most once per frame', () => {
    const judges = soundEvents({ notes: [tap(1), tap(1.005), tap(1.5)] }).filter((e) => e.name === 'judge');
    expect(judges.map((e) => e.time)).toEqual([1, 1.5]);
  });
});

describe('MajView display windows', () => {
  const settings = { NoteSpeed: 75, TouchSpeed: 75 };

  it('keeps a note with a negative HS in the display window', () => {
    // <HS*-0.5> scrolls backwards: the note comes from outside the ring, so it has to be
    // visible before its time instead of dropping out of the timeline (the chart used to
    // go blank from the first reverse section).
    const [entry] = displayIndex([{ kind: 'tap', time: 10, end: 10, lane: 1, speed: -0.5 }], settings);
    expect(entry.from).toBeLessThan(10);
    expect(entry.to).toBeGreaterThanOrEqual(10);
  });

  it('keeps a reverse touch and hold in the display window', () => {
    const entries = displayIndex(
      [
        { kind: 'touch', time: 10, end: 10, lane: 1, speed: -0.5 },
        { kind: 'hold', time: 10, end: 11, lane: 2, speed: -1 },
      ],
      settings,
    );
    for (const entry of entries) {
      expect(entry.from).toBeLessThan(10);
      expect(entry.to).toBeGreaterThan(10);
    }
  });
});

describe('hold body (aligned with MajdataPlay HoldDrop)', () => {
  const hold = { kind: 'hold', time: 10, end: 11, lane: 1 };
  // 1000px per second keeps the numbers exact: 1s before the head it is 1000px away.
  const speed = 10;

  it('pins the tail at the inner radius and hides the end point until it appears', () => {
    expect(holdSpan(9.5, hold, speed)).toEqual({ head: 122.5, tail: 122.5, endVisible: false });
  });

  it('stops the head at the judgment ring once it has passed', () => {
    expect(holdSpan(10.5, hold, speed)).toEqual({ head: 480, tail: 122.5, endVisible: false });
  });

  it('shows the end point once the tail has left the inner radius', () => {
    const span = holdSpan(10.7, hold, speed);
    expect(span.head).toBe(480);
    expect(span.tail).toBeCloseTo(180, 6);
    expect(span.endVisible).toBe(true);
  });

  it('clamps a reverse hold like the game does', () => {
    const span = holdSpan(10.5, hold, -speed);
    expect(span.head).toBe(122.5);
    expect(span.tail).toBe(980);
    expect(span.endVisible).toBe(true);
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


