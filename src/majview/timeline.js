export const channels = {
  answer: 'Answer',
  judge: 'Judge',
  judge_break: 'Judge',
  judge_ex: 'EX',
  break: 'Break',
  slide: 'Slide',
  touch: 'Touch',
  touchHold_riser: 'Touch',
  hanabi: 'Hanabi',
  clock: 'Clock',
};

// Play 按 60fps 处理音效：每种音效一帧最多请求一次，相隔不到一帧的 answer 合并成一个
const FRAME = 1 / 60;

const CLOCK_COUNT = 4;

// 和 Play 的 AnswerSoundSchedule 一样：谱面开头按第一个 BPM 响四下 clock。
// 前四拍内就有 note 时，四下放在 0 之前（-4 拍到 -1 拍），否则从 0 开始。
export function clockTimes(chart) {
  if (!(chart.firstBpm > 0) || !chart.notes.length) return [];
  const interval = 60 / chart.firstBpm;
  const early = chart.notes.some((n) => n.time < CLOCK_COUNT * interval);
  return Array.from({ length: CLOCK_COUNT }, (_, i) => (early ? -(CLOCK_COUNT - i) : i) * interval);
}

/** 播放从哪里开始：有提前的 clock 时从第一下 clock 开始，否则从 0 */
export function chartStart(chart) {
  return Math.min(0, ...clockTimes(chart));
}

export function soundEvents(chart) {
  const raw = [];
  const add = (time, name, length = 0) => raw.push({ time, name, length });
  for (const time of clockTimes(chart)) add(time, 'clock');
  for (const n of chart.notes) {
    if (n.mine) continue;
    if (n.kind === 'slide') {
      // slide 本身不响 answer（星星头是单独的 tap，由它来响）
      add(n.travel, 'slide');
      if (n.brk) add(n.end, 'break');
      continue;
    }
    add(n.time, 'answer');
    // 和 Play 一样：不到一帧的 hold 不算长条，结束时不再响 answer
    const long = (n.kind === 'hold' || n.kind === 'touchHold') && n.end - n.time >= FRAME;
    if (long) add(n.end, 'answer');
    if (n.kind === 'touchHold') {
      // 和 Play 的 TouchHoldDrop 一样：头判只起 riser（不响 touch），riser 一直响到结束判定才停，
      // 结束判定时响一下普通 tap 判定音（PlayTapSound，TouchHold 固定按非 break、非 EX 处理）
      if (long) add(n.time, 'touchHold_riser', n.end - n.time);
      add(n.end, 'judge');
      if (n.firework) add(n.end, 'hanabi');
    } else if (n.kind === 'touch') {
      add(n.time, 'touch');
      if (n.firework) add(n.end, 'hanabi');
    } else {
      if (n.brk) {
        add(n.time, 'break');
        add(n.time, 'judge_break');
      }
      if (n.ex) add(n.time, 'judge_ex');
      if (!n.ex && !n.brk) add(n.time, 'judge');
      // hold 尾判和 Play 的 HoldDrop.End() 一样：不管 hold 本身是 EX 还是绝赞，都按普通 tap 判定音响
      // （IsBreak = false、IsEX = false）。以前只给普通 hold 加，EX / 绝赞 hold 的尾巴不响
      if (long) add(n.end, 'judge');
    }
  }
  raw.sort((a, b) => a.time - b.time);
  const events = [];
  const last = new Map();
  for (const e of raw) {
    const previous = last.get(e.name);
    if (previous && e.time - previous.time < FRAME) {
      // 只有持续音（touchhold 的 riser）要把长度延到后一个的结尾；一次性的音效 length 是 0（播完为止），
      // 不能改：以前这里把相隔几毫秒的两个 tap 合并后的 judge / answer 设成了几毫秒长，响一下就被掐断
      if (previous.length > 0) previous.length = Math.max(previous.length, e.time + e.length - previous.time);
      continue;
    }
    const event = { ...e };
    events.push(event);
    last.set(e.name, event);
  }
  return events;
}

export function lowerBound(items, value, key) {
  let lo = 0,
    hi = items.length;
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (key(items[mid]) < value) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}
export const noteSpeed = (setting) => 107.25 / (71.4184491 * (setting + 0.9975) ** -0.985558604);
export const touchDuration = (speed) => 3.209385682 * speed ** -0.9549621752;

