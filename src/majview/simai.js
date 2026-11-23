import { slideShape } from './geometry.js';

// A JavaScript port of MajSimai 3.0.1 (https://github.com/TeamMajdata/MajSimai), the Simai
// interpreter MajdataPlay uses. The chart model, the flags and the timings follow that
// implementation so the same chart reads the same way in the browser as in the player.
//
// parseChart() mirrors MajSimai.SimaiParser.ParseChart: it returns the timing points with
// their notes, in the shape of SimaiChart.NoteTimings / CommaTimings. compileChart() adapts
// that model to the one the MajView renderer draws with.

export function readMaidata(text) {
  const fields = {};
  const source = text.replace(/^\uFEFF/, '').replaceAll('\r', '');
  const headers = [...source.matchAll(/^&([\w-]+)[ \t]*=/gm)];
  headers.forEach((header, i) => {
    fields[header[1]] = source
      .slice(header.index + header[0].length, headers[i + 1]?.index ?? source.length)
      .trim();
  });
  return fields;
}

/* ------------------------------------------------------------------ *
 * Numbers
 * ------------------------------------------------------------------ */

// MajSimai reads numbers with the invariant culture and NumberStyles.Float: a sign, digits,
// a decimal point and an exponent, without thousands separators and without hex.
const decimalPattern = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/;

function parseDouble(text) {
  const value = text.trim();
  if (decimalPattern.test(value)) return Number(value);
  if (value === 'NaN') return NaN;
  if (value === 'Infinity' || value === '+Infinity') return Infinity;
  if (value === '-Infinity') return -Infinity;
  return NaN;
}

const integerPattern = /^[+-]?\d+$/;
function parseIntStrict(text) {
  const value = text.trim();
  return integerPattern.test(value) ? Number(value) : NaN;
}

const isDigit = (c) => c >= '0' && c <= '9';
const isButton = (c) => c >= '1' && c <= '8';
const isSpace = (c) => /\s/.test(c);

// BPM, HS and SV are float in MajSimai; rounding them the same way keeps the times identical.
const f32 = Math.fround;

/* ------------------------------------------------------------------ *
 * Durations (a port of DurationReader)
 * ------------------------------------------------------------------ */

const DurationStatus = {
  Success: 'success',
  Missing: 'missing',
  Unreadable: 'unreadable',
  ReversedBrackets: 'reversedBrackets',
  TooManySeparators: 'tooManySeparators',
  UnexpectedPart: 'unexpectedPart',
};

const isMalformedDuration = (status) =>
  status === DurationStatus.ReversedBrackets ||
  status === DurationStatus.TooManySeparators ||
  status === DurationStatus.UnexpectedPart;

// The three rules that stop a parse even in lenient mode (SyntaxRuleKind.Invalid).
function throwSimai(name, message) {
  const error = new Error(message);
  error.name = name;
  throw error;
}

const syntaxError = (message) => throwSimai('InvalidSimaiSyntaxException', message);
const markupError = (message) => throwSimai('InvalidSimaiMarkupException', message);

function readRatio(bpm, text) {
  const colons = text.split(':').length - 1;
  if (colons > 1) return { status: DurationStatus.TooManySeparators, time: 0 };
  if (colons === 0) return { status: DurationStatus.Unreadable, time: 0 };
  const colon = text.indexOf(':');
  const division = parseIntStrict(text.slice(0, colon));
  const count = parseIntStrict(text.slice(colon + 1));
  if (!Number.isFinite(division) || !Number.isFinite(count)) {
    return { status: DurationStatus.Unreadable, time: 0 };
  }
  const timeOneBeat = 1 / (bpm / 60);
  return { status: DurationStatus.Success, time: ((timeOneBeat * 4) / division) * count };
}

// 1h[8:3], 1h[#1.5], 1h[150#8:3]
function readHoldTime(bpm, text) {
  const start = text.indexOf('[');
  const end = text.indexOf(']');
  if (start === -1 || end === -1) return { status: DurationStatus.Missing, time: 0 };
  if (end < start) return { status: DurationStatus.ReversedBrackets, time: 0 };
  const body = text.slice(start + 1, end);
  const hashes = body.split('#').length - 1;
  if (hashes > 1) return { status: DurationStatus.TooManySeparators, time: 0 };
  if (hashes === 0) return readRatio(bpm, body);
  const hash = body.indexOf('#');
  const first = body.slice(0, hash);
  const second = body.slice(hash + 1);
  if (first === '') {
    const time = parseDouble(second);
    return Number.isFinite(time) ? { status: DurationStatus.Success, time } : { status: DurationStatus.Unreadable, time: 0 };
  }
  const customBpm = parseDouble(first);
  if (second === '' || !Number.isFinite(customBpm)) return { status: DurationStatus.Unreadable, time: 0 };
  return readRatio(customBpm, second);
}

