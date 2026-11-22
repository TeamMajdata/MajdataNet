import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { LuSearch } from 'react-icons/lu';
import SearchBox from '@/components/search/SearchBox';

/**
 * 顶栏的搜索按钮：点开在顶栏下面弹出搜索框（和首页、搜索页同一个 SearchBox，带联想），
 * 回车或选中联想进入搜索页。点外面、按 Esc、换页都会收起。
 */
export default function HeaderSearch() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // 换页就收起（包括搜索后跳到搜索页）
  const [lastPath, setLastPath] = useState(location.pathname + location.search);
  if (lastPath !== location.pathname + location.search) {
    setLastPath(location.pathname + location.search);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const label = t('search/SearchPage.Title');
  return (
    <div ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-label={label}
        title={label}
        className={`grid place-items-center border rounded-xl w-10 md:w-9 h-10 md:h-9 text-white/75 hover:text-white transition-colors duration-150 cursor-pointer touch-manipulation ${
          open ? 'bg-white/10 border-white/20 text-white' : 'border-transparent hover:bg-white/[0.06]'
        }`}
      >
        <LuSearch aria-hidden="true" className="w-[18px] h-[18px]" />
      </button>
      {open && (
        // 手机上左右各留 12px 铺满；电脑上靠右、最宽 36rem
        <div className="top-[calc(var(--header-height)+env(safe-area-inset-top)+0.5rem)] right-3 md:right-4 left-3 md:left-auto z-1001 fixed md:w-[min(36rem,calc(100vw-2rem))]">
          <SearchBox
            value=""
            autoFocus
            onSubmit={(value) => {
              setOpen(false);
              navigate(value ? '/search?search=' + encodeURIComponent(value) : '/search');
            }}
          />
        </div>
      )}
    </div>
  );
}
