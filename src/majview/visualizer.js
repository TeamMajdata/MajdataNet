// 播放器下方的谱面时间轴，移植自 MajdataEdit-Neo 的 SimaiVisualizerControl
// （Controls/SimaiVisualizerControl.cs）。
//
// 和原控件一样：当前时间固定画在正中间（红线 + 顶部橙色 caret），前后各 ZoomLevel 秒的
// 内容随着播放往左滚——音乐波形、每次 BPM 变化的数字、小节/拍竖线、每个逗号 timing 的
// 刻度，以及 8 条轨上的音符标记。
//
// 和原控件不同的地方：
// - 原控件每帧都重新扫一遍 BPM、从歌曲 0 秒重走一遍整个拍网格、遍历所有音符，再往
//   十几万个点的 List 里塞波形；这里每帧只算窗口里的那几十拍、几十个音符，波形按像素
//   列取 min/max 包络（原控件是隔 20 个采样点取一个点，缩小时会变成噪声）；
// - 拍号用谱面里真实的 `||s3/4`（原控件硬编码 4/4）；
// - 时间来自播放器的高精度时钟，不再做原控件那种跟帧率绑定的 0.2 指数平滑。

import { clamp } from './geometry.js';

// 和原控件一致的颜色（SKColor 原值）。
export const VISUALIZER_COLORS = {
  waveform: 'rgba(0, 100, 0, .59)',
  bpm: '#ffff00',
  beat: '#ffff00',
  comma: '#ffffff',
  playhead: 'rgba(200, 0, 0, .78)',
  caret: '#ffa500',
  note: '#ffb6c1', // LightPink
  each: '#ffd700', // Gold
  break: '#ff4500', // OrangeRed
  touch: '#00bfff', // DeepSkyBlue
  slide: '#87ceeb', // SkyBlue
  mine: '#a3a3a3', // 地雷
  hanabi: 'rgba(255, 0, 0, .39)',
  touchHold: ['#ffa500', '#ffff00', '#008000', '#0000ff'],
};

/** 默认窗口：当前时间前后各 3 秒（原控件的 ZoomLevel 就是半窗口长度）。 */
export const DEFAULT_ZOOM = 3;

// 波形分辨率：每 10ms 一个桶（一场 3 分钟的歌约 1.8 万个），上限 16384。
// 原控件按 20 个采样点取一个值，滚到窗口视图时一个桶只有 0.4ms，密度差三个数量级；
// 这里按时间切桶，窗口里每个像素列才拿得到有意义的 min/max。
const WAVEFORM_BUCKETS_PER_SECOND = 100;
const WAVEFORM_MIN_BUCKETS = 2048;
const WAVEFORM_MAX_BUCKETS = 16384;

// 每个桶最多读这么多采样：十分钟 48kHz 的歌有 2880 万采样，
// 不分步的话第一次解码完会卡一下。
const WAVEFORM_SAMPLES_PER_BUCKET = 4096;

const LANE_COUNT = 8;
// 轨道上下留白：上面放 BPM 数字，下面放逗号刻度（对应原控件的 height-30、+10）。
const LANE_TOP = 8;
const LANE_BOTTOM = 20;
const WEAK_BEAT_HEIGHT = 10;
// 一帧的保险丝：BPM 写成 1、又把窗口拉得很大时，拍线能把时间轴撑爆。
const MAX_BEATS = 4000;

// 原控件里的笔画/标记尺寸，直接照搬（Skia 单位 = CSS 像素）：
// tap 半径 3.5、touch 7×7、hold 3.5 宽、滑动条 3.5 宽、滑动菱形头半径 5。
const TAP_RADIUS = 3.5;
const NOTE_STROKE = 2;
const TOUCH_HALF = 3.5;
const HOLD_STROKE = 3.5;
const SLIDE_HEAD_RADIUS = 5;
const SLIDE_HEAD_STROKE = 1.5;
const MARK_FONT = 'bold 12px ui-monospace, SFMono-Regular, Consolas, monospace';
const BPM_FONT = '12px ui-monospace, SFMono-Regular, Consolas, monospace';
// 频谱配色是"最亮通道拉满"的饱和色，整条铺满太抢眼：整体压到 50% 亮度
const WAVEFORM_COLOUR_ALPHA = 0.5;

/**
 * 把解码好的音乐压成波形包络。
 * @param {AudioBuffer | null | undefined} buffer
 * @param {number} [buckets] 0 表示按音乐长度自动选（每 10ms 一个桶）
 * @returns {Float32Array | null} 每个桶两个数：最小值和最大值，-1..1
 */