// Reads one slide bracket body, returning its length and the BPM that sets the wait time.
function readSlideBracket(bpm, body) {
  const parts = body.split('#');
  const hashes = parts.length - 1;
  if (hashes > 3) return { status: DurationStatus.TooManySeparators };
  if (hashes === 0) {
    const ratio = readRatio(bpm, body);
    return ratio.status === DurationStatus.Success ? { status: ratio.status, time: ratio.time } : ratio;
  }
  if (hashes === 1) {
    const [first, second] = parts;
    const slideBpm = parseDouble(first);
    if (first === '' || second === '' || !Number.isFinite(slideBpm)) {
      return { status: DurationStatus.Unreadable };
    }
    let time = parseDouble(second);
    if (!Number.isFinite(time)) {
      const ratio = readRatio(slideBpm, second);
      if (ratio.status !== DurationStatus.Success) return ratio;
      time = ratio.time;
    }
    return { status: DurationStatus.Success, time, customBpm: slideBpm };
  }
  const wait = parseDouble(parts[0]);
  if (parts[1] !== '') return { status: DurationStatus.UnexpectedPart };
  if (parts[0] === '' || parts[2] === '' || !Number.isFinite(wait)) {
    return { status: DurationStatus.Unreadable };
  }
  if (hashes === 2) {
    let time = parseDouble(parts[2]);
    if (!Number.isFinite(time)) {
      const ratio = readRatio(bpm, parts[2]);
      if (ratio.status !== DurationStatus.Success) return ratio;
      time = ratio.time;
    }
    return { status: DurationStatus.Success, time, customBpm: 60 / wait };
  }
  const slideBpm = parseDouble(parts[2]);
  if (parts[3] === '' || !Number.isFinite(slideBpm)) return { status: DurationStatus.Unreadable };
  const ratio = readRatio(slideBpm, parts[3]);
  if (ratio.status !== DurationStatus.Success) return ratio;
  return { status: DurationStatus.Success, time: ratio.time, customBpm: 60 / wait };
}

// Every bracket of a connected slide adds to the length; the first bracket that sets a BPM
// (or a wait time) fixes the wait between the star head and the start of the slide.
function readSlideTimes(bpm, text) {
  let totalTime = 0;
  let customBpm;
  let bracketIndex = text.indexOf('[');
  if (bracketIndex === -1) return { status: DurationStatus.Missing, wait: 0, time: 0 };
  let nextStart = 0;
  do {
    const slideBody = text.slice(nextStart + bracketIndex);
    const closeIndex = slideBody.indexOf(']');
    if (closeIndex === -1) return { status: DurationStatus.Unreadable, wait: 0, time: 0 };
    nextStart += closeIndex + bracketIndex + 1;
    const bracket = readSlideBracket(bpm, slideBody.slice(1, closeIndex));
    if (bracket.status !== DurationStatus.Success) return { status: bracket.status, wait: 0, time: 0 };
    totalTime += bracket.time;
    if (customBpm === undefined && bracket.customBpm !== undefined) customBpm = bracket.customBpm;
    bracketIndex = text.slice(nextStart).indexOf('[');
  } while (bracketIndex !== -1);
  return { status: DurationStatus.Success, wait: 1 / ((customBpm ?? bpm) / 60), time: totalTime };
}

/* ------------------------------------------------------------------ *
 * Notes
 * ------------------------------------------------------------------ */

const NoteType = {
  Tap: 'Tap',
  Hold: 'Hold',
  Slide: 'Slide',
  Touch: 'Touch',
  TouchHold: 'TouchHold',
};

// ParsedNoteFlags of MajSimai
const Flag = {
  Break: 1 << 0,
  SlideBreak: 1 << 1,
  Ex: 1 << 2,
  ForceStar: 1 << 3,
  FakeRotate: 1 << 4,
  TapHeadSlide: 1 << 5,
  Mine: 1 << 6,
  MineSlide: 1 << 7,
  UsingSV: 1 << 8,
  Hanabi: 1 << 9,
  NoHead: 1 << 10,
};

const HeadFlags =
  Flag.Break |
  Flag.Ex |
  Flag.Mine |
  Flag.ForceStar |
  Flag.FakeRotate |
  Flag.TapHeadSlide |
  Flag.Hanabi |
  Flag.UsingSV;

