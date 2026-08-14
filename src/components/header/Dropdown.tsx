import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

interface DropdownProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  variant?: "desktop" | "mobile" | "user" | "auto";
  className?: string;
  containerRef?: React.RefObject<HTMLElement | null>;
}

const DESKTOP_BREAKPOINT = 1280;

type VariantStyle = {
  position: string;
  open: string;
  closed: string;
  base: string;
};

const variantStyles: Record<string, VariantStyle> = {
  // v4：桌面下拉统一为白底弹出面板
  desktop: {
    position: "absolute left-0 top-full mt-2 z-1001 w-full",
    open: "opacity-100 translate-y-0",
    closed: "opacity-0 -translate-y-1",
    base: "bg-surface shadow-card border border-line rounded-lg min-w-48 transition-all duration-150 ease-out origin-top",
  },
  mobile: {
    position: "absolute right-0 top-full mt-2 z-1001",
    open: "opacity-100 scale-100",
    closed: "opacity-0 scale-95",
    base: "bg-surface shadow-card border border-line rounded-lg min-w-48 transition-all duration-150 ease-out origin-top-right",
  },
  user: {
    position: "absolute right-0 top-full mt-2 z-1001",
    open: "opacity-100 scale-100",
    closed: "opacity-0 scale-95",
    base: "bg-surface shadow-card border border-line rounded-lg min-w-48 transition-all duration-150 ease-out origin-top-right",
  },
};

function getStyle(variant: string, isDesktop: boolean): VariantStyle {
  if (variant === "user") {
    return isDesktop ? variantStyles.user : variantStyles.mobile;
  }
  return variantStyles[variant] || variantStyles.mobile;
}

/**
 * 通用下拉菜单组件（v4：白底扁平面板，无毛玻璃 / 无滑出装饰）
 */
export default function Dropdown({
  isOpen,
  onClose,
  children,
  variant = "auto",
  className = "",
  containerRef,
}: DropdownProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [render, setRender] = useState(false);
  const [animateIn, setAnimateIn] = useState(false);
  const [isDesktop, setIsDesktop] = useState(
    typeof window !== "undefined" && window.innerWidth >= DESKTOP_BREAKPOINT,
  );

  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= DESKTOP_BREAKPOINT);
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setRender(true);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setAnimateIn(true));
      });
    } else {
      setAnimateIn(false);
      const timer = setTimeout(() => setRender(false), 200);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      const isOutsideMenu =
        menuRef.current && !menuRef.current.contains(target);
      const isOutsideContainer =
        containerRef?.current && !containerRef.current.contains(target);

      if (isOutsideMenu && isOutsideContainer) {
        onClose();
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onClose, containerRef]);

  if (!render) return null;

  const resolved =
    variant === "auto" ? (isDesktop ? "desktop" : "mobile") : variant;
  const style = getStyle(resolved, isDesktop);

  return (
    <div
      ref={menuRef}
      className={`${style.position} ${style.base} ${
        animateIn ? style.open : style.closed
      } ${className}`}
    >
      {children}
    </div>
  );
}
