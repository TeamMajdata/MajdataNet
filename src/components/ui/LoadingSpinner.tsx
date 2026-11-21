import { useState } from 'react';

interface LoadingSpinnerProps {
  className?: string; // Additional classes for the spinner container
  size?: number | string; // Size of the spinner (e.g. 24 or "1.5rem")
}

/** 转一圈的时长 */
const SPIN_MS = 800;

/**
 * 转圈加载。用 CSS 动画（不占 JS），并按当前时间设置起始角度：
 * 一个加载界面换成另一个时（例如路由加载 → 页面自己的加载），转圈接着转，不会从头开始。
 */
export default function LoadingSpinner({ className = "", size = 48 }: LoadingSpinnerProps) {
  const spinnerSize = typeof size === 'number' ? `${size}px` : size;
  const [phase] = useState(() => -(performance.now() % SPIN_MS));

  return (
    <div
      className={`border-[3px] border-white/20 border-t-white border-solid rounded-full animate-spin ${className}`}
      style={{ width: spinnerSize, height: spinnerSize, animationDuration: `${SPIN_MS}ms`, animationDelay: `${phase}ms` }}
    />
  );
}