const Role = { None: 0, First: 1, Continuation: 2 };

const slideMarks = new Set(['-', '^', 'v', '<', '>', 'V', 'p', 'q', 's', 'z', 'w']);

// A port of NoteReader.NoteMarkers.Detect: splits the text into the note itself and the
// markers that become flags. The text is returned because every consumer needs it.
function detectMarkers(noteText) {
  let flags = Flag.UsingSV;
  let isTouch = false;
  let isHold = false;
  let isSlide = false;
  let hasNoHeadMarker = false;
  let hasMisplacedTouchLetter = false;
  let ignoredMarker = '\0';
  let headLength = 0;
  const slideState = { isSlide: false };
  let forceStarCount = 0;
  let text = '';
  const hasSlideCodeEnd = noteText.includes('K');

  const markSlide = (length) => {
    if (!slideState.isSlide) headLength = length;
    slideState.isSlide = true;
  };

  const readHeadOrPathMarker = (index, headFlag, pathFlag) => {
    if ((flags & headFlag) !== 0 && (flags & pathFlag) !== 0) return;
    if (!slideState.isSlide) {
      flags |= headFlag;
      return;
    }
    const isLast = index === noteText.length - 1;
    if (isLast || noteText[index + 1] === '[') {
      flags |= pathFlag;
      return;
    }
    if (ignoredMarker === '\0') ignoredMarker = noteText[index];
  };

  for (let i = 0; i < noteText.length; i++) {
    const c = noteText[i];
    const isSlideCodeLetter = hasSlideCodeEnd && text.length > 0 && isDigit(text[0]);
    switch (c) {
      case '-':
      case '^':
      case 'v':
      case '<':
      case '>':
      case 'V':
      case 'p':
      case 'q':
      case 's':
      case 'z':
      case 'w':
      case 'K':
        markSlide(text.length);
        break;
      case 'A':
      case 'B':
      case 'C':
        if (text.length === 0) isTouch = true;
        else if (isSlideCodeLetter) markSlide(text.length);
        else hasMisplacedTouchLetter = true;
        break;
      case 'D':
      case 'E':
        if (text.length === 0) isTouch = true;
        else hasMisplacedTouchLetter = true;
        break;
      case 'P':
      case 'Q':
        if (isSlideCodeLetter) markSlide(text.length);
        break;
      case 'f':
        flags |= Flag.Hanabi;
        break;
      case 'h':
        isHold = true;
        break;
      case 'x':
        flags |= Flag.Ex;
        continue;
      case 'c':
        flags &= ~Flag.UsingSV;
        continue;
      case '!':
      case '?':
        hasNoHeadMarker = true;
        continue;
      case '@':
        flags |= Flag.TapHeadSlide;
        continue;
      case '$':
        forceStarCount++;
        continue;
      case 'b':
        readHeadOrPathMarker(i, Flag.Break, Flag.SlideBreak);
        continue;
      case 'm':
        readHeadOrPathMarker(i, Flag.Mine, Flag.MineSlide);
        continue;
    }
    text += c;
  }

  if (forceStarCount > 0) flags |= Flag.ForceStar;
  if (forceStarCount > 1) flags |= Flag.FakeRotate;
  isSlide = slideState.isSlide;
  if (isSlide) {
    isHold = false;
    isTouch = false;
  }
  return {
    flags,
    isTouch,
    isHold,
    isSlide,
    hasNoHeadMarker,
    hasMisplacedTouchLetter,
    ignoredMarker,
    headLength,
    text,
  };
}

