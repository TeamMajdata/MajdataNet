import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { LuSearch, LuX } from 'react-icons/lu';
import SearchBox from '@/components/search/SearchBox';
import { MOBILE_ICON_BUTTON } from './styles';

/**
 * 顶栏的搜索按钮（和首页、搜索页同一个 SearchBox，带联想）：
 * - 电脑上（inline）：顶栏里常驻一个输入框，不需要先点按钮；
 * - 手机上：顶栏太窄，搜索框直接盖住整条顶栏，右边是关闭按钮。
 * 回车或选中联想进入搜索页。点外面、按 Esc、换页都会收起。
 */
export default function HeaderSearch({ inline = false }: { inline?: boolean }) {
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
  const submit = (value: string) => {
    setOpen(false);
    navigate(value ? '/search?search=' + encodeURIComponent(value) : '/search');
  };
  if (inline) {
    // 和顶栏按钮一样高（36px）；宽度随窗口变
    return (
      <div className="w-56 lg:w-64 xl:w-72 [&_input]:h-9">
        <SearchBox value="" onSubmit={submit} />
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-label={label}
        title={label}
        className={`grid place-items-center border rounded-xl w-10 md:w-9 h-10 md:h-9 text-white/75 hover:text-white transition-colors duration-150 cursor-pointer touch-manipulation ${
          open ? 'bg-white/10 border-white/20 text-white' : 'border-transparent hover:bg-white/[0.06]'
        } ${MOBILE_ICON_BUTTON}`}
      >
        <LuSearch aria-hidden="true" className="w-[18px] h-[18px]" />
      </button>
      {open && (
        // 盖住整条顶栏：和顶栏一样高、一样的底色
        <div className="top-0 right-0 left-0 z-1001 fixed bg-[rgb(9_11_17/96%)] backdrop-blur-xl pt-[env(safe-area-inset-top)] border-white/[0.07] border-b">
          {/* 搜索框不铺满整条顶栏：最宽 36rem，居中，关闭按钮紧挨在右边；手机上自然占满 */}
          <div className="flex justify-center items-center gap-2 mx-auto px-3 sm:px-4 max-w-[calc(36rem+3.5rem)] h-(--header-height)">
            <SearchBox value="" autoFocus onSubmit={submit} />
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label={t('shared/header.CloseSearch')}
              title={t('shared/header.CloseSearch')}
              className="grid place-items-center hover:bg-white/[0.06] rounded-xl w-10 h-10 text-white/75 hover:text-white transition-colors cursor-pointer shrink-0"
            >
              <LuX aria-hidden="true" className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
