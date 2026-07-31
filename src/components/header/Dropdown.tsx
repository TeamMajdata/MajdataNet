import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';

interface DropdownProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  position?: 'left' | 'right';
  className?: string;
  containerRef?: React.RefObject<HTMLElement | null>;
}

/**
 * 通用下拉菜单组件
 * 处理点击外部关闭逻辑，无动效
 */
export default function Dropdown({ isOpen, onClose, children, position = 'left', className = '', containerRef }: DropdownProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      const isOutsideMenu = menuRef.current && !menuRef.current.contains(target);
      const isOutsideContainer = !containerRef?.current || !containerRef.current.contains(target);
      
      // 只有当点击既在菜单外部，又在容器外部时才关闭
      if (isOutsideMenu && isOutsideContainer) {
        onClose();
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose, containerRef]);

  if (!isOpen) return null;

  const positionClass = position === 'right' ? 'right-0' : 'left-0';

  return (
    <div 
      ref={menuRef}
      className={`top-[calc(100%+0.5rem)] md:top-[calc(100%+0.75rem)] z-1001 absolute bg-linear-to-br from-[rgb(15_15_20/95%)] to-[rgb(10_12_18/98%)] shadow-[0_20px_60px_rgb(0_0_0/50%),0_4px_20px_rgb(59_130_246/10%),0_1px_0_rgb(255_255_255/10%)_inset] backdrop-blur-xl saturate-180 border border-white/15 rounded-2xl min-w-50 max-w-[calc(100vw-1.5rem)] max-h-[calc(100dvh-5rem)] overflow-y-auto overscroll-contain ${positionClass} ${className}`}
    >
      {children}
    </div>
  );
}