// Reads one note (ReadSingle). Returns null when it cannot be read in lenient mode.
function readSingle(source, noteText, role) {
  const markers = detectMarkers(noteText);
  const text = markers.text;
  if (markers.hasMisplacedTouchLetter) {
    source.warn(noteText, 'touch area letter after the start of the note');
    return null;
  }
  if (text === '') {
    source.warn(noteText, 'no button or sensor');
    return null;
  }
  const note = { touchArea: ' ', start: 0, hold: 0, slideStart: 0, slideTime: 0, flags: 0, raw: text, role };
  if (markers.isTouch) {
    note.touchArea = text[0];
    if (note.touchArea !== 'C') {
      if (text.length < 2 || !isDigit(text[1])) {
        source.warn(noteText, 'unreadable touch');
        return null;
      }
      note.start = Number(text[1]);
    } else {
      note.start = 8;
    }
    note.type = NoteType.Touch;
  } else {
    if (!isDigit(text[0])) {
      source.warn(noteText, 'unreadable note');
      return null;
    }
    note.start = Number(text[0]);
    note.type = NoteType.Tap;
  }

  if (markers.isHold) {
    note.type = markers.isTouch ? NoteType.TouchHold : NoteType.Hold;
    if (markers.isTouch || text.at(-1) !== 'h') {
      const result = readHoldTime(source.bpm, text);
      if (isMalformedDuration(result.status)) {
        source.warn(noteText, 'malformed duration');
        return null;
      }
      note.hold = result.status === DurationStatus.Success ? result.time : 0;
    }
  }

  let flags = markers.flags;
  if (markers.isSlide) {
    note.type = NoteType.Slide;
    const times = readSlideTimes(source.bpm, text);
    if (isMalformedDuration(times.status)) {
      source.warn(noteText, 'malformed duration');
      return null;
    }
    if (times.status !== DurationStatus.Success) {
      source.warn(noteText, 'unreadable slide duration');
      return null;
    }
    note.slideTime = times.time;
    note.slideStart = source.time + times.wait;
    note.headLength = markers.headLength;
    if (markers.hasNoHeadMarker) flags |= Flag.NoHead;
  }
  if (role === Role.Continuation) flags |= Flag.NoHead;
  note.flags = flags;
  return note;
}

function readNote(source, noteText, output) {
  if (noteText.length === 1 && isButton(noteText)) {
    output.push({
      type: NoteType.Tap,
      start: Number(noteText),
      touchArea: ' ',
      hold: 0,
      slideStart: 0,
      slideTime: 0,
      flags: Flag.UsingSV,
      raw: noteText,
      role: Role.None,
    });
    return;
  }
  const note = readSingle(source, noteText, Role.None);
  if (note) output.push(note);
}

// 1-3[8:1]*-5[8:1]: every later part is read with the button of the first part in front.
function readSameHeadGroup(source, group, output) {
  if (group[0] === '*') {
    source.warn(group, 'same head group without a head');
    return;
  }
  const firstLength = group.indexOf('*');
  const first = group.slice(0, firstLength);
  const firstNote = readSingle(source, first, Role.First);
  if (!firstNote) return;
  output.push(firstNote);
  const head = first[0];
  let rest = group.slice(firstLength + 1);
  for (;;) {
    const separator = rest.indexOf('*');
    const part = separator === -1 ? rest : rest.slice(0, separator);
    if (part === '') {
      source.warn(group, 'empty same head part');
      if (separator === -1) return;
      rest = rest.slice(separator + 1);
      continue;
    }
    const note = readSingle(source, head + part, Role.Continuation);
    if (note) output.push(note);
    if (separator === -1) return;
    rest = rest.slice(separator + 1);
  }
}

// Reads the notes of one timing point (NoteReader.ReadTimingPoint).
function readTimingPoint(source) {
  const content = source.content;
  const output = [];
  if (content === '') return output;
  if (content.length === 1 && isButton(content)) {
    output.push({
      type: NoteType.Tap,
      start: Number(content),
      touchArea: ' ',
      hold: 0,
      slideStart: 0,
      slideTime: 0,
      flags: Flag.UsingSV,
      raw: content,
      role: Role.None,
    });
    return output;
  }
  if (content.length === 2 && isDigit(content[0]) && isDigit(content[1])) {
    readNote(source, content[0], output);
    readNote(source, content[1], output);
    return output;
  }
  let rest = content;
  for (;;) {
    const separator = rest.indexOf('/');
    const note = separator === -1 ? rest : rest.slice(0, separator);
    if (note === '') {
      // An empty part between '/' is ignored in lenient mode.
    } else if (note.includes('*')) {
      readSameHeadGroup(source, note, output);
    } else {
      readNote(source, note, output);
    }
    if (separator === -1) return output;
    rest = rest.slice(separator + 1);
  }
}

/* ------------------------------------------------------------------ *
 * Assembly (a port of NoteAssembler)
 * ------------------------------------------------------------------ */

function createNote(parsed) {
  const note = {
    type: parsed.type,
    start: parsed.start,
    area: parsed.touchArea,
    hold: parsed.hold,
    slideStart: parsed.slideStart,
    slideTime: parsed.slideTime,
    raw: parsed.raw,
    isBreak: (parsed.flags & Flag.Break) !== 0,
    isEx: (parsed.flags & Flag.Ex) !== 0,
    isMine: (parsed.flags & Flag.Mine) !== 0,
    isForceStar: (parsed.flags & Flag.ForceStar) !== 0,
    isFakeRotate: (parsed.flags & Flag.FakeRotate) !== 0,
    isTapHeadSlide: (parsed.flags & Flag.TapHeadSlide) !== 0,
    isHanabi: (parsed.flags & Flag.Hanabi) !== 0,
    usingSV: (parsed.flags & Flag.UsingSV) !== 0,
    isEach: false,
    isStar: false,
    isStarDouble: false,
    related: [],
  };
  return note;
}

