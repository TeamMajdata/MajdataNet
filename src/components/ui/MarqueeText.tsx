import { useLayoutEffect, useRef, type ReactNode } from 'react';
import '@/styles/components/marquee.css';

/**
 * 单行文字：平时超出部分显示省略号；
 * 祖先元素带 `marquee-host` 类并被悬停时，只有真的被截断的文字才来回滚动显示全文。
 */
export default function MarqueeText({ children, className = '' }: { children: ReactNode; className?: string }) {
  const outerRef = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const outer = outerRef.current;
    if (!outer) return;

    // 内层平时是 inline（省略号才能生效），宽度从外层的 scrollWidth 读
    const measure = () => {
      const overflow = Math.ceil(outer.scrollWidth - outer.clientWidth);
      if (overflow > 1) {
        outer.dataset.overflow = '';
        outer.style.setProperty('--marquee-shift', `-${overflow}px`);
        // 约 40px/s，最短 2.5s，长文字不会滚得太快
        outer.style.setProperty('--marquee-duration', `${Math.max(2.5, overflow / 40)}s`);
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
      <span className="marquee-inner">{children}</span>
    </span>
  );
}