export function buildWaveform(buffer, buckets = 0) {
  if (!buffer || !(buffer.length > 0) || !(buffer.duration > 0)) return null;
  const data = buffer.getChannelData(0);
  if (!data || data.length === 0) return null;

  const target = buckets > 0
    ? buckets
    : clamp(Math.round(buffer.duration * WAVEFORM_BUCKETS_PER_SECOND), WAVEFORM_MIN_BUCKETS, WAVEFORM_MAX_BUCKETS);
  const count = Math.min(target, data.length);
  const wave = new Float32Array(count * 2);
  const size = data.length / count;
  const stride = Math.max(1, Math.floor(size / WAVEFORM_SAMPLES_PER_BUCKET));
  for (let i = 0; i < count; i++) {
    const from = Math.floor(i * size);
    const to = Math.min(data.length, Math.floor((i + 1) * size));
    let min = 0;
    let max = 0;
    for (let s = from; s < to; s += stride) {
      const value = data[s];
      if (value < min) min = value;
      else if (value > max) max = value;
    }
    wave[i * 2] = min;
    wave[i * 2 + 1] = max;
  }
  return wave;
}

/**
 * 每次 BPM 变化的位置，和原控件一样跳过和上一个相同的值。
 * @param {{ time: number, bpm: number, sigNum?: number, sigDen?: number }[] | undefined} commaTimings
 * @param {number} offset 整体平移（设置里的 First 偏移），秒
 * @returns {{ time: number, bpm: number, numerator: number, denominator: number }[]}
 */
export function bpmChanges(commaTimings, offset = 0) {
  const changes = [];
  let last = 0;
  for (const timing of commaTimings ?? []) {
    const { bpm } = timing;
    if (!(bpm > 0) || bpm === last) continue;
    last = bpm;
    changes.push({
      time: timing.time + offset,
      bpm,
      numerator: timing.sigNum > 0 ? timing.sigNum : 4,
      denominator: timing.sigDen > 0 ? timing.sigDen : 4,
    });
  }
  return changes;
}

/**
 * 窗口 [from, to] 里的拍线：小节第一拍是贯穿全高的“大拍”，其余只画顶部一小段。
 * 强拍的位置按段落开头的绝对拍号算，不随窗口滑动而漂移。
 * @param {{ time: number, bpm: number, numerator: number, denominator: number }[]} changes
 * @param {number} from
 * @param {number} to
 * @returns {{ strong: number[], weak: number[] }}
 */
export function beatWindow(changes, from, to) {
  const strong = [];
  const weak = [];
  if (!(to > from) || changes.length === 0) return { strong, weak };
  let total = 0;
  for (let i = 0; i < changes.length; i++) {
    const section = changes[i];
    const stop = Math.min(changes[i + 1]?.time ?? Infinity, to);
    if (!(section.bpm > 0) || section.time >= to || stop <= from) continue;
    // 一拍的长度按拍号的分母算：4/4 是四分音符，6/8 是八分音符。
    const beat = (60 / section.bpm) * (4 / section.denominator);
    if (!(beat > 1e-4)) continue;
    const first = Math.max(0, Math.ceil((from - section.time) / beat - 1e-9));
    for (let index = first; ; index += 1) {
      const time = section.time + index * beat;
      if (time >= stop) break;
      if (index % section.numerator === 0) strong.push(time);
      else weak.push(time);
      if (++total > MAX_BEATS) return { strong, weak };
    }
  }
  return { strong, weak };
}

/** 有序数组里的第一个 >= value 的下标。 */
function lowerBound(items, value, read = (item) => item) {
  let low = 0;
  let high = items.length;
  while (low < high) {
    const middle = (low + high) >> 1;
    if (read(items[middle]) < value) low = middle + 1;
    else high = middle;
  }
  return low;
}

/**
 * 窗口 [from, to] 里要画的音符下标范围。`maxSpan` 是最长的音符时长（end - time），
 * 用来把左边伸进窗口的长条也找回来。
 * @param {{ time: number, end: number }[]} notes 按 time 升序
 * @param {number} from
 * @param {number} to
 * @param {number} maxSpan
 * @returns {{ start: number, end: number }}
 */
export function noteRange(notes, from, to, maxSpan = 0) {
  let start = lowerBound(notes, from - maxSpan, (note) => note.time);
  // 更早的音符也可能把尾巴伸进窗口（超长 hold / 滑动），往左回退到没有为止。
  while (start > 0 && notes[start - 1].end >= from) start -= 1;
  let end = start;
  while (end < notes.length && notes[end].time <= to) end += 1;
  return { start, end };
}

function formatBpm(bpm) {
  return String(Math.round(bpm * 1000) / 1000);
}

