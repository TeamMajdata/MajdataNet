import { slideShape } from './geometry.js';

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

function positive(text) {
  const n = Number(text);
  if (!text || !(n > 0) || !Number.isFinite(n)) throw Error('Invalid tempo or divisor: ' + text);
  return n;
}
function seconds(text) {
  const n = Number(text);
  if (!text || !(n >= 0) || !Number.isFinite(n)) throw Error('Invalid duration: ' + text);
  return n;
}
function duration(spec, bpm) {
  const parts = spec.split('#');
  const last = parts.at(-1);
  const [div, beats] = last.split(':');
  const tempo = parts.length === 2 && parts[0] ? positive(parts[0]) : bpm;
  const wait = parts.length === 3 ? seconds(parts[0]) : 60 / tempo;
  const length = beats === undefined ? seconds(last) : (240 * seconds(beats)) / (positive(div) * tempo);
  return { wait, length };
}
function noteBase(token, lane, time, speed) {
  return {
    lane,
    time,
    end: time,
    speed,
    mine: token.includes('m'),
    brk: token.includes('b'),
    ex: token.includes('x'),
    firework: token.includes('f'),
    star: token.includes('$'),
    rotate: token.includes('$$'),
    each: false,
  };
}
const slideMark = /[-^<>vpqszwV]/;
function parseSingle(token, time, bpm, speed) {
  const touch = /^[ABCDE]/.test(token);
  const lane = token[0] === 'C' ? 8 : Number(token[touch ? 1 : 0]);
  if (!(lane >= 1 && lane <= 8)) throw Error('Invalid lane ' + token);
  const branches = token.split('*');
  const first = branches[0];
  const markIndex = first.search(slideMark);
  if (touch || markIndex < 0) {
    const spec = token.match(/\[([^\]]+)\]/)?.[1];
    const n = noteBase(token, lane, time, speed);
    n.kind = touch ? (token.includes('h') ? 'touchHold' : 'touch') : token.includes('h') ? 'hold' : 'tap';
    n.area = touch ? token[0] : '';
    if (spec) n.end += duration(spec, bpm).length;
    return [n];
  }
  const headText = first.slice(0, markIndex);
  const notes = [];
  if (!/[!?]/.test(first)) {
    notes.push({ ...noteBase(headText, lane, time, speed), kind: 'star', double: branches.length > 1 });
  }
  for (let b = 0; b < branches.length; b++) {
    const raw = b === 0 ? first.slice(markIndex) : branches[b];
    const n = noteBase('', lane, time, speed);
    n.kind = 'slide';
    n.brk = /b(?=\[|[bm!?]*$)/.test(raw);
    n.mine = /m(?=\[|[bm!?]*$)/.test(raw);
    const path = raw.replace(/[bm!?x$]/g, '');
    const segment = /(pp|qq|V|[-^<>vpqszw])([1-8])([1-8])?(?:\[([^\]]+)\])?/gy;
    let pos = 0,
      from = lane;
    const segments = [];
    while (pos < path.length) {
      segment.lastIndex = pos;
      const match = segment.exec(path);
      if (!match || (match[1] === 'V') !== Boolean(match[3])) throw Error('Invalid slide ' + path);
      const via = match[3] ? Number(match[2]) : undefined;
      const to = Number(match[3] ?? match[2]);
      segments.push({ shape: slideShape(from, match[1], to, via), spec: match[4], mark: match[1], to });
      from = to;
      pos = segment.lastIndex;
    }
    const specified = segments.filter((s) => s.spec);
    if (
      !specified.length ||
      !segments.at(-1).spec ||
      (specified.length !== 1 && specified.length !== segments.length)
    )
      throw Error('Invalid chain duration');
    const firstDuration = duration(specified[0].spec, bpm);
    n.travel = time + firstDuration.wait;
    let cursor = n.travel;
    const weight = segments.reduce((sum, s) => sum + s.shape.bars.length + 1, 0);
    n.segments = segments.map((s) => {
      const length =
        specified.length === segments.length
          ? duration(s.spec, bpm).length
          : (firstDuration.length * (s.shape.bars.length + 1)) / weight;
      const start = cursor;
      cursor += length;
      return { shape: s.shape, start, end: cursor, mark: s.mark, to: s.to };
    });
    n.end = cursor;
    notes.push(n);
  }
  if (notes[0]?.kind === 'star') notes[0].spinPeriod = notes[1].end - notes[1].travel;
  return notes;
}

export function compileChart(fields, difficulty) {
  const text = fields['inote_' + (difficulty + 1)];
  if (!text) throw Error('This difficulty has no chart.');
  const notes = [],
    warnings = [];
  let time = Number(fields['first_' + (difficulty + 1)] ?? fields.first ?? 0);
  if (!Number.isFinite(time)) throw Error('Invalid chart offset.');
  let bpm = 0,
    division = 4,
    speed = 1,
    firstBpm = 0;
  const source = text.replace(/\|\|[^\n]*/g, '').replace(/\s/g, '');
  for (let token of source.split(',')) {
    token = token.replace(/\(([^)]+)\)|\{([^}]+)\}|<?HS\*([^>]+)>/g, (_, tempo, div, hs) => {
      if (tempo) {
        bpm = positive(tempo);
        firstBpm ||= bpm;
      }
      if (div) division = positive(div);
      if (hs) speed = seconds(hs);
      return '';
    });
    if (token === 'E') break;
    if (!bpm && !token) continue;
    if (!bpm) throw Error('A BPM is required before the first note.');
    let groupTime = time;
    for (const chord of token.split('\x60')) {
      const group = [];
      for (const part of chord.split('/').filter(Boolean)) {
        try {
          for (const item of /^[1-8]{2}$/.test(part) ? [...part] : [part]) {
            group.push(...parseSingle(item, groupTime, bpm, speed));
          }
        } catch (error) {
          warnings.push({ time: groupTime, token: part, message: error.message });
        }
      }
      const heads = group.filter((n) => n.kind !== 'slide' && !n.mine);
      const paths = group.filter((n) => n.kind === 'slide' && !n.mine);
      for (const n of group) n.each = n.kind === 'slide' ? paths.length > 1 : heads.length > 1;
      const ring = heads.filter((n) => !n.kind.startsWith('touch'));
      if (ring.length > 1) {
        const a = ring[0].lane,
          b = ring[1].lane,
          delta = (b - a + 8) % 8;
        if (delta) ring[0].link = { lane: delta > 4 ? b : a, length: Math.min(delta, 8 - delta) };
      }
      notes.push(...group);
      groupTime += 1.875 / bpm;
    }
    time += 240 / (bpm * division);
  }
  if (!notes.length) throw Error(warnings[0]?.message ?? 'This difficulty is empty.');
  notes.sort((a, b) => a.time - b.time);
  return { notes, warnings, firstBpm, last: notes.reduce((end, n) => Math.max(end, n.end), 0) };
}
