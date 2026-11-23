import { Application, Assets, Container, Graphics, Mesh, MeshGeometry, Rectangle, Sprite, Texture } from 'pixi.js';
import animations from './generated/effects.json' with { type: 'json' };
import { createHanabiRays } from './hanabi.js';
import { clamp, laneAngle, lanePoint, sensorPoint } from './geometry.js';
import { displayIndex, hanabiTimeline, holdSpan, lowerBound, touchDuration, scoreTimeline, scoreAt } from './timeline.js';

async function loadSkin(skinBase) {
  const base = new URL(skinBase, document.baseURI);
  const response = await fetch(new URL('atlas.json', base));
  if (!response.ok) throw Error('Could not load the note skin');
  const { pages, sprites, rings } = await response.json();
  const sheets = await Promise.all(
    Array.from({ length: pages }, (_, i) => Assets.load(new URL('atlas-' + i + '.webp', base).href)),
  );
  const skin = Object.fromEntries(
    Object.entries(sprites).map(([key, [i, x, y, w, h, ow, oh, left, top]]) => [
      key,
      new Texture({
        source: sheets[i].source,
        frame: new Rectangle(x, y, w, h),
        orig: new Rectangle(0, 0, ow, oh),
        trim: new Rectangle(left, top, w, h),
      }),
    ]),
  );
  // 星星的引导线（Play 的 NoteGuideSkins/Slide.png）和普通引导线同尺寸同形状，共用一份裁切
  if (skin.starline && !rings.starline) rings.starline = rings.normal;
  skin.rings = Object.fromEntries(Object.entries(rings).map(([key, rects]) => {
    const { width, height } = skin[key].orig;
    const positions = [], uvs = [], indices = [];
    for (const [l, t, r, b] of rects) {
      const i = positions.length / 2;
      for (const [x, y] of [[l, t], [r, t], [r, b], [l, b]]) {
        positions.push(x - width / 2, y - height / 2);
        uvs.push(x / width, y / height);
      }
      indices.push(i, i + 1, i + 2, i, i + 2, i + 3);
    }
    const geometry = new MeshGeometry({
      positions: new Float32Array(positions),
      uvs: new Float32Array(uvs),
      indices: new Uint32Array(indices),
    });
    geometry.batchMode = 'batch';
    return [key, geometry];
  }));
  return skin;
}

// Play 默认的 NoteAppearRate：音符从判定盘中心出现后放大到原尺寸的速度
export const NOTE_APPEAR_RATE = 0.265;

// Play HoldEffectDisplayer 的 Perfect 颜色 (1, 227/255, 0)
const HOLD_EFFECT_PERFECT = 0xffe300;

function shine(time) {
  return 0.15 * (1 - Math.cos((time * 2 * Math.PI) / 0.26667));
}
function exTint(n) {
  return n.each || n.brk ? 0xfffe77 : n.kind === 'star' ? 0xacfbff : 0xfface1;
}

// Play SlideBase：到达时刻前 3.926913/流速 开始淡入，最多 0.2 秒淡到 0.5（wifi 淡到 1），
// 保持到到达前 0.05 秒再完全不透明
function slideFadeIn(n, time, speed, wifi) {
  const complete = n.time - 0.05;
  if (time > complete) return 1;
  const start = n.time - 3.926913 / Math.abs(speed);
  if (time < start) return 0;
  const duration = clamp(complete - start, 0, 0.2),
    max = wifi ? 1 : 0.5;
  return duration > 0 && time < start + duration ? (max * (time - start)) / duration : max;
}

function variant(note) {
  if (note.mine && note.brk) return '_break_mine';
  if (note.mine) return '_mine';
  if (note.brk) return '_break';
  return note.each ? '_each' : '';
}

