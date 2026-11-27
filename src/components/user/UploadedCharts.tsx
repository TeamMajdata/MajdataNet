/**
 * 个人空间“上传的谱面”：列表上方带页内搜索框和排序菜单。
 * 后端搜索不能把“上传者”和关键词组合起来，所以第一次聚焦搜索框（或网址里带着搜索词）时
 * 把这个用户的全部上传一次拉回来，联想和过滤都在前端做。没有搜索词时仍显示原来的第一屏列表。
 * 排序和搜索页共用一套参数：`?sort=` 是下标、对应 `SORT_WORDS`。
 */

import { useId, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import useSWR from 'swr';
import { AnimatePresence, m } from 'framer-motion';
import { LuSearch, LuX } from 'react-icons/lu';
import SongList from '@/components/song/SongList';
import SongCard from '@/components/song/SongCard';
import InteractSummaryProvider from '@/components/song/InteractSummaryProvider';
import { API_PAGE_SIZE, apiPagesForView, SONG_GRID_CONTAINER_CLASS } from '@/components/song/songGrid';
import EmptyState from '@/components/ui/EmptyState';
import SectionLoading from '@/components/ui/SectionLoading';
import SortMenu from '@/components/ui/SortMenu';
import SuggestionListbox, { type SuggestionListboxItem } from '@/components/ui/SuggestionListbox';
import { SORT_WORDS, parseIndexParam, useSortOptions } from '@/components/search/chartSort';
import { endpoints } from '@/config/api';
import { apiFetcher } from '@/utils/apiClient';
import type { SuggestionKind } from '@/utils/searchSuggestions';
import { buildUploadedChartSuggestions, collectAllPages, filterUploadedCharts } from '@/utils/uploadedChartSearch';
import type { Song } from '@/types';

/** 网址里保存已提交搜索词的参数名 */
const QUERY_PARAM = 'q';
/** 网址里保存排序下标；和搜索页的 `sort` 参数一致 */
const SORT_PARAM = 'sort';

const fetchAllUploaded = ([, username, sortWord]: [string, string, string]) =>
  collectAllPages((page) => apiFetcher<Song[]>(endpoints.maichart.listSearchAndSort('uploader:' + username, sortWord, page)), API_PAGE_SIZE);

export default function UploadedCharts({ username, onDataLoaded }: {
  username: string;
  onDataLoaded: (hasData: boolean) => void;
}) {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const sortOptions = useSortOptions();
  const committed = (searchParams.get(QUERY_PARAM) ?? '').trim();
  const sortType = parseIndexParam(searchParams.get(SORT_PARAM), SORT_WORDS.length - 1);
  const sortWord = SORT_WORDS[sortType];
  const [currentValue, setCurrentValue] = useState(committed);
  const [isFocused, setIsFocused] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  // 只有用户要搜索时才拉全量
  const [wantAll, setWantAll] = useState(committed !== '');
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxId = useId();

  const all = useSWR(wantAll || committed ? ['uploaded-all', username, sortWord] : null, fetchAllUploaded, { revalidateOnFocus: false });

  const kindLabels: Record<SuggestionKind, string> = {
    title: t("home/HomePage.SuggestKindTitle"),
    artist: t("home/HomePage.SuggestKindArtist"),
    designer: t("home/HomePage.SuggestKindDesigner"),
    uploader: t("home/HomePage.SuggestKindUploader"),
    tag: t("home/HomePage.SuggestKindTag"),
  };

  const trimmedValue = currentValue.trim();
  const suggestions = useMemo(
    () => (trimmedValue && all.data ? buildUploadedChartSuggestions(trimmedValue, all.data) : []),
    [trimmedValue, all.data],
  );
  const items: SuggestionListboxItem[] = suggestions.map((item) => ({
    key: `${item.kind}:${item.value}`, value: item.value, label: item.label, hint: kindLabels[item.kind], kind: item.kind,
  }));
  const isOpen = isFocused && items.length > 0;

  const results = useMemo(
    () => (committed && all.data ? filterUploadedCharts(committed, all.data) : []),
    [committed, all.data],
  );

  const commit = (value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value.trim()) next.set(QUERY_PARAM, value.trim()); else next.delete(QUERY_PARAM);
    setSearchParams(next, { replace: true, preventScrollReset: true });
  };

  /** 和搜索页一样把排序写进网址；默认排序（下标 0）不落参数 */
  const setSort = (value: number) => {
    const next = new URLSearchParams(searchParams);
    if (value > 0) next.set(SORT_PARAM, String(value)); else next.delete(SORT_PARAM);
    setSearchParams(next, { preventScrollReset: true });
  };

  const setValue = (value: string) => {
    setCurrentValue(value);
    setActiveIndex(-1);
    // 清空输入时立即恢复完整列表
    if (!value.trim() && committed) commit('');
  };

  const pick = (item: SuggestionListboxItem) => {
    setValue(item.value);
    commit(item.value);
    inputRef.current?.blur();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      if (isOpen) setIsFocused(false);
      else inputRef.current?.blur();
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      if (isOpen && activeIndex >= 0 && activeIndex < items.length) {
        pick(items[activeIndex]);
      } else {
        commit(currentValue);
        inputRef.current?.blur();
      }
      return;
    }
    if (!isOpen) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const step = event.key === 'ArrowDown' ? 1 : -1;
      setActiveIndex((index) => (index < 0 && step < 0 ? items.length - 1 : (index + step + items.length) % items.length));
    }
  };

  return (
    <>
      <div className="flex items-center gap-2 mb-4 min-w-0">
        <div className="relative flex flex-1 items-center min-w-0">
          <LuSearch aria-hidden="true" className="left-3.5 absolute w-4 h-4 text-white/40 pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            role="combobox"
            aria-expanded={isOpen}
            aria-controls={listboxId}
            aria-autocomplete="list"
            aria-activedescendant={isOpen && activeIndex >= 0 ? `${listboxId}-${activeIndex}` : undefined}
            className="bg-white/[0.04] focus:bg-white/[0.06] pr-10 pl-10 border border-white/10 focus:border-blue-400/60 rounded-xl outline-none focus:ring-2 focus:ring-blue-400/20 w-full h-11 text-white placeholder:text-white/40 text-sm transition-colors"
            placeholder={t("space/SpacePage.SearchUploaded")}
            value={currentValue}
            onChange={(event) => setValue(event.target.value)}
            onFocus={() => { setIsFocused(true); setWantAll(true); }}
            onBlur={() => { setIsFocused(false); setActiveIndex(-1); }}
            onKeyDown={handleKeyDown}
            aria-label={t("space/SpacePage.SearchUploaded")}
          />
          <AnimatePresence>
            {currentValue && (
              <m.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.15 }}
                className="top-1/2 right-2 z-2 absolute flex justify-center items-center hover:bg-white/10 border-none rounded-md w-7 h-7 text-white/50 hover:text-white transition-colors -translate-y-1/2 cursor-pointer touch-manipulation"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => { setValue(''); inputRef.current?.focus(); }}
                aria-label={t("home/HomePage.ClearSearch")}
              >
                <LuX aria-hidden="true" className="w-3.5 h-3.5" />
              </m.button>
            )}
          </AnimatePresence>

          {isOpen && (
            <SuggestionListbox
              id={listboxId}
              label={t("home/HomePage.SearchSuggestions")}
              items={items}
              activeIndex={activeIndex}
              highlight={trimmedValue.replace(/^tag:/i, '')}
              onHover={setActiveIndex}
              onPick={pick}
            />
          )}
        </div>
        <SortMenu
          options={sortOptions}
          value={sortType}
          onChange={setSort}
          label={t('home/HomePage.SortBy')}
        />
      </div>

      {/* 原列表一直挂着：它负责告诉页面有没有上传（决定页签是否显示） */}
      <div hidden={committed !== ''}>
        <SongList
          url={apiPagesForView(0).map((apiPage) => endpoints.maichart.listSearchAndSort('uploader:' + username, sortWord, apiPage))}
          onDataLoaded={onDataLoaded}
          gridClassName={SONG_GRID_CONTAINER_CLASS}
        />
      </div>

      {committed !== '' && (
        all.error ? <EmptyState>{t("song/SongList.ServerError")}</EmptyState>
          : !all.data ? <SectionLoading />
            : results.length === 0 ? <EmptyState>{t("space/SpacePage.SearchNoMatch", { query: committed })}</EmptyState>
              : (
                <>
                  <p className="m-0 mb-3 text-white/55! text-sm" aria-live="polite">
                    {t("space/SpacePage.SearchResultCount", { count: results.length })}
                  </p>
                  <InteractSummaryProvider ids={results.map((song) => song.id)}>
                    <div className={SONG_GRID_CONTAINER_CLASS}>
                      {results.map((song, index) => <SongCard key={song.id} song={song} index={index} />)}
                    </div>
                  </InteractSummaryProvider>
                </>
              )
      )}
    </>
  );
}
