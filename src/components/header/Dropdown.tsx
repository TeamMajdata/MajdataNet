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
  desktop: {
    position: "fixed left-0 top-0 bottom-0 z-1001",
    open: "translate-x-0",
    closed: "-translate-x-full",
    base: "bg-[#5C8DC1] !w-64 h-full transition-transform duration-300 ease-out flex flex-col items-center justify-center",
  },
  mobile: {
    position: "absolute right-0 top-full mt-2 z-1001",
    open: "opacity-100 scale-100",
    closed: "opacity-0 scale-95",
    base: "bg-white shadow-lg border border-gray-200 rounded-xl min-w-48 transition-all duration-200 ease-out origin-bottom-right",
  },
  user: {
    position: "absolute right-0 bottom-full mb-2 z-1001",
    open: "opacity-100 scale-100",
    closed: "opacity-0 scale-95",
    base: "bg-white shadow-lg border border-gray-200 rounded-xl min-w-48 transition-all duration-200 ease-out origin-bottom-left",
  },
};

function getStyle(variant: string, isDesktop: boolean): VariantStyle {
  if (variant === "user") {
    return isDesktop ? variantStyles.user : variantStyles.mobile;
  }
  return variantStyles[variant] || variantStyles.mobile;
}

/**
 * 通用下拉菜单组件
 * 桌面端显示为侧边滑出面板，移动端为弹出菜单
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
      const timer = setTimeout(() => setRender(false), 300);
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
      {resolved === "desktop" && (
        <svg
          className="absolute -right-20 top-0 h-full pointer-events-none"
          viewBox="0 0 100 1024"
          preserveAspectRatio="none"
          width="80"
        >
          <path d="M0 0L99.5 1024L0 1024L0 0Z" fill="#5C8DC1" opacity="1" />
        </svg>
      )}
      {children}
    </div>
  );
}
