import { useEffect, useRef } from 'react';

/**
 * 背景下半屏的粒子：几十个小亮点和少量柔焦光斑，颜色和极光一致，缓慢上浮、轻轻闪烁；
 * 主要分布在下半屏，越往上越淡，不和上方的极光叠在一起。
 *
 * 性能：贴图预渲染，每帧只做 drawImage；限制 30fps；手机上数量减半；
 * 页面在后台时 requestAnimationFrame 自动暂停；“减少动态效果”时不显示。
 */

const COLORS = ['#7cc4ff', '#8aa8ff', '#67e8f9', '#b4a5ff', '#e0f2fe'];

interface Particle {
  sprite: HTMLCanvasElement;
  size: number;
  x: number;
  y: number;
  speed: number;
  sway: number;
  phase: number;
  alpha: number;
  twinkle: number;
  rate: number;
}

const range = (min: number, max: number) => min + (max - min) * Math.random();
const pick = <T,>(items: T[]) => items[Math.floor(Math.random() * items.length)];

/** 柔光圆点：core 是实心部分占的比例，越小越像失焦的光斑 */
function makeSprite(color: string, radius: number, core: number) {
  const size = Math.ceil(radius * 2);
  const sprite = document.createElement('canvas');
  sprite.width = sprite.height = size;
  const ctx = sprite.getContext('2d')!;
  const glow = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  glow.addColorStop(0, color);
  glow.addColorStop(core, color);
  glow.addColorStop(Math.min(1, core + 0.25), color + '55');
  glow.addColorStop(1, color + '00');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, size, size);
  return sprite;
}

/** 起始高度偏向下半屏 */
const lowerHalfY = (height: number) => height * (0.35 + 0.65 * Math.sqrt(Math.random()));

function createParticles(width: number, height: number): Particle[] {
  const mobile = width <= 768;
  const sprites = new Map<string, HTMLCanvasElement>();
  const sprite = (color: string, radius: number, core: number) => {
    const key = `${color}|${radius}|${core}`;
    if (!sprites.has(key)) sprites.set(key, makeSprite(color, radius, core));
    return sprites.get(key)!;
  };
  const particles: Particle[] = [];
  const add = (count: number, make: () => Omit<Particle, 'x' | 'y' | 'phase'>) => {
    for (let i = 0; i < count; i++) {
      particles.push({ ...make(), x: range(0, width), y: lowerHalfY(height), phase: range(0, Math.PI * 2) });
    }
  };
  // 小亮点
  add(mobile ? 22 : 45, () => {
    const s = sprite(pick(COLORS), Math.round(range(3, 6)), 0.18);
    return { sprite: s, size: s.width, speed: range(6, 16), sway: range(6, 20), alpha: range(0.35, 0.75), twinkle: range(0.15, 0.3), rate: range(0.5, 1.4) };
  });
  // 少量柔焦光斑
  add(mobile ? 4 : 8, () => {
    const s = sprite(pick(COLORS), Math.round(range(18, 34)), 0.05);
    return { sprite: s, size: s.width, speed: range(3, 8), sway: range(10, 30), alpha: range(0.12, 0.22), twinkle: range(0.04, 0.08), rate: range(0.2, 0.5) };
  });
  return particles;
}

export default function AmbientParticles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let particles: Particle[] = [];
    let frame = 0;
    let lastDraw = 0;

    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      width = canvas.offsetWidth;
      height = canvas.offsetHeight;
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      particles = createParticles(width, height);
    };

    const tick = (now: number) => {
      frame = requestAnimationFrame(tick);
      if (now - lastDraw < 33) return;
      // 切回前台时 dt 可能很大，截断，免得一下跳很远
      const dt = Math.min(0.1, (now - (lastDraw || now)) / 1000);
      lastDraw = now;
      const seconds = now / 1000;
      ctx.clearRect(0, 0, width, height);
      ctx.globalCompositeOperation = 'lighter';
      for (const p of particles) {
        p.y -= p.speed * dt;
        // 飘到上方三分之一就从底部重新出现
        if (p.y < height * 0.3) {
          p.y = height + p.size;
          p.x = range(0, width);
        }
        // 越往上越淡：从 70% 高度开始到 30% 高度淡到 0
        const fade = Math.min(1, Math.max(0, (p.y - height * 0.3) / (height * 0.4)));
        const alpha = (p.alpha + Math.sin(seconds * p.rate + p.phase) * p.twinkle) * fade;
        if (alpha <= 0.01) continue;
        ctx.globalAlpha = Math.min(1, alpha);
        const x = p.x + Math.sin(seconds * 0.25 + p.phase) * p.sway;
        ctx.drawImage(p.sprite, x - p.size / 2, p.y - p.size / 2);
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    };

    resize();
    frame = requestAnimationFrame(tick);
    window.addEventListener('resize', resize);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />;
}
