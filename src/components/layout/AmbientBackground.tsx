import { useEffect, useRef } from 'react';

/**
 * 环境背景粒子动画（原生 canvas 实现）
 *
 * 之前依赖 CDN 上的 EaselJS + GSAP 2 并对每个粒子套 BlurFilter；
 * 这里把每类粒子预渲染成一张带柔边的小贴图，每帧只做 drawImage，
 * 不再加载任何第三方脚本。视觉参数（数量、大小、颜色、透明度、运动范围）与原版一致。
 */

interface ParticleKind {
  count: number;
  radius: number;
  alphaMax: number;
  /** 粒子集中分布的竖向区域占比（1 = 全屏，0.5 = 中间一半） */
  areaHeight: number;
  color: string;
  fill: boolean;
}

const PARTICLE_KINDS: ParticleKind[] = [
  { count: 100, radius: 3,  alphaMax: 0.4, areaHeight: 0.5, color: '#0cdbf3', fill: false },
  { count: 50,  radius: 15, alphaMax: 0.3, areaHeight: 1,   color: '#6fd2f3', fill: true  },
  { count: 30,  radius: 30, alphaMax: 0.2, areaHeight: 1,   color: '#93e9f3', fill: true  },
];

interface Particle {
  sprite: HTMLCanvasElement;
  spriteSize: number;
  alphaMax: number;
  areaHeight: number;
  distance: number;
  /** 锚点：粒子在其附近漂移 */
  anchorX: number;
  anchorY: number;
  /** 位置/缩放的当前一段补间 */
  fromX: number; fromY: number; fromScale: number;
  toX: number;   toY: number;   toScale: number;
  moveStart: number;
  moveDuration: number;
  /** 透明度补间：前半段升到 peak，后半段降到 0 */
  alphaPeak: number;
  alphaStart: number;
  alphaDuration: number;
}

const range = (min: number, max: number) => min + (max - min) * Math.random();
const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOutQuad = (t: number) => 1 - (1 - t) * (1 - t);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** 大概率落在屏幕中间一带，小概率落在任意位置（与原版 weightedRange 等价） */
function weightedPosition(total: number, areaHeight: number, strength: number) {
  if (Math.random() <= strength) {
    const lo = total * (2 - areaHeight / 2) / 4;
    const hi = total * (2 + areaHeight / 2) / 4;
    return range(lo, hi);
  }
  return range(0, total);
}

function makeSprite(kind: ParticleKind): { sprite: HTMLCanvasElement; size: number } {
  const padding = kind.fill ? kind.radius : 2;
  const size = Math.ceil((kind.radius + padding) * 2);
  const sprite = document.createElement('canvas');
  sprite.width = sprite.height = size;
  const ctx = sprite.getContext('2d')!;
  const c = size / 2;
  if (kind.fill) {
    // 径向渐变模拟原来的高斯模糊，比每帧 filter: blur 便宜得多
    const gradient = ctx.createRadialGradient(c, c, 0, c, c, kind.radius + padding);
    gradient.addColorStop(0, kind.color);
    gradient.addColorStop(0.55, kind.color);
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
  } else {
    ctx.strokeStyle = kind.color;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(c, c, kind.radius, 0, Math.PI * 2);
    ctx.stroke();
  }
  return { sprite, size };
}

function scheduleMove(p: Particle, now: number, first: boolean) {
  p.fromX = first ? p.anchorX : p.toX;
  p.fromY = first ? p.anchorY : p.toY;
  p.fromScale = first ? range(0.3, 1) : p.toScale;
  p.toX = range(p.anchorX - p.distance, p.anchorX + p.distance);
  p.toY = range(p.anchorY - p.distance, p.anchorY + p.distance);
  p.toScale = range(0.3, 1);
  p.moveStart = now;
  p.moveDuration = (first ? range(1, 3) : range(2, 10)) * 1000;
}

function scheduleAlpha(p: Particle, now: number, duration: number) {
  p.alphaPeak = range(0.1, p.alphaMax);
  p.alphaStart = now;
  p.alphaDuration = duration;
}

function createParticles(width: number, height: number): Particle[] {
  // 小屏（手机）粒子减半：全屏 canvas 动画在移动端相当耗电
  const density = width <= 768 ? 0.5 : 1;
  const now = performance.now();
  const particles: Particle[] = [];
  for (const kind of PARTICLE_KINDS) {
    const { sprite, size } = makeSprite(kind);
    for (let i = 0; i < Math.round(kind.count * density); i++) {
      const p: Particle = {
        sprite,
        spriteSize: size,
        alphaMax: kind.alphaMax,
        areaHeight: kind.areaHeight,
        distance: kind.radius * 2,
        anchorX: weightedPosition(width, 1, 0.6),
        anchorY: weightedPosition(height, kind.areaHeight, 0.8),
        fromX: 0, fromY: 0, fromScale: 1,
        toX: 0, toY: 0, toScale: 1,
        moveStart: now, moveDuration: 1,
        alphaPeak: 0, alphaStart: now, alphaDuration: 1,
      };
      scheduleMove(p, now, true);
      scheduleAlpha(p, now, p.moveDuration);
      particles.push(p);
    }
  }
  return particles;
}

function drawFrame(ctx: CanvasRenderingContext2D, particles: Particle[], width: number, height: number, now: number) {
  ctx.clearRect(0, 0, width, height);
  ctx.globalCompositeOperation = 'lighter';
  for (const p of particles) {
    let t = (now - p.moveStart) / p.moveDuration;
    if (t >= 1) {
      scheduleMove(p, now, false);
      t = 0;
    }
    const e = easeInOutCubic(t);
    const x = lerp(p.fromX, p.toX, e);
    const y = lerp(p.fromY, p.toY, e);
    const scale = lerp(p.fromScale, p.toScale, e);

    let at = (now - p.alphaStart) / p.alphaDuration;
    if (at >= 1) {
      scheduleAlpha(p, now, p.moveDuration);
      at = 0;
    }
    const alpha = at < 0.5
      ? p.alphaPeak * easeOutQuad(at * 2)
      : p.alphaPeak * (1 - easeOutQuad((at - 0.5) * 2));
    if (alpha <= 0.002) continue;

    const size = p.spriteSize * scale;
    ctx.globalAlpha = alpha;
    ctx.drawImage(p.sprite, x - size / 2, y - size / 2, size, size);
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
}

export default function AmbientBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // 用户开启了“减少动态效果”时只保留 CSS 渐变背景
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let particles: Particle[] = [];
    let frame = 0;
    let lastDraw = 0;

    const resize = () => {
      width = canvas.width = canvas.offsetWidth;
      height = canvas.height = canvas.offsetHeight;
      particles = createParticles(width, height);
    };

    const tick = (now: number) => {
      frame = requestAnimationFrame(tick);
      // 手机端限制到约 30fps
      if (width <= 768 && now - lastDraw < 30) return;
      lastDraw = now;
      drawFrame(ctx, particles, width, height, now);
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
    <canvas
      ref={canvasRef}
      id="ambient-canvas"
      aria-hidden="true"
      className="top-0 left-0 -z-99 fixed bg-[linear-gradient(0deg,#191d1e_50%,#283139_100%)] bg-fixed w-full h-full"
    />
  );
}
