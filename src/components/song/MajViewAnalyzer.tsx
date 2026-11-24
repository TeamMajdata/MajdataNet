import { useEffect, useRef } from 'react';
import { ANALYZER_COLORS } from '@/majview/analyzer.js';

type Bar = { tap: number; slide: number; touch: number };
type Layer = 'touch' | 'slide' | 'tap';

// Bottom to top, as in ChartAnalyzer.DrawGraph.
const LAYERS: Layer[] = ['touch', 'slide', 'tap'];

/** Rounds both ends of the whole bar, not each colored slice. */
function capsule(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number) {
  const radius = Math.min(width / 2, height / 2);
  context.beginPath();
  if (typeof context.roundRect === 'function') {
    context.roundRect(x, y, width, height, radius);
    return;
  }
  context.moveTo(x + radius, y);
  context.arcTo(x + width, y, x + width, y + height, radius);
  context.arcTo(x + width, y + height, x, y + height, radius);
  context.arcTo(x, y + height, x, y, radius);
  context.arcTo(x, y, x + width, y, radius);
  context.closePath();
}

/** Note density above the seek bar, drawn like MajdataPlay's ChartAnalyzer. */
export default function MajViewAnalyzer({ bars, height = 44 }: { bars: Bar[]; height?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const draw = () => {
      const width = canvas.clientWidth;
      if (!width) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      const context = canvas.getContext('2d');
      if (!context) return;

      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      context.clearRect(0, 0, width, height);
      const step = width / bars.length;
      const barWidth = step * 0.72;

      bars.forEach((bar, index) => {
        const total = (bar.tap + bar.slide + bar.touch) * height;
        if (total <= 0) return;
        const x = (index + 0.5) * step - barWidth / 2;
        // Clip to the capsule of the whole bar: the two ends stay semicircular whatever the
        // slices are, and a color boundary is a plain straight edge.
        context.save();
        capsule(context, x, height - total, barWidth, total);
        context.clip();
        let y = height;
        for (const layer of LAYERS) {
          const slice = bar[layer] * height;
          if (slice <= 0) continue;
          // Overlap the slice below by a hair so no background shows between two colors.
          context.fillStyle = ANALYZER_COLORS[layer];
          context.fillRect(x, y - slice, barWidth, slice + 0.5);
          y -= slice;
        }
        context.restore();
      });
    };

    draw();
    const observer = new ResizeObserver(draw);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [bars, height]);

  return <canvas ref={canvasRef} className="majview-analyzer" style={{ height }} aria-hidden="true" />;
}