/**
 * 音符标记的颜色：地雷一律灰色；其次是 break / each 的强调色；都没有才用这类音符本身的颜色。
 * 原控件没有处理地雷（画成普通音符），这里按需求补上。
 */
export function noteColor(note, normal) {
  if (note.mine) return VISUALIZER_COLORS.mine;
  if (note.brk) return VISUALIZER_COLORS.break;
  if (note.each) return VISUALIZER_COLORS.each;
  return normal;
}

/**
 * 播放器下方的谱面时间轴：红线固定在中间，谱面和波形跟着时间滚动。
 * 窗口里的内容每帧现算（几十个音符 / 几十拍），没有静态层缓存。
 */
export class Visualizer {
  /** @param {HTMLCanvasElement} canvas */
  constructor(canvas) {
    this.canvas = canvas;
    this.context = canvas.getContext('2d');
    this.content = null;
    this.changes = [];
    this.commaTimes = [];
    this.maxSpan = 0;
    this.lastTime = 0;
    this.width = 0;
    this.height = 0;
    this.dpr = 0;
  }

  /**
   * @param {{ chart: object, waveform: Float32Array | null, waveformDuration: number,
   *   offset: number, zoom: number } | null} content
   */
  setContent(content) {
    this.content = content;
    const chart = content?.chart;
    const offset = content?.offset ?? 0;
    this.changes = bpmChanges(chart?.commaTimings, offset);
    this.commaTimes = (chart?.commaTimings ?? []).map((timing) => timing.time + offset);
    let maxSpan = 0;
    for (const note of chart?.notes ?? []) maxSpan = Math.max(maxSpan, note.end - note.time);
    this.maxSpan = maxSpan;
    this.render(this.lastTime);
  }

  /** 尺寸变了（ResizeObserver / 转屏）：下一帧会按新尺寸重画。 */
  resize() {
    this.render(this.lastTime);
  }

  /** @param {number} time 当前时间（秒），画在正中间 */
  render(time) {
    this.lastTime = time;
    const { canvas, context } = this;
    if (!canvas || !context) return;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (!(width > 0 && height > 0)) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (width !== this.width || height !== this.height || dpr !== this.dpr) {
      this.width = width;
      this.height = height;
      this.dpr = dpr;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
    }

    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    context.clearRect(0, 0, width, height);

    const content = this.content;
    if (!content) return;
    const zoom = content.zoom > 0 ? content.zoom : DEFAULT_ZOOM;
    const from = time - zoom;
    const to = time + zoom;
    const scale = width / (to - from);
    const xOf = (value) => (value - from) * scale;

    if (content.waveform) {
      drawWaveform(context, content.waveform, content.waveformDuration, from, to, width, height, content.analysis);
    }
    drawBpmLabels(context, this.changes, xOf, width, from, to);
    drawBeats(context, this.changes, from, to, xOf, width, height, scale);
    drawCommaTicks(context, this.commaTimes, from, xOf, width, height);
    const notes = content.chart?.notes;
    if (notes?.length) {
      const offset = content.offset;
      const range = noteRange(notes, from, to, this.maxSpan);
      drawNotes(context, notes, range, { xOf, scale, offset, width, height });
    }

    context.fillStyle = VISUALIZER_COLORS.caret;
    context.beginPath();
    context.moveTo(width / 2 - 5, 0);
    context.lineTo(width / 2 + 5, 0);
    context.lineTo(width / 2, 8);
    context.closePath();
    context.fill();
    context.fillStyle = VISUALIZER_COLORS.playhead;
    context.fillRect(Math.round(width / 2) - 1, 8, 2, height - 16);
  }
}

