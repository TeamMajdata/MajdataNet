import { useLayoutEffect, useRef, type ReactNode } from 'react';
import '@/styles/components/marquee.css';

const GAP_PX = 32;
const SPEED_PX_PER_SECOND = 40;
/** 每轮开始前在起点停多久（悬停后开始滚动前也是这么久） */
const PAUSE_SECONDS = 1;

/**
 * 单行文字：平时超出部分显示省略号；
 * 祖先元素带 `marquee-host` 类并被悬停时，只有真的被截断的文字才向左循环滚动显示全文。
 */
export default function MarqueeText({ children, className = '' }: { children: ReactNode; className?: string }) {
  const outerRef = useRef<HTMLSpanElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const outer = outerRef.current;
    const text = textRef.current;
    if (!outer || !text) return;

    // 量第一份文字自身的宽度；悬停时副本出现也不影响结果
    const measure = () => {
      const width = text.getBoundingClientRect().width;
      if (width - outer.clientWidth > 1) {
        const distance = Math.ceil(width + GAP_PX);
        outer.dataset.overflow = '';
        outer.style.setProperty('--marquee-gap', `${GAP_PX}px`);
        outer.style.setProperty('--marquee-shift', `-${distance}px`);
        // 起点停顿固定约 1 秒，不随文字长短变化：停顿占比取最接近的 5% 档（对应 marquee.css 里的关键帧），
        // 再按这个占比反推总时长，让滚动段保持约 40px/s
        const scrollSeconds = Math.max(1.5, distance / SPEED_PX_PER_SECOND);
        const holdPercent = Math.min(50, Math.max(5, Math.round((PAUSE_SECONDS / (scrollSeconds + PAUSE_SECONDS)) * 20) * 5));
        outer.style.setProperty('--marquee-name', `marquee-loop-${holdPercent}`);
        outer.style.setProperty('--marquee-duration', `${(scrollSeconds / (1 - holdPercent / 100)).toFixed(2)}s`);
      } else {
        delete outer.dataset.overflow;
      }
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(outer);
    // Web 字体加载完成后宽度会变
    void document.fonts?.ready.then(measure);
    return () => observer.disconnect();
  }, [children]);

  return (
    <span ref={outerRef} className={`marquee ${className}`}>
      <span className="marquee-track">
        <span ref={textRef}>{children}</span>
        {/* 循环滚动用的副本：读屏和键盘都跳过 */}
        <span className="marquee-copy" aria-hidden="true" inert>{children}</span>
      </span>
    </span>
  );
}