function createSlide(parsed) {
  return {
    type: NoteType.Slide,
    start: parsed.start,
    area: parsed.touchArea,
    hold: 0,
    slideStart: parsed.slideStart,
    slideTime: parsed.slideTime,
    raw: parsed.raw,
    isBreak: (parsed.flags & Flag.SlideBreak) !== 0,
    isMine: (parsed.flags & Flag.MineSlide) !== 0,
    usingSV: (parsed.flags & Flag.UsingSV) !== 0,
    isEx: false,
    isForceStar: false,
    isFakeRotate: false,
    isTapHeadSlide: false,
    isHanabi: false,
    isEach: false,
    isStar: false,
    isStarDouble: false,
    related: [],
  };
}

function createHead(parsed) {
  return {
    type: NoteType.Tap,
    start: parsed.start,
    area: parsed.touchArea,
    hold: 0,
    slideStart: 0,
    slideTime: 0,
    raw: parsed.raw.slice(0, parsed.headLength),
    isBreak: (parsed.flags & Flag.Break) !== 0,
    isEx: (parsed.flags & Flag.Ex) !== 0,
    isMine: (parsed.flags & Flag.Mine) !== 0,
    isForceStar: (parsed.flags & Flag.ForceStar) !== 0,
    isFakeRotate: (parsed.flags & Flag.FakeRotate) !== 0,
    isTapHeadSlide: (parsed.flags & Flag.TapHeadSlide) !== 0,
    isHanabi: (parsed.flags & Flag.Hanabi) !== 0,
    usingSV: (parsed.flags & Flag.UsingSV) !== 0,
    isEach: false,
    isStar: false,
    isStarDouble: false,
    related: [],
  };
}

function applyGroupFlags(notes) {
  let slideCount = 0;
  for (const note of notes) if (note.type === NoteType.Slide) slideCount++;
  const otherCount = notes.length - slideCount;
  for (const note of notes) {
    if (note.type === NoteType.Slide) {
      note.isEach = slideCount > 1;
      continue;
    }
    note.isEach = otherCount > 1;
    if (note.type !== NoteType.Tap) continue;
    const hasSlides = note.related.length !== 0;
    note.isStar = note.isForceStar || (hasSlides && !note.isTapHeadSlide);
    note.isStarDouble =
      note.isStar &&
      hasSlides &&
      notes.filter((n) => n.type === NoteType.Slide && !n.isMine && n.start === note.start).length > 1;
  }
}

function assemble(parsedNotes) {
  if (parsedNotes.length === 0) return [];
  if (parsedNotes.length === 1 && parsedNotes[0].type !== NoteType.Slide) {
    const note = createNote(parsedNotes[0]);
    if (note.type === NoteType.Tap) note.isStar = note.isForceStar;
    return [note];
  }
  const notes = [];
  let head = null;
  let relatedSlides = [];
  const closeHead = () => {
    if (!head) return;
    head.related = relatedSlides;
    relatedSlides = [];
    head = null;
  };
  for (const parsed of parsedNotes) {
    const isSlide = parsed.type === NoteType.Slide;
    if (head && parsed.role === Role.Continuation) {
      const continuation = isSlide ? createSlide(parsed) : createNote(parsed);
      if (isSlide) relatedSlides.push(continuation);
      notes.push(continuation);
      continue;
    }
    closeHead();
    if (isSlide && (parsed.flags & Flag.NoHead) === 0) {
      const slide = createSlide(parsed);
      head = createHead(parsed);
      relatedSlides.push(slide);
      notes.push(head, slide);
    } else if (isSlide) {
      notes.push(createSlide(parsed));
    } else {
      notes.push(createNote(parsed));
    }
  }
  closeHead();
  applyGroupFlags(notes);
  return notes;
}

/* ------------------------------------------------------------------ *
 * Chart scanner (a port of ChartScanner)
 * ------------------------------------------------------------------ */

