import { useEffect, useRef } from 'react';

/**
 * 全站背景：深色渐变 + 三团缓慢漂移的蓝 / 青 / 紫色光晕（纯 CSS，交给 GPU 合成）
 * + 一层 canvas：细小的亮点缓慢上浮、轻轻闪烁，偶尔从某处扩散出一圈淡淡的圆环（判定圈的意象）。
 *
 * 性能：粒子贴图预渲染，每帧只做 drawImage；限制 30fps；手机上粒子减半；
 * 页面在后台时 requestAnimationFrame 自动暂停；“减少动态效果”时只留静态渐变和光晕。
 */

/** 和站点主色一致的几种亮色 */
const COLORS = ['#7cc4ff', '#60a5fa', '#67e8f9', '#a5b4fc', '#e0f2fe'];

interface Dot {
  sprite: HTMLCanvasElement;
  size: number;
  x: number;
  y: number;
  /** 每秒上浮的像素数 */
  speed: number;
  /** 左右摆动的幅度和相位 */
  sway: number;
  phase: number;
  /** 闪烁：基础亮度、幅度、频率 */
  alpha: number;
  twinkle: number;
  rate: number;
}

interface Ring {
  x: number;
  y: number;
  start: number;
  duration: number;
  maxRadius: number;
  color: string;
}

const range = (min: number, max: number) => min + (max - min) * Math.random();
const pick = <T,>(items: T[]) => items[Math.floor(Math.random() * items.length)];

/** 一个带柔光的小圆点贴图：中心实心，外圈渐隐 */
function makeSprite(color: string, radius: number) {
  const size = Math.ceil(radius * 6);
  const sprite = document.createElement('canvas');
  sprite.width = sprite.height = size;
  const ctx = sprite.getContext('2d')!;
  const c = size / 2;
  const glow = ctx.createRadialGradient(c, c, 0, c, c, c);
  glow.addColorStop(0, color);
  glow.addColorStop(radius / c, color);
  glow.addColorStop(Math.min(1, (radius * 1.6) / c), color + '40');
  glow.addColorStop(1, color + '00');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, size, size);
  return sprite;
}

function createDots(width: number, height: number): Dot[] {
  const count = Math.round((width <= 768 ? 35 : 70) * Math.min(1.4, Math.max(0.6, (width * height) / (1440 * 900))));
  const sprites = new Map<string, HTMLCanvasElement>();
  const dots: Dot[] = [];
  for (let i = 0; i < count; i++) {
    const color = pick(COLORS);
    // 大多数是很小的点，少数稍大
    const radius = Math.random() < 0.85 ? range(0.6, 1.4) : range(1.6, 2.4);
    const key = color + radius.toFixed(1);
    if (!sprites.has(key)) sprites.set(key, makeSprite(color, radius));
    const sprite = sprites.get(key)!;
    dots.push({
      sprite,
      size: sprite.width,
      x: range(0, width),
      y: range(0, height),
      speed: range(4, 14) * (radius > 1.5 ? 1.4 : 1),
      sway: range(4, 18),
      phase: range(0, Math.PI * 2),
      alpha: range(0.25, 0.7),
      twinkle: range(0.15, 0.35),
      rate: range(0.4, 1.4),
    });
  }
  return dots;
}

function drawFrame(ctx: CanvasRenderingContext2D, dots: Dot[], rings: Ring[], width: number, height: number, now: number, dt: number) {
  ctx.clearRect(0, 0, width, height);
  ctx.globalCompositeOperation = 'lighter';
  const seconds = now / 1000;

  for (const dot of dots) {
    dot.y -= dot.speed * dt;
    if (dot.y < -dot.size) {
      // 从底部重新出现
      dot.y = height + dot.size;
      dot.x = range(0, width);
    }
    const x = dot.x + Math.sin(seconds * 0.3 + dot.phase) * dot.sway;
    // 越靠近顶部越淡，避免和页头抢
    const fade = Math.min(1, dot.y / (height * 0.25));
    const alpha = (dot.alpha + Math.sin(seconds * dot.rate + dot.phase) * dot.twinkle) * fade;
    if (alpha <= 0.01) continue;
    ctx.globalAlpha = Math.min(1, alpha);
    ctx.drawImage(dot.sprite, x - dot.size / 2, dot.y - dot.size / 2);
  }

  ctx.globalCompositeOperation = 'source-over';
  for (let i = rings.length - 1; i >= 0; i--) {
    const ring = rings[i];
    const t = (now - ring.start) / ring.duration;
    if (t >= 1) {
      rings.splice(i, 1);
      continue;
    }
    // 先快后慢地扩散，同时淡出
    const eased = 1 - Math.pow(1 - t, 3);
    ctx.globalAlpha = 0.22 * (1 - t);
    ctx.strokeStyle = ring.color;
    ctx.lineWidth = 1.5 * (1 - t) + 0.5;
    ctx.beginPath();
    ctx.arc(ring.x, ring.y, ring.maxRadius * eased, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

export default function AmbientBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let dots: Dot[] = [];
    const rings: Ring[] = [];
    let frame = 0;
    let lastDraw = 0;
    let nextRing = performance.now() + 1500;

    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      width = canvas.offsetWidth;
      height = canvas.offsetHeight;
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      dots = createDots(width, height);
    };

    const tick = (now: number) => {
      frame = requestAnimationFrame(tick);
      // 动得很慢，30fps 足够
      if (now - lastDraw < 33) return;
      // 切回前台时 dt 可能很大，截断，免得粒子一下跳很远
      const dt = Math.min(0.1, (now - (lastDraw || now)) / 1000);
      lastDraw = now;
      if (now >= nextRing) {
        rings.push({
          x: range(width * 0.1, width * 0.9),
          y: range(height * 0.3, height * 0.95),
          start: now,
          duration: range(3500, 5500),
          maxRadius: range(80, 220),
          color: pick(COLORS),
        });
        nextRing = now + range(3500, 7000);
      }
      drawFrame(ctx, dots, rings, width, height, now, dt);
    };

    resize();
    frame = requestAnimationFrame(tick);
    window.addEventListener('resize', resize);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <div aria-hidden="true" className="-z-99 fixed inset-0 bg-[linear-gradient(180deg,#1b2330_0%,#161b22_55%,#121619_100%)] overflow-hidden pointer-events-none">
      {/* 三团很淡的光晕，几十秒一个来回地漂移 */}
      <div className="top-[-15%] left-[-10%] absolute bg-[radial-gradient(closest-side,rgb(59_130_246/0.22),transparent)] w-[60vmax] h-[60vmax] motion-safe:animate-[ambient-drift-a_48s_ease-in-out_infinite_alternate]" />
      <div className="top-[20%] right-[-20%] absolute bg-[radial-gradient(closest-side,rgb(34_211_238/0.12),transparent)] w-[55vmax] h-[55vmax] motion-safe:animate-[ambient-drift-b_60s_ease-in-out_infinite_alternate]" />
      <div className="bottom-[-25%] left-[20%] absolute bg-[radial-gradient(closest-side,rgb(139_92_246/0.14),transparent)] w-[65vmax] h-[65vmax] motion-safe:animate-[ambient-drift-c_72s_ease-in-out_infinite_alternate]" />
      <canvas ref={canvasRef} id="ambient-canvas" className="absolute inset-0 w-full h-full" />
    </div>
  );
}
