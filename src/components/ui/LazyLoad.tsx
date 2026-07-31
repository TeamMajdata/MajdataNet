/**
 * 使用 Intersection Observer 实现懒加载
 */

import { useEffect, useRef, useState, type ReactNode } from 'react';

interface LazyLoadProps {
  children: ReactNode;
  height?: number;
  width?: number;
  offset?: number;
  className?: string;
}

export default function LazyLoad({ 
  children, 
  height, 
  width, 
  offset = 100,
  className = ''
}: LazyLoadProps) {
  const [isVisible, setIsVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: `${offset}px`,
      }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [offset]);

  const style: React.CSSProperties = {
    minHeight: height ? `${height}px` : undefined,
    width: '100%',
    maxWidth: width ? `${width}px` : undefined,
    minWidth: 0,
  };

  return (
    <div ref={containerRef} style={style} className={className}>
      {isVisible ? children : null}
    </div>
  );
}
