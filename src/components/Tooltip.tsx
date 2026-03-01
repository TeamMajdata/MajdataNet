/**
 * Tooltip 通用组件 - 基于 Radix UI
 */

import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import type { ReactNode } from 'react';

export const TooltipProvider = TooltipPrimitive.Provider;

interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  side?: 'top' | 'bottom' | 'left' | 'right';
  sideOffset?: number;
  /** plain=true 时不添加默认样式，适用于内容本身已有完整样式的场景 */
  plain?: boolean;
}

export default function Tooltip({
  content,
  children,
  side = 'top',
  sideOffset = 6,
  plain = false,
}: TooltipProps) {
  return (
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          className={
            plain
              ? 'z-9999'
              : 'bg-black/85 backdrop-blur-sm px-3 py-1.5 rounded-lg text-white text-sm shadow-lg animate-tooltip z-9999'
          }
          side={side}
          sideOffset={sideOffset}
        >
          {content}
          {!plain && <TooltipPrimitive.Arrow className="fill-black/85" />}
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}
