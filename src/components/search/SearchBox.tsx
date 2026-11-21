import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import useSWR from 'swr';
import { motion, AnimatePresence } from 'framer-motion';
import { useDebouncedCallback } from 'use-debounce';
import { LuSearch, LuX } from 'react-icons/lu';
import { buildSuggestions, SEARCH_OPERATORS, type SuggestionKind, type SuggestionSource } from '@/utils/searchSuggestions';
import SuggestionListbox, { type SuggestionListboxItem } from '@/components/ui/SuggestionListbox';
import { endpoints } from '@/config/api';
import { apiFetcher } from '@/utils/apiClient';

/** 判断按键是否发生在可输入的元素里（这时 / 不应抢焦点） */
function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}

/**
 * 谱面搜索框：输入时下拉联想（标题、曲师、谱师、上传者、标签），空输入时列出搜索操作符；
 * 在页面任意位置按 / 聚焦。主页和搜索页共用：
 * - onChange：每次输入都会调用（搜索页用它实时更新结果）
 * - onSubmit：回车或选中一条联想时调用（主页用它跳到搜索页）
 */
export default function SearchBox({ value, onChange, onSubmit, autoFocus = false }: {
  /** 外部的搜索词（例如 URL 里的），变了会同步到输入框 */
  value: string;
  onChange?: (value: string) => void;
  onSubmit?: (value: string) => void;
  autoFocus?: boolean;
}) {
  const { t } = useTranslation();
  const [currentValue, setCurrentValue] = useState(value);
  const [isFocused, setIsFocused] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [suggestQuery, setSuggestQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxId = useId();
  const updateSuggestQuery = useDebouncedCallback((next: string) => setSuggestQuery(next.trim()), 200);

  const kindLabels: Record<SuggestionKind, string> = {
    title: t("home/HomePage.SuggestKindTitle"),
    artist: t("home/HomePage.SuggestKindArtist"),
    designer: t("home/HomePage.SuggestKindDesigner"),
    uploader: t("home/HomePage.SuggestKindUploader"),
    tag: t("home/HomePage.SuggestKindTag"),
  };

  const operatorHints: Record<(typeof SEARCH_OPERATORS)[number], string> = {
    'id:': t("home/HomePage.SearchHintID"),
    'hash:': t("home/HomePage.SearchHintHash"),
    'tag:': t("home/HomePage.SearchHintTag"),
    'uploader:': t("home/HomePage.SearchHintUploader"),
  };

  // 联想复用列表搜索接口：只在聚焦且有输入时请求
  const { data: suggestSource } = useSWR(
    isFocused && suggestQuery ? endpoints.maichart.listSearchAndSort(suggestQuery, '', 0) : null,
    (url: string) => apiFetcher<SuggestionSource[]>(url),
    { keepPreviousData: true, revalidateOnFocus: false },
  );

  const trimmedValue = currentValue.trim();
  const suggestions = useMemo(
    () => (trimmedValue && Array.isArray(suggestSource) ? buildSuggestions(trimmedValue, suggestSource) : []),
    [trimmedValue, suggestSource],
  );
  // 空输入时列出搜索操作符，点击补全前缀
  const items: SuggestionListboxItem[] = trimmedValue
    ? suggestions.map((item) => ({ key: `${item.kind}:${item.value}`, value: item.value, label: item.label, hint: kindLabels[item.kind], kind: item.kind }))
    : SEARCH_OPERATORS.map((op) => ({ key: op, value: op, label: op, hint: operatorHints[op], keepOpen: true }));
  const isOpen = isFocused && items.length > 0;

  useEffect(() => {
    setCurrentValue(value);
  }, [value]);

  // 在页面任意位置按 / 聚焦搜索框（正在输入时除外）
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== '/' || event.ctrlKey || event.metaKey || event.altKey || isTypingTarget(event.target)) return;
      event.preventDefault();
      inputRef.current?.focus();
      inputRef.current?.select();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const setValue = (next: string) => {
    setCurrentValue(next);
    setActiveIndex(-1);
    updateSuggestQuery(next);
    onChange?.(next);
  };

  const submit = (next: string) => {
    inputRef.current?.blur();
    onSubmit?.(next.trim());
  };

  const handleClearSearch = () => {
    setValue('');
    inputRef.current?.focus();
  };

  const pick = (item: (typeof items)[number]) => {
    setValue(item.value);
    if (item.keepOpen) inputRef.current?.focus();
    else submit(item.value);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      if (isOpen) setIsFocused(false);
      else inputRef.current?.blur();
      return;
    }
    // 输入法组字时的回车是确认候选字，不是提交
    if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
      event.preventDefault();
      if (isOpen && activeIndex >= 0 && activeIndex < items.length) pick(items[activeIndex]);
      else submit(currentValue);
      return;
    }
    if (!isOpen) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const step = event.key === 'ArrowDown' ? 1 : -1;
      // 循环移动高亮项
      setActiveIndex((index) => (index < 0 && step < 0 ? items.length - 1 : (index + step + items.length) % items.length));
    }
  };

  return (
    <div className="relative flex flex-1 items-center min-w-0">
      <LuSearch aria-hidden="true" className="left-3.5 absolute w-4 h-4 text-white/40 pointer-events-none" />
      <input
        ref={inputRef}
        type="search"
        enterKeyHint="search"
        role="combobox"
        autoFocus={autoFocus}
        aria-expanded={isOpen}
        aria-controls={listboxId}
        aria-autocomplete="list"
        aria-activedescendant={isOpen && activeIndex >= 0 ? `${listboxId}-${activeIndex}` : undefined}
        className="bg-white/[0.04] focus:bg-white/[0.06] [&::-webkit-search-cancel-button]:appearance-none pr-18 pl-10 border border-white/10 focus:border-blue-400/60 rounded-xl outline-none focus:ring-2 focus:ring-blue-400/20 w-full h-11 text-white placeholder:text-white/40 text-sm transition-colors"
        placeholder={t("home/HomePage.SearchPlaceholder")}
        value={currentValue}
        onChange={(e) => setValue(e.target.value)}
        onFocus={() => { setIsFocused(true); updateSuggestQuery(currentValue); }}
        onBlur={() => { setIsFocused(false); setActiveIndex(-1); }}
        onKeyDown={handleKeyDown}
        aria-label={t("home/HomePage.SearchPlaceholder")}
      />
      {!currentValue && !isFocused && (
        <kbd aria-hidden="true" className="top-1/2 right-3 absolute place-items-center grid bg-white/[0.06] border border-white/15 rounded-md w-6 h-6 font-mono text-white/50 text-xs -translate-y-1/2 pointer-events-none">
          /
        </kbd>
      )}
      <AnimatePresence>
        {currentValue && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.15 }}
            className="top-1/2 right-2 z-2 absolute flex justify-center items-center hover:bg-white/10 border-none rounded-md w-7 h-7 text-white/50 hover:text-white transition-colors -translate-y-1/2 cursor-pointer touch-manipulation"
            onMouseDown={(event) => event.preventDefault()}
            onClick={handleClearSearch}
            aria-label={t("home/HomePage.ClearSearch")}
          >
            <LuX aria-hidden="true" className="w-3.5 h-3.5" />
          </motion.button>
        )}
      </AnimatePresence>

      {isOpen && (
        <SuggestionListbox
          id={listboxId}
          label={t("home/HomePage.SearchSuggestions")}
          items={items}
          activeIndex={activeIndex}
          highlight={trimmedValue.replace(/^(uploader|tag):/i, '')}
          onHover={setActiveIndex}
          onPick={pick}
        />
      )}
    </div>
  );
}
