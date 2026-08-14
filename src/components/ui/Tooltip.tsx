/**
 * Tooltip 通用组件 - 基于 Radix UI
 */

import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { type ReactNode, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export const TooltipProvider = TooltipPrimitive.Provider;

interface TooltipProps extends TooltipPrimitive.TooltipProps {
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
  ...props
}: TooltipProps) {
  const [open, setOpen] = useState(false);

  return (
    <TooltipPrimitive.Root
      open={open}
      onOpenChange={setOpen}
      delayDuration={0}
      {...props}
    >
      <TooltipPrimitive.Trigger
        asChild
        onClick={() => {
          setOpen(prev => !prev);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
      >
        {children}
      </TooltipPrimitive.Trigger>
      <AnimatePresence>
        {open && (
          <TooltipPrimitive.Portal forceMount>
            <TooltipPrimitive.Content
              asChild
              side={side}
              sideOffset={sideOffset}
            >
              <motion.div
                initial={{ opacity: 0, y: 4, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 4, scale: 0.95 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
                className={
                  plain
                    ? 'z-9999 origin-(--radix-tooltip-content-transform-origin)'
                    : 'bg-ink px-3 py-1.5 rounded-lg text-white text-sm z-9999 origin-(--radix-tooltip-content-transform-origin dark:bg-surface dark:text-ink dark:border dark:border-line'
                }
              >
                {content}
                {!plain && <TooltipPrimitive.Arrow className="fill-ink dark:fill-surface" />}
              </motion.div>
            </TooltipPrimitive.Content>
          </TooltipPrimitive.Portal>
        )}
      </AnimatePresence>
    </TooltipPrimitive.Root>
  );
}