/**
 * Parses one chart text the way `SimaiParser.ParseChart` does in MajSimai 3.0.1, in lenient
 * mode: a note that cannot be read is dropped, and only the rules that stop MajSimai too throw
 * (`InvalidSimaiSyntaxException` for an unclosed declaration or a number that cannot be read,
 * `InvalidSimaiMarkupException` for a single `|`).
 *
 * @param {string} text the chart text (`&inote_N`), without the metadata lines
 * @returns {{ noteTimings: { time: number, bpm: number, hs: number, sv: number, raw: string,
 *   notes: object[] }[], commaTimings: { time: number, bpm: number, hs: number, sv: number,
 *   sigNum: number, sigDen: number }[] }}
 */
export function parseChart(text) {
  const fumen = text;
  const noteTimings = [];
  const commaTimings = [];
  let bpm = 0;
  let beats = 4;
  let hSpeed = 1;
  let sVeloc = 1;
  let signatureNumerator = 4;
  let signatureDenominator = 4;
  let time = 0;
  let commaInterval = 1 / (bpm / 60) * 4 / beats;
  let hasNote = false;
  let noteText = '';

  const updateCommaInterval = () => {
    commaInterval = (1 / (bpm / 60)) * 4 / beats;
  };

  const addNoteTiming = (timing, content) => {
    const withoutSpace = [...content].filter((c) => !isSpace(c)).join('');
    const source = {
      time: timing,
      bpm,
      content: withoutSpace,
      warn: () => {},
    };
    const parsed = readTimingPoint(source);
    noteTimings.push({
      time: timing,
      bpm,
      hs: hSpeed,
      sv: sVeloc,
      raw: withoutSpace,
      notes: assemble(parsed),
    });
  };

  // Text with '`' (fake each) becomes one timing point per part, each a 128th note later.
  const addNoteTimings = () => {
    const content = noteText;
    if (!content.includes('`')) {
      addNoteTiming(time, content);
      return;
    }
    let fakeTime = time;
    const interval = 1.875 / bpm;
    for (const part of content.split('`')) {
      // An empty part is skipped in lenient mode; a part that is only whitespace still makes
      // an (empty) timing point, as MajSimai does.
      if (part !== '') {
        addNoteTiming(fakeTime, part);
        fakeTime += interval;
      }
    }
  };

  const addCommaTiming = () => {
    commaTimings.push({ time, bpm, hs: hSpeed, sv: sVeloc, sigNum: signatureNumerator, sigDen: signatureDenominator });
  };

  const cutNote = () => {
    hasNote = false;
    noteText = '';
  };

  const endTimingPoint = () => {
    if (hasNote) addNoteTimings();
    addCommaTiming();
    time += commaInterval;
    hasNote = false;
    noteText = '';
  };

  const isEndMarker = (index) => {
    for (let i = index + 1; i < fumen.length; i++) {
      if (!isSpace(fumen[i])) return !isDigit(fumen[i]);
    }
    return true;
  };

  // "||" comments run to the end of the line; "||s3/4" also sets the time signature.
  const readComment = (index) => {
    if (fumen[index + 1] !== '|') {
      // A single '|' stops the parse in every mode.
      markupError('Unexpected character "|"');
    }
    const lineEnd = fumen.indexOf('\n', index);
    const end = lineEnd === -1 ? fumen.length : lineEnd;
    if (index + 2 < end && fumen[index + 2] === 's') {
      const signature = fumen.slice(index + 3, end).trim();
      const parts = signature.split('/');
      if (parts.length >= 2) {
        const numerator = parseIntStrict(parts[0]);
        const denominator = parseIntStrict(parts[1]);
        signatureNumerator = Number.isFinite(numerator) ? numerator : 4;
        signatureDenominator = Number.isFinite(denominator) ? denominator : 4;
      }
    }
    return end;
  };

  // Reads the text of a declaration up to its closing character.
  const declarationEnd = (index, close, kind) => {
    const closeIndex = fumen.indexOf(close, index + 1);
    if (closeIndex === -1) {
      // An unclosed declaration stops the parse in every mode.
      syntaxError(`The ${kind} declaration is not closed by '${close}'`);
    }
    return closeIndex;
  };

  const readBpm = (index) => {
    cutNote();
    const close = declarationEnd(index, ')', 'BPM');
    const value = parseDouble(fumen.slice(index + 1, close).trim());
    if (!Number.isFinite(value)) syntaxError('BPM value must be a number');
    bpm = f32(value);
    updateCommaInterval();
    return close;
  };

  const readBeats = (index) => {
    cutNote();
    const close = declarationEnd(index, '}', 'beat');
    const value = fumen.slice(index + 1, close).trim();
    if (value === '') syntaxError('Beats value must be a number');
    if (value[0] === '#') {
      const interval = parseDouble(value.slice(1));
      if (!Number.isFinite(interval)) syntaxError('Beats value must be a number');
      beats = f32(240 / (bpm * interval));
      updateCommaInterval();
      return close;
    }
    const parsed = parseDouble(value);
    if (!Number.isFinite(parsed)) syntaxError('Beats value must be a number');
    beats = f32(parsed);
    updateCommaInterval();
    return close;
  };

  const readSpeed = (index) => {
    const close = declarationEnd(index, '>', 'HS / SV');
    const body = fumen
      .slice(index + 1, close)
      .split('\n')
      .join('');
    const starIndex = body.indexOf('*');
    if (body.length < 4 || starIndex === -1 || body.indexOf('*', starIndex + 1) !== -1) {
      syntaxError('Unexpected HS / SV declaration syntax');
    }
    const name = body.slice(0, starIndex);
    const rawValue = body.slice(starIndex + 1);
    const value = parseDouble(rawValue);
    if (name === 'HS') {
      if (!Number.isFinite(value)) markupError('HSpeed value must be a number');
      hSpeed = f32(value);
    } else if (name === 'SV') {
      if (!Number.isFinite(value)) markupError('SVeloc value must be a number');
      sVeloc = f32(value);
    } else {
      syntaxError('Unexpected HS / SV declaration syntax');
    }
    return close;
  };

  for (let i = 0; i < fumen.length; i++) {
    const c = fumen[i];
    if (c === '\n') continue;
    if (c === '|') {
      i = readComment(i) - 1;
      continue;
    }
    if (c === '(') {
      i = readBpm(i);
      continue;
    }
    if (c === '{') {
      i = readBeats(i);
      continue;
    }
    if (c === '<' && !hasNote) {
      i = readSpeed(i);
      continue;
    }
    if (c === ',') {
      endTimingPoint();
      continue;
    }
    if (hasNote) {
      noteText += c;
      continue;
    }
    if ((c >= '0' && c <= '9') || (c >= 'A' && c <= 'E')) {
      if (c === 'E' && isEndMarker(i)) {
        addCommaTiming();
        return { noteTimings, commaTimings };
      }
      hasNote = true;
      noteText = c;
      continue;
    }
    // Stray characters are ignored in lenient mode.
  }
  // Note text that no comma ended at the end of the chart is dropped.
  addCommaTiming();
  return { noteTimings, commaTimings };
}

