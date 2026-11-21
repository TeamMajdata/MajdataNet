import { useEffect, useRef } from 'react';

/**
 * 全站背景：星空。
 * - 底色：深蓝到深灰的渐变，加一条很淡的斜向银河光带（纯 CSS，静态）
 * - 静态星星：几百颗大小、亮度、色温不同的小星星，窗口大小变化时画一次，之后不再重绘
 * - 动态层：几十颗较亮的星星缓慢闪烁（最亮的几颗带十字星芒），每隔一段时间划过一颗流星
 *
 * 性能：静态星星不占每帧开销；动态层只画几十个点，限制 30fps，页面在后台时自动暂停；
 * “减少动态效果”时只画静态星空。
 */

/** 星星的颜色：多数偏白，少数偏蓝或偏暖 */
const STAR_COLORS = ['255 255 255', '255 255 255', '220 232 255', '200 220 255', '255 240 220'];

interface TwinkleStar {
  x: number;
  y: number;
  radius: number;
  color: string;
  base: number;
  amplitude: number;
  rate: number;
  phase: number;
  /** 最亮的几颗画十字星芒 */
  glint: boolean;
}

interface Meteor {
  x: number;
  y: number;
  /** 每毫秒移动的距离（向量） */
  vx: number;
  vy: number;
  length: number;
  start: number;
  duration: number;
}

const range = (min: number, max: number) => min + (max - min) * Math.random();
const pick = <T,>(items: T[]) => items[Math.floor(Math.random() * items.length)];

/** 星星在画面里的分布：沿银河光带（左下到右上的对角线）略密一些 */
function starPosition(width: number, height: number) {
  const x = range(0, width);
  if (Math.random() < 0.35) {
    // 光带中心线：从左下 (0, 0.85h) 到右上 (w, 0.1h)
    const centerY = height * (0.85 - 0.75 * (x / width));
    return { x, y: centerY + range(-1, 1) * height * 0.12 };
  }
  return { x, y: range(0, height) };
}