// Layers retain their sprites across frames. Changing the time also reconstructs
// active holds and slides when the user seeks backwards or into a long note.
class Layer {
  constructor(parent, skin, geometries) {
    this.geometries = geometries;
    this.skin = skin;
    this.container = new Container();
    parent.addChild(this.container);
    this.used = 0;
    // 上一帧用了多少个精灵（诊断用）
    this.lastUsed = 0;
  }
  draw(key, x, y, rotation = 0, sx = 1, sy = sx, alpha = 1, tint = 0xffffff, blend = 'normal') {
    const texture = this.skin[key];
    if (!texture || alpha <= 0) return;
    let sprite = this.container.children[this.used++];
    if (!sprite) {
      if (this.geometries) sprite = new Mesh({ geometry: this.geometries[key], texture });
      else {
        sprite = new Sprite();
        sprite.anchor.set(0.5);
      }
      this.container.addChild(sprite);
    }
    if (sprite.mask) {
      sprite.progressMask.visible = false;
      sprite.mask = null;
    }
    sprite.tint = tint;
    sprite.blendMode = blend;
    if (this.geometries) sprite.geometry = this.geometries[key];
    sprite.texture = texture;
    sprite.position.set(x, y);
    sprite.scale.set(sx, sy);
    sprite.rotation = rotation;
    sprite.alpha = alpha;
    sprite.visible = true;
    return sprite;
  }
  finish() {
    for (let i = this.used; i < this.container.children.length; i++)
      this.container.children[i].visible = false;
    this.lastUsed = this.used;
    this.used = 0;
  }
}

// 判定盘设计尺寸是 1080，再高的分辨率看不出区别
const MAX_PIXELS = 1440;

const COUNTER_KINDS = ['Tap', 'Hold', 'Slide', 'Touch', 'Break'];

/**
 * 物量统计：每行一个名称和一个数值。行只在第一次建出来，之后只改数值的文字，
 * 免得每打一个音符都重建 DOM
 */
function writeCounter(element, rows) {
  if (element.childElementCount !== rows.length * 2) {
    element.replaceChildren(...rows.flatMap(([name]) => {
      const label = document.createElement('span');
      label.textContent = name;
      return [label, document.createElement('strong')];
    }));
  }
  rows.forEach(([, value], i) => {
    const cell = element.children[i * 2 + 1];
    if (cell.textContent !== value) cell.textContent = value;
  });
}