function drawWaveform(context, waveform, duration, from, to, width, height, analysis) {
  const buckets = Math.floor(waveform.length / 2);
  if (!(buckets > 0) || !(duration > 0)) return;
  const span = to - from;
  // 只画音乐真正覆盖到的列：窗口常常伸到音乐开头之前（clock 前奏）或结尾之后。
  const first = Math.max(0, Math.ceil(((0 - from) / span) * width));
  const last = Math.min(width, Math.floor(((duration - from) / span) * width));
  if (last <= first) return;

  const center = height / 2;
  const amplitude = height / 2;
  // 有 Aurora 分析结果就按三段分频上色，没有就先画原来的绿色
  const colors = analysis?.color ?? null;
  const hopSeconds = analysis?.hopSeconds ?? 0;
  const frames = analysis?.frames ?? 0;

  let fill = VISUALIZER_COLORS.waveform;
  let colorFrame = -1;
  context.fillStyle = fill;
  // Aurora 的颜色是"最亮通道拉满"的饱和色，直接铺满会太跳；整体压到 50% 亮度
  context.globalAlpha = colors ? WAVEFORM_COLOUR_ALPHA : 1;

  for (let x = first; x < last; x++) {
    // 这一列覆盖的时间段，取其中所有桶的 min/max
    const start = ((from + (x / width) * span) / duration) * buckets;
    const stop = ((from + ((x + 1) / width) * span) / duration) * buckets;
    const fromBucket = clamp(Math.floor(start), 0, buckets - 1);
    const toBucket = clamp(Math.ceil(stop), fromBucket + 1, buckets);
    let min = 0;
    let max = 0;
    for (let bucket = fromBucket; bucket < toBucket; bucket++) {
      if (waveform[bucket * 2] < min) min = waveform[bucket * 2];
      if (waveform[bucket * 2 + 1] > max) max = waveform[bucket * 2 + 1];
    }

    if (colors) {
      const time = from + ((x + 0.5) / width) * span;
      const frame = Math.min(frames - 1, Math.max(0, Math.round(time / hopSeconds)));
      if (frame !== colorFrame) {
        colorFrame = frame;
        fill = `rgb(${colors[frame * 3]},${colors[frame * 3 + 1]},${colors[frame * 3 + 2]})`;
        context.fillStyle = fill;
      }
    }

    context.fillRect(x, center - max * amplitude, 1, Math.max(1, (max - min) * amplitude));
  }
  context.globalAlpha = 1;
}

function drawBpmLabels(context, changes, xOf, width, from, to) {
  if (changes.length === 0) return;
  context.font = BPM_FONT;
  context.textBaseline = 'alphabetic';
  context.fillStyle = VISUALIZER_COLORS.bpm;
  for (const change of changes) {
    if (change.time < from || change.time > to) continue;
    const x = xOf(change.time);
    if (x < -30 || x > width + 30) continue;
    context.fillText(formatBpm(change.bpm), x + 3, 10);
  }
}

/** 相邻两条线在屏幕上的间距（像素）：窗口拉得很大时小拍会密到糊成一片，按它降级。 */
function lineGap(times, scale) {
  if (times.length < 2) return Infinity;
  return Math.abs(times[1] - times[0]) * scale;
}

function drawBeats(context, changes, from, to, xOf, width, height, scale) {
  const { strong, weak } = beatWindow(changes, from, to);
  const strongPath = new Path2D();
  const weakPath = new Path2D();
  const add = (path, time, lineHeight) => {
    const x = Math.round(xOf(time));
    if (x < -1 || x > width) return;
    path.rect(x, 0, 1, lineHeight);
  };
  if (lineGap(weak, scale) >= 3) for (const time of weak) add(weakPath, time, WEAK_BEAT_HEIGHT);
  if (lineGap(strong, scale) >= 2) for (const time of strong) add(strongPath, time, height);
  context.fillStyle = VISUALIZER_COLORS.beat;
  context.fill(strongPath);
  context.fill(weakPath);
}

function drawCommaTicks(context, commaTimes, from, xOf, width, height) {
  if (commaTimes.length === 0) return;
  const path = new Path2D();
  for (let index = lowerBound(commaTimes, from); index < commaTimes.length; index++) {
    const x = Math.round(xOf(commaTimes[index]));
    if (x > width) break;
    if (x < -1) continue;
    path.rect(x, height - 10, 1, 10);
  }
  context.fillStyle = VISUALIZER_COLORS.comma;
  context.fill(path);
}