/* ------------------------------------------------------------------ *
 * Renderer model
 * ------------------------------------------------------------------ */

const slideMarkPattern = /(pp|qq|V|[-^<>vpqszw])([1-8])([1-8])?(?:\[([^\]]+)\])?/y;

// Reads the path of a slide into its segments, with the shape and the times the renderer draws.
// `startTime` is when the slide starts moving (the star head waits before that).
function slideSegments(slide, bpm, totalTime, startTime) {
  const raw = slide.raw;
  const startIndex = [...raw].findIndex((c) => slideMarks.has(c));
  const path = startIndex === -1 ? '' : raw.slice(startIndex);
  const segments = [];
  let index = 0;
  let from = slide.start;
  while (index < path.length) {
    slideMarkPattern.lastIndex = index;
    const match = slideMarkPattern.exec(path);
    if (!match || (match[1] === 'V') !== Boolean(match[3])) throw Error('Invalid slide ' + path);
    const mark = match[1];
    const via = match[3] ? Number(match[2]) : undefined;
    const to = Number(match[3] ?? match[2]);
    segments.push({
      shape: slideShape(from, mark, to, via),
      mark,
      to,
      from,
      bracket: match[4],
    });
    from = to;
    index = slideMarkPattern.lastIndex;
  }
  const weights = segments.map((s) => s.shape.bars.length + 1);
  // Simai writes the length of a whole connected slide on its last segment (`1-3-5[4:1]`):
  // then every segment takes a share of the total by its number of bars. When every segment
  // carries a bracket (`1-3[8:1]-5[4:1]`) each one lasts its own duration.
  const allSpecified = segments.every((s) => s.bracket !== undefined);
  const lengths = allSpecified
    ? segments.map((s) => {
        const bracket = readSlideBracket(bpm, s.bracket);
        return bracket.status === DurationStatus.Success ? bracket.time : 0;
      })
    : (() => {
        const total = weights.reduce((sum, weight) => sum + weight, 0);
        return weights.map((weight) => (total ? (totalTime * weight) / total : 0));
      })();
  let cursor = 0;
  return segments.map((s, i) => {
    const segment = {
      shape: s.shape,
      start: startTime + cursor,
      end: startTime + cursor + lengths[i],
      mark: s.mark,
      to: s.to,
    };
    cursor += lengths[i];
    return segment;
  });
}

