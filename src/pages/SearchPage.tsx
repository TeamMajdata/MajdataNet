import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { useDebouncedCallback } from 'use-debounce';
import { PageLayout, SongList } from '@/components';
import Pager from '@/components/ui/Pager';
import SortMenu from '@/components/ui/SortMenu';
import SearchBox from '@/components/search/SearchBox';
import { SORT_WORDS, parseIndexParam, useSortOptions } from '@/components/search/chartSort';
import { endpoints } from '@/config/api';
import { apiPagesForView } from '@/components/song/songGrid';

/**
 * 谱面搜索页：主页的搜索栏回车后进到这里。搜索词、排序、页码都放在 URL 里（?search=&sort=&page=），
 * 链接可以分享，浏览器回退能还原；在这里继续输入会实时更新结果。
 */
export default function SearchPage() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const sortOptions = useSortOptions();
  const search = searchParams.get('search') ?? '';
  const sortType = parseIndexParam(searchParams.get('sort'), SORT_WORDS.length - 1);
  const page = parseIndexParam(searchParams.get('page'), Number.MAX_SAFE_INTEGER);

  // 最后一页的信息和它所属的搜索条件绑定，条件一变自然失效
  const listKey = `${search}|${sortType}`;
  const [lastPage, setLastPage] = useState<{ key: string; page: number } | null>(null);
  const hasNext = !(lastPage && lastPage.key === listKey && page >= lastPage.page);

  // 更新 URL 参数；值为 null 时删除该参数（默认值不落到 URL 里）
  const updateParams = useCallback((patch: Record<string, string | null>, replace: boolean) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      for (const [key, value] of Object.entries(patch)) {
        if (value === null) next.delete(key);
        else next.set(key, value);
      }
      return next;
    }, { replace });
  }, [setSearchParams]);

  // 输入搜索词用 replace，避免每敲一次键都往历史栈里压一条记录
  const debounced = useDebouncedCallback((value: string) => {
    updateParams({ search: value || null, page: null }, true);
  }, 500);

  const goToPage = (target: number) => {
    updateParams({ page: target > 0 ? String(target) : null }, false);
    document.getElementById('search-toolbar')?.scrollIntoView({ block: 'start' });
  };

  return (
    <PageLayout>
      <div className="mx-auto py-5 sm:py-8 w-full max-w-320 min-w-0">
        <h1 className="m-0 mb-4 sm:mb-5 font-semibold text-white! text-2xl! sm:text-3xl! text-left! tracking-tight">
          {/* 搜索词用颜色标出来，不加引号：中文引号会用西文字体显示成窄窄的斜引号 */}
          {search ? <ResultsTitle search={search} /> : t('search/SearchPage.Title')}
        </h1>
        <div id="search-toolbar" className="z-30 relative flex gap-2 mb-4 sm:mb-5 scroll-mt-24">
          <SearchBox
            value={search}
            autoFocus={!search}
            onChange={(value) => debounced(value)}
            onSubmit={(value) => { debounced.cancel(); updateParams({ search: value || null, page: null }, true); }}
          />
          <SortMenu
            options={sortOptions}
            value={sortType}
            onChange={(value) => updateParams({ sort: value > 0 ? String(value) : null, page: null }, false)}
            label={t('home/HomePage.SortBy')}
          />
        </div>
        <SongList
          url={apiPagesForView(page).map((apiPage) => endpoints.maichart.listSearchAndSort(search, SORT_WORDS[sortType], apiPage))}
          page={page}
          setMax={(last) => setLastPage((prev) => (
            prev && prev.key === listKey && prev.page === last ? prev : { key: listKey, page: last }
          ))}
        />
        <div className="flex justify-center mt-8 sm:mt-10">
          <Pager page={page} hasNext={hasNext} onPageChange={goToPage} />
        </div>
      </div>
    </PageLayout>
  );
}

/** 占位符：翻译文本里搜索词的位置。搜索词本身由 React 当普通文字渲染，不会被当成标签解析 */
const SEARCH_SLOT = '\u0000';

/** “Tane 的搜索结果”：搜索词用颜色标出来，按翻译文本里的位置拼回去 */
function ResultsTitle({ search }: { search: string }) {
  const { t } = useTranslation();
  const [before, after = ''] = t('search/SearchPage.ResultsFor', { search: SEARCH_SLOT }).split(SEARCH_SLOT);
  return <>{before}<span className="text-sky-300">{search}</span>{after}</>;
}
