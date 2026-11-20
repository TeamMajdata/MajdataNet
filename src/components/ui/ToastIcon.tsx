import type { IconProps } from 'react-toastify';
import { LuCircleAlert, LuCheck, LuInfo, LuLoaderCircle, LuTriangleAlert } from 'react-icons/lu';

const TONES = {
  success: { Icon: LuCheck, className: 'bg-emerald-400/15 text-emerald-300' },
  error: { Icon: LuCircleAlert, className: 'bg-red-400/15 text-red-300' },
  info: { Icon: LuInfo, className: 'bg-blue-400/15 text-blue-300' },
  warning: { Icon: LuTriangleAlert, className: 'bg-amber-400/15 text-amber-300' },
} as const;

/** 通知左侧的图标：浅色底的小圆点 */
export default function ToastIcon({ type, isLoading }: IconProps) {
  if (isLoading) {
    return (
      <span className="place-items-center grid bg-blue-400/15 rounded-full w-6 h-6 text-blue-300">
        <LuLoaderCircle aria-hidden="true" className="w-3.5 h-3.5 animate-spin" />
      </span>
    );
  }
  const tone = TONES[type as keyof typeof TONES];
  if (!tone) return null;
  const { Icon, className } = tone;
  return (
    <span className={`place-items-center grid rounded-full w-6 h-6 ${className}`}>
      <Icon aria-hidden="true" className="w-3.5 h-3.5" strokeWidth={2.5} />
    </span>
  );
}