// HoldDrop.OnUpdate keeps the body between two distances, in 1080px disc units where the
// judgment ring is at 480 and a note appears from 122.5:
//   - the tail stays at 122.5 until it reaches the ring-ward end of its travel, and the end
//     point (the small cap) is shown only once it has left there;
//   - the head stops at the judgment ring once it has passed it, so the body never runs
//     outside the ring.
// A negative HS is clamped the same way, so a reverse hold arrives like a normal one.
export function holdSpan(time, note, speed) {
  const head = 480 + (time - note.time) * speed * 100;
  const tail = 480 + (time - note.end) * speed * 100;
  const endVisible = tail >= 122.5;
  return {
    head: Math.min(480, Math.max(122.5, head)),
    tail: Math.max(122.5, tail),
    endVisible,
  };
}

// Overlapping long notes survive a seek. The prefix maximum allows skipping
// completed intervals even when their end times differ from their start order.
export function displayIndex(notes, settings) {
  const entries = notes.map((n) => {
    const speed = noteSpeed(settings.NoteSpeed / 10) * n.speed;
    // A negative HS scrolls the note backwards: it comes from outside the judgment
    // ring, so the lead is measured with the magnitude of the speed either way.
    const absSpeed = Math.abs(speed);
    const lead = n.kind.startsWith('touch')
      ? touchDuration((settings.TouchSpeed / 10) * Math.abs(n.speed))
      // 从 destScale = 0 的位置（中心以内 1/NoteAppearRate − 1.225 个单位）走到判定线
      : (4.8 + 1 / 0.265 - 1.225) / absSpeed;
    return { n, speed, from: n.time - lead, to: n.end + 0.76 };
  });
  // The Unity scene restarts one tap and judge animator per lane. A mine
  // doesn't take over either animator, and touches have independent hit effects.
  const nextHit = [];
  for (const e of [...entries].sort((a, b) => a.n.end - b.n.end).reverse()) {
    const n = e.n;
    if (n.mine || !['tap', 'star', 'hold'].includes(n.kind)) continue;
    e.to = Math.min(e.to, nextHit[n.lane] ?? Infinity);
    nextHit[n.lane] = n.end;
  }
  entries.sort((a, b) => a.from - b.from);
  let latest = -Infinity;
  for (const entry of entries) entry.latest = latest = Math.max(latest, entry.to);
  return entries;
}

// All firework notes trigger the same scene object, including simultaneous hits.
export function hanabiTimeline(notes) {
  return notes.filter((n) => n.firework && (n.kind === 'touch' || n.kind === 'touchHold'))
    .map((n) => ({ time: n.end + (n.kind === 'touch' ? 0.05 : 0), area: n.area, lane: n.lane }))
    .sort((a, b) => a.time - b.time);
}

// Each entry stores a prefix count, so backwards seeks cost only a binary search.
export function scoreTimeline(notes) {
  const counts = [0, 0, 0, 0, 0];
  return notes
    .map((n) => ({
      time: n.end + (n.kind === 'touch' ? 0.05 : 0),
      category: n.brk
        ? 4
        : n.kind === 'hold' || n.kind === 'touchHold'
          ? 1
          : n.kind === 'slide'
            ? 2
            : n.kind === 'touch'
              ? 3
              : 0,
    }))
    .sort((a, b) => a.time - b.time)
    .map((entry) => {
      counts[entry.category]++;
      return { time: entry.time, counts: [...counts] };
    });
}
export function scoreAt(entries, index) {
  const zero = [0, 0, 0, 0, 0];
  const counts = entries[index - 1]?.counts ?? zero,
    totals = entries.at(-1)?.counts ?? zero;
  const weight = (v) => v[0] + 2 * v[1] + 3 * v[2] + v[3] + 5 * v[4];
  const max = weight(totals),
    base = max ? (100 * weight(counts)) / max : 0;
  return {
    counts,
    totals,
    classic: base + (max ? (20 * counts[4]) / max : 0),
    deluxe: base + (totals[4] ? counts[4] / totals[4] : 0),
  };
}