function drawStaticStars(ctx: CanvasRenderingContext2D, width: number, height: number) {
  ctx.clearRect(0, 0, width, height);
  const count = Math.round((width * height) / 2600);
  for (let i = 0; i < count; i++) {
    const { x, y } = starPosition(width, height);
    // 绝大多数是很暗很小的星，少数稍亮
    const bright = Math.random() < 0.08;
    const radius = bright ? range(0.7, 1.1) : range(0.25, 0.65);
    const alpha = bright ? range(0.55, 0.85) : range(0.15, 0.5);
    ctx.fillStyle = `rgb(${pick(STAR_COLORS)} / ${alpha})`;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

function createTwinkleStars(width: number, height: number): TwinkleStar[] {
  const count = Math.round(Math.min(60, Math.max(20, (width * height) / 30000)));
  return Array.from({ length: count }, (_, i) => {
    const { x, y } = starPosition(width, height);
    return {
      x,
      y,
      radius: range(0.8, 1.5),
      color: pick(STAR_COLORS),
      base: range(0.35, 0.65),
      amplitude: range(0.2, 0.35),
      rate: range(0.3, 1.1),
      phase: range(0, Math.PI * 2),
      glint: i < Math.max(3, count / 12),
    };
  });
}

function drawFrame(ctx: CanvasRenderingContext2D, stars: TwinkleStar[], meteors: Meteor[], width: number, height: number, now: number) {
  ctx.clearRect(0, 0, width, height);
  const seconds = now / 1000;

  for (const star of stars) {
    const alpha = Math.max(0, Math.min(1, star.base + Math.sin(seconds * star.rate + star.phase) * star.amplitude));
    if (alpha < 0.02) continue;
    // 柔和的光晕 + 实心的核
    const halo = ctx.createRadialGradient(star.x, star.y, 0, star.x, star.y, star.radius * 4);
    halo.addColorStop(0, `rgb(${star.color} / ${alpha * 0.5})`);
    halo.addColorStop(1, `rgb(${star.color} / 0)`);
    ctx.fillStyle = halo;
    ctx.fillRect(star.x - star.radius * 4, star.y - star.radius * 4, star.radius * 8, star.radius * 8);
    ctx.fillStyle = `rgb(${star.color} / ${alpha})`;
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
    ctx.fill();
    if (star.glint) {
      const reach = star.radius * 7 * alpha;
      ctx.strokeStyle = `rgb(${star.color} / ${alpha * 0.45})`;
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.moveTo(star.x - reach, star.y);
      ctx.lineTo(star.x + reach, star.y);
      ctx.moveTo(star.x, star.y - reach);
      ctx.lineTo(star.x, star.y + reach);
      ctx.stroke();
    }
  }

  for (let i = meteors.length - 1; i >= 0; i--) {
    const meteor = meteors[i];
    const elapsed = now - meteor.start;
    const t = elapsed / meteor.duration;
    if (t >= 1) {
      meteors.splice(i, 1);
      continue;
    }
    const headX = meteor.x + meteor.vx * elapsed;
    const headY = meteor.y + meteor.vy * elapsed;
    const speed = Math.hypot(meteor.vx, meteor.vy);
    const tailX = headX - (meteor.vx / speed) * meteor.length;
    const tailY = headY - (meteor.vy / speed) * meteor.length;
    // 出现和消失时都淡入淡出
    const fade = Math.sin(Math.PI * t);
    const tail = ctx.createLinearGradient(headX, headY, tailX, tailY);
    tail.addColorStop(0, `rgb(255 255 255 / ${0.85 * fade})`);
    tail.addColorStop(0.3, `rgb(200 220 255 / ${0.35 * fade})`);
    tail.addColorStop(1, 'rgb(200 220 255 / 0)');
    ctx.strokeStyle = tail;
    ctx.lineWidth = 1.4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(headX, headY);
    ctx.lineTo(tailX, tailY);
    ctx.stroke();
  }
}

export default function AmbientBackground() {
  const staticRef = useRef<HTMLCanvasElement>(null);
  const liveRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const staticCanvas = staticRef.current;
    const liveCanvas = liveRef.current;
    if (!staticCanvas || !liveCanvas) return;
    const staticCtx = staticCanvas.getContext('2d');
    const ctx = liveCanvas.getContext('2d');
    if (!staticCtx || !ctx) return;
    const animate = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let width = 0;
    let height = 0;
    let stars: TwinkleStar[] = [];
    const meteors: Meteor[] = [];
    let frame = 0;
    let lastDraw = 0;
    let nextMeteor = performance.now() + range(3000, 8000);

    const fit = (canvas: HTMLCanvasElement, context: CanvasRenderingContext2D, ratio: number) => {
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    };

    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      width = staticCanvas.offsetWidth;
      height = staticCanvas.offsetHeight;
      fit(staticCanvas, staticCtx, ratio);
      fit(liveCanvas, ctx, ratio);
      drawStaticStars(staticCtx, width, height);
      stars = createTwinkleStars(width, height);
      if (!animate) drawFrame(ctx, stars, meteors, width, height, 0);
    };

    const tick = (now: number) => {
      frame = requestAnimationFrame(tick);
      if (now - lastDraw < 33) return;
      lastDraw = now;
      if (now >= nextMeteor) {
        // 从画面上半部分的某处出发，向左下或右下斜着划过
        const angle = range(0.35, 0.6) * (Math.random() < 0.5 ? 1 : -1);
        const speed = range(0.6, 1);
        meteors.push({
          x: range(width * 0.15, width * 0.85),
          y: range(0, height * 0.4),
          vx: Math.sin(angle) * speed,
          vy: Math.cos(angle) * speed,
          length: range(90, 170),
          start: now,
          duration: range(700, 1100),
        });
        nextMeteor = now + range(8000, 15000);
      }
      drawFrame(ctx, stars, meteors, width, height, now);
    };

    resize();
    if (animate) frame = requestAnimationFrame(tick);
    window.addEventListener('resize', resize);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <div aria-hidden="true" className="-z-99 fixed inset-0 bg-[linear-gradient(180deg,#0c1220_0%,#111827_45%,#141a22_100%)] overflow-hidden pointer-events-none">
      {/* 银河：一条很淡的斜向光带，左下到右上 */}
      <div className="top-1/2 left-1/2 absolute bg-[radial-gradient(closest-side,rgb(150_170_255/0.10),rgb(120_110_220/0.05)_55%,transparent)] w-[160vmax] h-[38vmax] -translate-x-1/2 -translate-y-1/2 -rotate-[28deg]" />
      <div className="top-[45%] left-[58%] absolute bg-[radial-gradient(closest-side,rgb(180_200_255/0.07),transparent)] w-[70vmax] h-[14vmax] -translate-x-1/2 -translate-y-1/2 -rotate-[28deg]" />
      <canvas ref={staticRef} className="absolute inset-0 w-full h-full" />
      <canvas ref={liveRef} id="ambient-canvas" className="absolute inset-0 w-full h-full" />
    </div>
  );
}