function drawNotes(context, notes, range, { xOf, scale, offset, width, height }) {
  const laneStep = (height - LANE_TOP - LANE_BOTTOM) / LANE_COUNT;
  const laneY = (lane) => LANE_TOP + clamp(lane, 1, LANE_COUNT) * laneStep;
  // 同一个 timing 里的星头（有头的滑动）和滑动条数量：原控件靠它们决定菱形头和金色。
  // 星头单独存着：菱形头用的是星头自己的标记（`1m-5` 的 m 在头上），而滑动条本体用的是
  // 滑动路径自己的标记（`1-5m` 的 m 在路径上），两者互不影响。
  const heads = new Map();
  const slideCounts = new Map();
  for (let index = range.start; index < range.end; index++) {
    const note = notes[index];
    const key = `${note.time.toFixed(4)}:${note.lane}`;
    if (note.kind === 'tap' || note.kind === 'star') heads.set(key, note);
    if (note.kind === 'slide') slideCounts.set(key, (slideCounts.get(key) ?? 0) + 1);
  }

  context.textBaseline = 'alphabetic';
  context.font = MARK_FONT;

  for (let index = range.start; index < range.end; index++) {
    const note = notes[index];
    const time = note.time + offset;
    const end = note.end + offset;
    const x = xOf(time);
    const y = laneY(note.lane);
    // 滑动条从 travel 开始（星头等着的那段不算条）；长条可能左边一截在窗口外。
    const bodyStart = note.kind === 'slide' ? note.travel + offset : time;
    const bodyX = xOf(bodyStart);
    const bodyEnd = xOf(end);
    if (bodyEnd < -8 || x > width + 8) continue;

    if (note.firework) {
      const left = x + (note.kind === 'touchHold' ? bodyEnd - x : 0);
      const gradient = context.createLinearGradient(left, 0, left + scale, 0);
      gradient.addColorStop(0, VISUALIZER_COLORS.hanabi);
      gradient.addColorStop(1, 'rgba(255, 0, 0, 0)');
      context.fillStyle = gradient;
      context.fillRect(left, 0, scale, height);
    }

    switch (note.kind) {
      case 'tap': {
        // 只有强制星（$）画 *，普通 tap 画圆点
        const color = noteColor(note, VISUALIZER_COLORS.note);
        if (note.star) {
          context.fillStyle = color;
          context.fillText('*', x - 7, y - 7);
        } else {
          context.strokeStyle = color;
          context.lineWidth = NOTE_STROKE;
          context.beginPath();
          context.arc(x, y, TAP_RADIUS, 0, Math.PI * 2);
          context.stroke();
        }
        break;
      }
      case 'star':
        // 星头不再画 tap 圆圈：它由下面那条滑动条的菱形头表示，
        // 两个都画就是同一个点上一个 * 一个圆圈，看着像画错了。
        break;
      case 'touch': {
        context.strokeStyle = noteColor(note, VISUALIZER_COLORS.touch);
        context.lineWidth = NOTE_STROKE;
        const half = TOUCH_HALF;
        context.strokeRect(x - half, y - half, half * 2, half * 2);
        break;
      }
      case 'hold': {
        context.strokeStyle = noteColor(note, VISUALIZER_COLORS.note);
        context.lineWidth = HOLD_STROKE;
        context.beginPath();
        context.moveTo(x, y);
        context.lineTo(Math.max(x + 2, bodyEnd), y);
        context.stroke();
        break;
      }
      case 'touchHold': {
        context.lineWidth = HOLD_STROKE;
        // 地雷没有“四色叠加”的含义，画一条灰的就够了
        if (note.mine) {
          context.strokeStyle = VISUALIZER_COLORS.mine;
          context.beginPath();
          context.moveTo(x, y);
          context.lineTo(Math.max(x + 2, bodyEnd), y);
          context.stroke();
          break;
        }
        const quarter = (bodyEnd - x) / 4;
        for (let i = 0; i < 4; i++) {
          context.strokeStyle = VISUALIZER_COLORS.touchHold[i];
          context.beginPath();
          context.moveTo(x, y);
          context.lineTo(x + Math.max(1, quarter * (4 - i)), y);
          context.stroke();
        }
        break;
      }
      case 'slide': {
        const key = `${note.time.toFixed(4)}:${note.lane}`;
        const head = heads.get(key);
        if (head) {
          // 菱形头的颜色跟星头走：星头是地雷就灰，跟滑动路径是不是地雷无关
          context.strokeStyle = noteColor(head, VISUALIZER_COLORS.touch);
          context.lineWidth = SLIDE_HEAD_STROKE;
          const radius = SLIDE_HEAD_RADIUS;
          const diagonal = radius * 0.7071;
          context.beginPath();
          context.moveTo(x - diagonal, y - diagonal);
          context.lineTo(x + diagonal, y + diagonal);
          context.moveTo(x + diagonal, y - diagonal);
          context.lineTo(x - diagonal, y + diagonal);
          context.moveTo(x, y - radius);
          context.lineTo(x, y + radius);
          context.moveTo(x - radius, y);
          context.lineTo(x + radius, y);
          context.stroke();
        }
        context.lineWidth = HOLD_STROKE;
        // 滑动条本体跟路径走：路径是地雷就灰；多条路径叠在同一个 timing 上时原控件染金
        context.strokeStyle = noteColor(
          note,
          (slideCounts.get(key) ?? 1) >= 2 ? VISUALIZER_COLORS.each : VISUALIZER_COLORS.slide,
        );
        context.setLineDash([4, 4]);
        context.beginPath();
        context.moveTo(bodyX, y);
        context.lineTo(Math.max(bodyX + 1, bodyEnd), y);
        context.stroke();
        context.setLineDash([]);
        break;
      }
      default:
        break;
    }
  }
}
