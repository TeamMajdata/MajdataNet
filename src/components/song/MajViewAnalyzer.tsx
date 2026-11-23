import { useEffect, useRef } from 'react';
import { ANALYZER_COLORS } from '@/majview/analyzer.js';

type Bar = { tap: number; slide: number; touch: number };
type Layer = 'touch' | 'slide' | 'tap';

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
      const radius = barWidth / 2;

      bars.forEach((bar, index) => {
        const x = (index + 0.5) * step - barWidth / 2;
        let y = height;
        // Touch sits on the bottom, slide above it and tap on top, as in ChartAnalyzer.DrawGraph.
        for (const layer of ['touch', 'slide', 'tap'] as Layer[]) {
          const barHeight = bar[layer] * height;
          if (barHeight <= 0) continue;
          y -= barHeight;
          context.fillStyle = ANALYZER_COLORS[layer];
          context.beginPath();
          if (typeof context.roundRect === 'function') {
            context.roundRect(x, y, barWidth, barHeight, Math.min(radius, barHeight / 2));
          } else {
            context.rect(x, y, barWidth, barHeight);
          }
          context.fill();
        }
      });
    };

    draw();
    const observer = new ResizeObserver(draw);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [bars, height]);

  return <canvas ref={canvasRef} className="majview-analyzer" style={{ height }} aria-hidden="true" />;
}