export class Board {
  static async create(host, preference, skinBase, ui = {}) {
    const options = {
      backgroundAlpha: 0,
      // 画的全是贴图，边缘靠贴图自带的透明过渡，不需要 MSAA；手机上省不少填充开销
      antialias: false,
      autoStart: false,
      width: 540,
      height: 540,
      resolution: Math.min(devicePixelRatio, 2),
      autoDensity: true,
    };
    const app = new Application();
    try {
      await app.init({ ...options, preference: preference === 'webgpu' ? ['webgpu', 'webgl'] : ['webgl'] });
    } catch (error) {
      if (preference !== 'webgpu') throw error;
      // A browser may expose an adapter but fail to initialize the WebGPU device.
      await app.init({ ...options, preference: ['webgl'] });
    }
    try {
      return new Board(app, host, addHoldSlices(await loadSkin(skinBase)), ui);
    } catch (error) {
      app.destroy(true, { children: true });
      throw error;
    }
  }
  constructor(app, host, skin, ui = {}) {
    this.app = app;
    host.append(app.canvas);
    this.root = new Container();
    app.stage.addChild(this.root);
    // 层级和 Play 的 NoteHelper.Sorting.NoteLayer 一致（从后往前）：
    // Slide 轨道 → Slide 星星 → Slide 完成特效 → Tap 引导线 → Tap/Hold → TouchHold 边框 → Touch
    this.base = new Layer(this.root, skin, skin.rings);
    this.trails = new Layer(this.root, skin);
    this.stars = new Layer(this.root, skin);
    this.slideOk = new Layer(this.root, skin);
    this.lines = new Layer(this.root, skin, skin.rings);
    this.notes = new Layer(this.root, skin);
    this.holdBorders = new Layer(this.root, skin);
    this.touches = new Layer(this.root, skin);
    this.effects = new Layer(this.root, skin);
    this.judges = new Layer(this.root, skin, skin.rings);
    this.layers = [this.base, this.trails, this.stars, this.slideOk, this.lines, this.notes, this.holdBorders, this.touches, this.effects, this.judges];
    this.visible = [];
    this.fireLayer = new Container();
    this.root.addChildAt(this.fireLayer, 1);
    this.rays = createHanabiRays(skin.firework_new);
    this.fireLayer.addChild(this.rays);
    this.glows = new Layer(this.fireLayer, skin);
    this.skin = skin;
    // 连击数和物量统计显示在页面上（可选）
    this.combo = ui.combo ?? null;
    this.comboValue = ui.comboValue ?? null;
    this.counter = ui.counter ?? null;
    this.summary = ui.summary ?? null;
    this.maskLayer = new Container();
    this.root.addChild(this.maskLayer);
    this.chart = null;
    this.lastTime = 0;
    // 帧率诊断（由 MajView 在开发期打开）：打开后每帧记录分段耗时与精灵数
    this.profile = false;
    this.stats = null;
    this.resize = new ResizeObserver(() => {
      const width = Math.max(1, Math.round(host.clientWidth));
      const height = Math.max(1, Math.round(host.clientHeight));
      // 判定盘永远是正方形：取短边，居中放进宿主。
      // 全屏时宿主是整块屏幕（不是正方形），画布要自己定位。
      const size = Math.min(width, height);
      // 画布实际像素不超过 MAX_PIXELS：大屏 + 高分屏时贴图（最大 1080）再放大也没有更多细节
      app.renderer.resize(size, size, Math.min(devicePixelRatio, 2, Math.max(1, MAX_PIXELS / size)));
      app.canvas.style.width = size + 'px';
      app.canvas.style.height = size + 'px';
      app.canvas.style.left = Math.round((width - size) / 2) + 'px';
      app.canvas.style.top = Math.round((height - size) / 2) + 'px';
      this.root.position.set(size / 2);
      this.root.scale.set(size / 1080);
      this.render(this.lastTime);
    });
    this.resize.observe(host);
    host.dataset.renderer = app.renderer.name;
  }
  setChart(chart, settings) {
    this.chart = chart;
    this.settings = settings;
    this.index = displayIndex(chart.notes, settings);
    this.fires = hanabiTimeline(chart.notes);
    this.scores = scoreTimeline(chart.notes);
    this.lastCount = -1;
  }
  /** 打开/关闭逐帧诊断（开发期用） */
  setProfiling(on) {
    this.profile = Boolean(on);
    this.stats = null;
  }
  render(time) {
    this.lastTime = time;
    const profile = this.profile;
    const t0 = profile ? performance.now() : 0;
    this.base.draw('outline', 0, 0);
    this.drawHanabi(time);
    let visibleNotes = 0;
    if (this.chart) {
      const slots = new Map();
      const visible = this.visible;
      visible.length = 0;
      for (let i = lowerBound(this.index, time, (e) => e.latest); i < this.index.length; i++) {
        const e = this.index[i];
        if (e.from > time) break;
        if (e.to >= time) visible.push(e);
      }
      visibleNotes = visible.length;
      // Play 里同一层先出现的 note 在前面（SortOrder 递减），所以从后出现的开始画。
      // Slide 跟着 Play 的 SlideSortOrder：Modern（默认）同样是旧的在上；Classic 是新的在上，单独按出现顺序画
      const classic = this.settings.SlideClassic;
      for (let i = visible.length - 1; i >= 0; i--) {
        const e = visible[i];
        const n = e.n;
        if (n.kind === 'slide') {
          if (!classic) this.slide(n, time, e.speed);
        } else if (n.kind.startsWith('touch')) this.touch(n, time, slots);
        else this.laneNote(n, time, e.speed);
      }
      if (classic) for (const e of visible) if (e.n.kind === 'slide') this.slide(e.n, time, e.speed);
      const count = lowerBound(this.scores, time, (entry) => entry.time);
      if (this.combo) this.combo.hidden = !this.settings.Combo || count === 0;
      if (count !== this.lastCount) {
        const { counts, totals, classic, deluxe } = scoreAt(this.scores, count);
        if (this.comboValue) this.comboValue.textContent = count ? String(count) : '';
        if (this.counter) writeCounter(this.counter, COUNTER_KINDS.map((name, i) => [name, counts[i] + '/' + totals[i]]));
        if (this.summary) writeCounter(this.summary, [
          ['All', count + '/' + this.scores.length],
          ['FiNALE', classic.toFixed(2) + '%'],
          ['DELUXE', deluxe.toFixed(4) + '%'],
        ]);
        this.lastCount = count;
      }
    }
    const t1 = profile ? performance.now() : 0;
    for (const layer of this.layers) layer.finish();
    this.app.render();
    if (profile) {
      const t2 = performance.now();
      let sprites = this.glows.lastUsed;
      for (const layer of this.layers) sprites += layer.lastUsed;
      this.stats = {
        notes: visibleNotes,
        sprites,
        scene: t1 - t0,
        present: t2 - t1,
        total: t2 - t0,
      };
    }
  }
  laneNote(n, time, speed) {
    const elapsed = time - n.time,
      tail = time - n.end,
      angle = laneAngle(n.lane);
    if (tail > 0) {
      this.hit(n, lanePoint(n.lane), tail);
      return;
    }
    // Play TapDrop / HoldDrop：destScale = 距离 × NoteAppearRate + (1 − NoteAppearRate × 1.225)，距离以 100px 为 1 个单位
    const dist = 480 + elapsed * speed * 100,
      scale = clamp((dist / 100) * NOTE_APPEAR_RATE + 1 - NOTE_APPEAR_RATE * 1.225);
    if (!scale) return;
    // HoldDrop.OnUpdate keeps the body between the head and the tail distance, with the head
    // stopped at the judgment ring; a tap keeps running (a negative HS brings it from outside).
    const span = n.kind === 'hold' ? holdSpan(time, n, speed) : null;
    const r = span ? span.head : Math.max(122.5, dist),
      p = lanePoint(n.lane, r),
      style = variant(n);
    if (scale > 0.3) {
      // Play SkinManager：星星的引导线是蓝色的 Slide 线，each / break 和 tap 一样
      const line = n.mine ? 'mine' : n.brk ? 'break' : n.each ? 'each' : n.kind === 'star' ? 'starline' : 'normal';
      this.lines.draw(line, 0, 0, angle, r / 480);
      if (n.link)
        this.lines.draw('eachline' + n.link.length, 0, 0, ((n.link.lane - 1) * Math.PI) / 4, r / 480);
    }
    if (n.kind === 'hold') {
      const t = span.tail;
      const mid = lanePoint(n.lane, (r + t) / 2),
        // HoldDrop sizes the sliced body as `distance - holdDistance + 1.4`; a hold with a
        // negative HS is drawn forwards, so the size is always positive here.
        length = span.size;
      const key = 'hold' + style;
      const drawBody = (key, tint = 0xffffff, alpha = 1, blend = 'normal') => {
        // Keep end caps round while the distance between head and tail changes.
        const parts = this.skin.holdSlices[key];
        if (!parts) return;
        const cap = Math.min(58, length / 2),
          middle = (length - 2 * cap) * scale;
        const point = (offset) => lanePoint(n.lane, (r + t) / 2 + offset);
        const headPoint = point((middle + cap * scale) / 2),
          footPoint = point(-(middle + cap * scale) / 2);
        this.notes.draw(key + 'Top', headPoint.x, headPoint.y, angle, scale, (scale * cap) / 58, alpha, tint, blend);
        this.notes.draw(key + 'Middle', mid.x, mid.y, angle, scale, middle / parts.middle, alpha, tint, blend);
        this.notes.draw(key + 'Bottom', footPoint.x, footPoint.y, angle, scale, (scale * cap) / 58, alpha, tint, blend);
      };
      drawBody(key);
      if (n.brk || (elapsed > 0 && !n.mine)) drawBody(key, 0xffffff, shine(elapsed), 'add');
      if (n.ex) drawBody('hold_ex', exTint(n));
      if (span.endVisible) {
        const end = lanePoint(n.lane, t - 1.75);
        this.notes.draw(
          n.mine ? 'hold_mine_end' : n.brk ? 'hold_break_end' : n.each ? 'hold_each_end' : 'hold_end',
          end.x,
          end.y,
          angle,
          scale,
        );
      }
      if (elapsed > 0 && !n.mine) this.holdEffect(p, elapsed);
      return;
    }
    const star = n.kind === 'star' || n.star;
    const key = star ? 'star' : 'tap';
    const suffix = n.double
      ? style === '_break_mine'
        ? '_break_double_mine'
        : style === '_mine'
          ? '_double_mine'
          : style + '_double'
      : style;
    const rotation =
      n.kind === 'star'
        ? angle + (elapsed * Math.PI) / Math.max(0.05, n.spinPeriod)
        : n.rotate
          ? angle - (elapsed * 400 * Math.PI) / 180
          : angle;
    this.notes.draw(key + suffix, p.x, p.y, rotation, scale);
    if (n.brk)
      this.notes.draw(key + suffix, p.x, p.y, rotation, scale, scale, shine(elapsed), 0xffffff, 'add');
    if (n.ex)
      this.notes.draw(
        key + (n.double ? '_ex_double' : '_ex'),
        p.x,
        p.y,
        rotation,
        scale,
        scale,
        1,
        exTint(n),
      );
  }
  touch(n, time, slots) {
    const p = sensorPoint(n.area, n.lane),
      elapsed = time - n.time,
      tail = time - n.end;
    if (tail > (n.kind === 'touch' ? 0.05 : 0)) {
      this.hit(n, p, tail);
      return;
    }
    const duration = touchDuration((this.settings.TouchSpeed / 10) * Math.abs(n.speed));
    const alpha = Number.isFinite(duration) ? clamp((duration + elapsed) / (0.2 * duration)) : 1;
    if (!alpha) return;
    // Play TouchDrop：扇叶距离 0.226 + clamp((0.42 − e^(8·0.43·t/移动时长 − 0.85)) × 0.75, 0, 0.30)，移动时长 = 0.8 × 总时长
    const gap = 22.6 + 100 * clamp((0.42 - Math.exp((8 * 0.43 * elapsed) / (0.8 * duration) - 0.85)) * 0.75, 0, 0.3);
    const hold = n.kind === 'touchHold';
    const style = variant(n);
    for (let i = 0; i < 4; i++) {
      const angle = (hold ? Math.PI / 4 : 0) + (i * Math.PI) / 2;
      const fan = hold
        ? n.mine
          ? 'touchhold_mine_' + i
          : 'touchhold_0' + (n.brk ? i + 1 : 4 - i)
        : style === '_each'
          ? 'toucheach_01'
          : style
            ? 'touch' + style
            : 'touch_01';
      this.touches.draw(
        fan,
        p.x + Math.sin(angle) * gap,
        p.y - Math.cos(angle) * gap,
        angle + Math.PI,
        1,
        1,
        alpha,
      );
    }
    const point = n.mine
      ? n.brk
        ? 'touch_break_point_mine'
        : 'touch_point_mine'
      : n.brk
        ? 'touch_break_point'
        : n.each
          ? 'toucheachpoint'
          : 'touchpoint';
    // 中心点不跟着淡入（Play 只给扇叶设透明度）
    this.touches.draw(hold && !n.mine && !n.brk ? 'touchpoint' : point, p.x, p.y);
    if (!hold && elapsed > 0) this.effects.draw('touchjust', p.x, p.y);
    if (hold) {
      if (elapsed >= 0 && !n.mine) this.holdEffect(p, elapsed);
      const progress = n.end === n.time ? 1 : clamp(elapsed / (n.end - n.time));
      if (progress > 0) {
        const border = this.holdBorders.draw(
          n.mine ? 'touchhold_break_mine' : 'touchholdborder',
          p.x,
          p.y,
          0,
          1,
          1,
          alpha,
        );
        let mask = border.progressMask;
        if (!mask) {
          mask = border.progressMask = new Graphics();
          this.maskLayer.addChild(mask);
        }
        mask
          .clear()
          .moveTo(0, 0)
          .arc(0, 0, 160, -Math.PI / 2, -Math.PI / 2 + progress * 2 * Math.PI)
          .closePath()
          .fill(0xffffff);
        mask.visible = true;
        mask.position.set(p.x, p.y);
        border.mask = mask;
      }
    } else {
      const id = n.area + n.lane,
        overlap = slots.get(id) ?? 0;
      slots.set(id, overlap + 1);
      if (overlap === 1 || overlap === 2) {
        const border =
          style === '_each' ? 'toucheachborder_0' : style ? 'touch' + style + '_border_' : 'touchborder_0';
        this.touches.draw(border + Math.min(3, 1 + overlap), p.x, p.y, 0, 1, 1, alpha);
      }
    }
  }
  slide(n, time, speed) {
    const tail = time - n.end,
      style = variant(n);
    if (tail > 0) {
      if (n.mine) return;
      const s = n.segments.at(-1),
        p = s.shape.just;
      const right = s.shape.justRight;
      const key = s.shape.wifi
        ? 'just_wifi_' + ([7, 8, 1, 2].includes(s.to) ? 'u' : 'd')
        : 'just_' + (['<', '>', '^'].includes(s.mark) ? 'curv' : 'str') + '_' + (right ? 'r' : 'l');
      this.slideOk.draw(
        key,
        p.x,
        p.y,
        p.angle,
        1,
        1,
        Math.min(clamp(tail / 0.033), clamp((0.383 - tail) / 0.133)),
      );
      return;
    }
    // 从最后一段、每段从最后一个箭头往前画：后画的在上面，所以先滑到的部分盖在后滑到的上面
    // （ppqqpq 这类绕回来和自己重叠的星星，重叠处显示先经过的那一圈）
    for (let i = n.segments.length - 1; i >= 0; i--) {
      const seg = n.segments[i],
        shape = seg.shape;
      if (time > seg.end) continue;
      const progress = clamp((time - seg.start) / Math.max(0.00001, seg.end - seg.start));
      const alpha = slideFadeIn(n, time, speed, shape.wifi);
      const bars = shape.bars;
      const cursor = progress * (shape.wifi ? bars.length - 1 : bars.length);
      const first = Math.ceil(cursor);
      const drawBars = (opacity, blend) => {
        for (let j = bars.length - 1; j >= first; j--) {
          const b = bars[j];
          const key = shape.wifi ? 'wifi' + style + '_' + j : 'slide' + style;
          this.trails.draw(key, b.x, b.y, b.angle, b.sx, b.sy, opacity, 0xffffff, blend);
        }
      };
      drawBars(alpha, 'normal');
      if (n.brk && time >= n.time) drawBars(shine(time - n.time), 'add');
      if (time < n.time || (i > 0 && time < seg.start)) continue;
      const opacity =
        time < seg.start ? clamp((time - n.time) / Math.max(0.001, seg.start - n.time), 0.5, 1) : 1;
      if (shape.wifi) {
        shape.ends.forEach((target, k) =>
          this.guide(shape.start, target, progress, opacity, n, laneAngle(seg.to + k)),
        );
      } else {
        const j = Math.min(bars.length - 1, Math.floor(cursor));
        const a = j === 0 ? shape.start : bars[j - 1],
          b = bars[j],
          fraction = clamp(cursor - j);
        const nextAngle = bars[Math.min(j + 1, bars.length - 1)].angle;
        const delta = nextAngle - b.angle;
        const rotation = b.angle + Math.atan2(Math.sin(delta), Math.cos(delta)) * fraction - Math.PI / 12;
        this.guide(a, b, fraction, opacity, n, rotation);
      }
    }
  }
  guide(a, b, p, alpha, n, rotation) {
    this.stars.draw(
      'star' + variant(n),
      a.x + (b.x - a.x) * p,
      a.y + (b.y - a.y) * p,
      rotation,
      alpha + 0.5,
      alpha + 0.5,
      alpha,
    );
  }
  holdEffect(p, time) {
    const { rate, frames } = animations.hold;
    const last = Math.floor(time * rate);
    for (let i = last; i >= 0; i--) {
      const frame = frames[Math.floor((time - i / rate) * animations.fps)];
      if (!frame) break;
      const [scale, alpha] = frame;
      // Play：Hold_Effect 用 CircleMiss 贴图，按判定上色（自动播放都是 Perfect，黄色）
      this.effects.draw('circlemiss', p.x, p.y, 0, scale, scale, alpha, HOLD_EFFECT_PERFECT);
    }
  }
  animation(key, p, age, rotation = 0, layer = this.effects) {
    const frame = animations[key][Math.floor(age * animations.fps)];
    if (!frame) return;
    const sin = Math.sin(rotation),
      cos = Math.cos(rotation);
    for (const [texture, x, y, angle, sx, sy, alpha, tint] of frame) {
      layer.draw(
        texture,
        p.x + x * cos - y * sin,
        p.y + x * sin + y * cos,
        rotation + angle,
        sx,
        sy,
        alpha,
        tint,
      );
    }
  }
  hit(n, p, age) {
    const touch = n.kind === 'touch',
      hold = n.kind === 'touchHold';
    const ageAfterHit = age - (touch ? 0.05 : 0);
    if (n.mine) return;
    if (touch || hold) {
      this.animation(touch ? 'touch' : 'tap', p, ageAfterHit);
    } else {
      const angle = laneAngle(n.lane);
      // Play 把第 i 道的 TapEffect 转 -22.5° − 45°·i（Unity 逆时针为正）；换到画布（y 朝下、顺时针为正）正好是这一道的角度
      this.animation(n.brk ? 'break' : 'tap', p, age, angle);
      this.animation(n.brk ? 'judgeBreak' : 'judge', { x: 0, y: 0 }, age, angle, this.judges);
    }
  }
  drawHanabi(time) {
    const i = this.chart ? lowerBound(this.fires, time, (e) => e.time) - 1 : -1;
    const event = this.fires?.[i];
    const frame = event && animations.fire[Math.floor((time - event.time) * animations.fps)];
    this.rays.visible = false;
    if (frame) {
      const p = sensorPoint(event.area, event.lane);
      for (const [key, x, y, angle, sx, sy, alpha, tint] of frame) {
        if (key === 'firework_new') {
          this.rays.visible = sx > 0 && sy > 0;
          this.rays.position.set(p.x + x, p.y + y);
          this.rays.scale.set(sx, sy);
          this.rays.rotation = angle;
          const uniforms = this.rays.shader.resources.fireUniforms;
          uniforms.uniforms.uFire[0] = alpha;
          uniforms.uniforms.uFire[1] = (Math.ceil(time * 2.5) % 5) / 5;
          uniforms.update();
        } else {
          this.glows.draw(key, p.x + x, p.y + y, angle, sx, sy, alpha, tint);
        }
      }
    }
    this.glows.finish();
  }
  destroy() {
    this.rays.shader.destroy();
    this.rays.geometry.destroy();
    for (const geometry of Object.values(this.skin.rings)) geometry.destroy();
    this.resize.disconnect();
    this.app.destroy(true, { children: true });
  }
}

// Slice untrimmed cap coordinates against the trimmed region of an atlas frame.
function addHoldSlices(skin) {
  skin.holdSlices = {};
  for (const key of Object.keys(skin).filter((k) =>
    /^hold(?:$|_each$|_break$|_ex$|_mine$|_break_mine$)/.test(k),
  )) {
    const tex = skin[key],
      trim = tex.trim,
      middle = tex.orig.height - 116;
    skin.holdSlices[key] = { middle };
    for (const [name, origin, height] of [
      ['Top', 0, 58],
      ['Middle', 58, middle],
      ['Bottom', 58 + middle, 58],
    ]) {
      const top = Math.max(origin, trim.y),
        bottom = Math.min(origin + height, trim.y + trim.height);
      skin[key + name] = new Texture({
        source: tex.source,
        frame: new Rectangle(tex.frame.x, tex.frame.y + top - trim.y, trim.width, bottom - top),
        orig: new Rectangle(0, 0, tex.orig.width, height),
        trim: new Rectangle(trim.x, top - origin, trim.width, bottom - top),
      });
    }
  }
  return skin;
}
