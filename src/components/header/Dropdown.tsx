import { useEffect, useRef } from "react";
import type { ReactNode } from "react";

interface DropdownProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  position?: "left" | "right";
  className?: string;
  containerRef?: React.RefObject<HTMLElement | null>;
}

/**
 * 通用下拉菜单组件
 * 处理点击外部关闭逻辑，无动效
 */
export default function Dropdown({
  isOpen,
  onClose,
  children,
  position = "left",
  className = "",
  containerRef,
}: DropdownProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      const isOutsideMenu =
        menuRef.current && !menuRef.current.contains(target);
      const isOutsideContainer =
        containerRef?.current && !containerRef.current.contains(target);

      // 只有当点击既在菜单外部，又在容器外部时才关闭
      if (isOutsideMenu && isOutsideContainer) {
        onClose();
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onClose, containerRef]);

  if (!isOpen) return null;

  const positionClass = position === "right" ? "right-0" : "left-0";

  return (
    <div
      ref={menuRef}
      className={`top-[calc(100%+0.75rem)] z-1001 absolute bg-linear-to-br from-[rgb(255_255_255/98%)] to-[rgb(248_248_254/98%)] shadow-[0_20px_60px_rgb(0_0_0/12%),0_4px_20px_rgb(92_141_193/15%),0_1px_0_rgb(0_0_0/5%)_inset] backdrop-blur-xl saturate-180 border border-black/8 rounded-2xl min-w-50 overflow-hidden ${positionClass} ${className}`}
    >
      {children}
    </div>
  );
}