function noteSpeedFields(note, time, speed) {
  return {
    lane: note.start,
    time,
    end: time,
    speed,
    mine: note.isMine,
    brk: note.isBreak,
    ex: note.isEx,
    firework: note.isHanabi,
    star: note.isForceStar,
    rotate: note.isFakeRotate,
    each: note.isEach,
  };
}

export function compileChart(fields, difficulty) {
  const text = fields['inote_' + (difficulty + 1)];
  if (!text) throw Error('This difficulty has no chart.');
  const offset = Number(fields['first_' + (difficulty + 1)] ?? fields.first ?? 0);
  if (!Number.isFinite(offset)) throw Error('Invalid chart offset.');

  const parsed = parseChart(text);
  const notes = [];
  const warnings = [];
  // The BPM at the start of the chart, which schedules the count-in clocks.
  const firstBpm = parsed.commaTimings.find((timing) => timing.bpm > 0)?.bpm ?? 0;

  for (const timingPoint of parsed.noteTimings) {
    const time = timingPoint.time + offset;
    const speed = timingPoint.hs;

    // Slides are built first: a star head is only worth drawing when one of its slides is
    // drawable, so the heads below look their slides up here.
    const slides = new Map();
    for (const note of timingPoint.notes) {
      if (note.type !== NoteType.Slide) continue;
      if (note.raw.includes('K')) {
        // Slide Code paths cannot be drawn by the web player yet.
        warnings.push({ time, token: note.raw, message: 'Slide Code is not supported' });
        slides.set(note, null);
        continue;
      }
      const n = noteSpeedFields(note, time, speed);
      n.kind = 'slide';
      n.travel = note.slideStart + offset;
      n.end = n.travel + note.slideTime;
      try {
        n.segments = slideSegments(note, timingPoint.bpm, note.slideTime, n.travel);
      } catch (error) {
        // MajSimai reads the path without checking the shape; the renderer cannot draw an
        // invalid one, so it is skipped the way the previous parser skipped it.
        warnings.push({ time, token: note.raw, message: error.message });
        slides.set(note, null);
        continue;
      }
      slides.set(note, n);
    }

    const group = [];
    for (const note of timingPoint.notes) {
      if (note.type === NoteType.Slide) {
        const n = slides.get(note);
        if (n) group.push(n);
      } else if (note.type === NoteType.Tap) {
        const related = note.related.map((slide) => slides.get(slide)).filter(Boolean);
        // A head whose only slides are undrawable would be a star that never moves.
        if (note.related.length > 0 && related.length === 0) continue;
        const n = noteSpeedFields(note, time, speed);
        // Only a slide head is a "star" for the renderer: it spins while its slide travels.
        // A tap forced to the star skin ($) is drawn as a star but does not spin.
        n.kind = note.isStar && related.length > 0 ? 'star' : 'tap';
        n.double = note.isStarDouble;
        if (n.kind === 'star') n.spinPeriod = related[0].end - related[0].travel;
        group.push(n);
      } else if (note.type === NoteType.Hold) {
        const n = noteSpeedFields(note, time, speed);
        n.kind = 'hold';
        n.end = time + note.hold;
        group.push(n);
      } else if (note.type === NoteType.Touch) {
        const n = noteSpeedFields(note, time, speed);
        n.kind = 'touch';
        n.area = note.area;
        group.push(n);
      } else if (note.type === NoteType.TouchHold) {
        const n = noteSpeedFields(note, time, speed);
        n.kind = 'touchHold';
        n.area = note.area;
        n.end = time + note.hold;
        group.push(n);
      }
    }

    // The renderer links the two ring buttons of an each with a line.
    const ring = group.filter((n) => !n.mine && (n.kind === 'tap' || n.kind === 'star' || n.kind === 'hold'));
    if (ring.length > 1) {
      const a = ring[0].lane;
      const b = ring[1].lane;
      const delta = (b - a + 8) % 8;
      if (delta) ring[0].link = { lane: delta > 4 ? b : a, length: Math.min(delta, 8 - delta) };
    }
    notes.push(...group);
  }

  if (!notes.length) throw Error('This difficulty is empty.');
  notes.sort((a, b) => a.time - b.time);
  return { notes, warnings, firstBpm, last: notes.reduce((end, n) => Math.max(end, n.end), 0) };
}
