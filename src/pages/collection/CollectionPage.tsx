import { useTranslation } from 'react-i18next';
import { useState, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import useSWR from 'swr';
import { useDebouncedCallback } from 'use-debounce';
import { PageLayout, SongCard, LoadingSpinner } from '@/components';
import { endpoints } from '@/config/api';
import { useUserContext } from '@/hooks';
import type { CollectionSongList, Song } from '@/types';
import { fetchChartInfos } from '@/utils/chartInfo';
import CollectionSubscribeButton from '@/components/collection/CollectionSubscribeButton';
import { LuPlus, LuSearch, LuSettings2, LuX } from 'react-icons/lu';
import EmptyState from '@/components/ui/EmptyState';
import PageLoading from '@/components/ui/PageLoading';
import Pager from '@/components/ui/Pager';
import SegmentedTabs from '@/components/ui/SegmentedTabs';
import SortMenu from '@/components/ui/SortMenu';
import { SONG_GRID_CLASS } from '@/components/song/songGrid';

const GHOST_BUTTON = 'inline-flex items-center gap-2 bg-white/[0.06] hover:bg-white/10 px-4 border border-white/10 hover:border-white/20 rounded-xl h-10 font-medium text-white/85 text-sm whitespace-nowrap transition-colors cursor-pointer';

const fetcher = (url: string) =>
  fetch(url, { mode: 'cors', credentials: 'include' }).then((res) => res.json());

export default function CollectionPage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const id = searchParams.get('id');

  // 获取歌单数据
  const { data: collectionData, error, isLoading, mutate } = useSWR<CollectionSongList>(
    id ? endpoints.collection.songlist(id) : null,
    fetcher,
    { revalidateOnFocus: false }
  );


  // 获取当前用户
  const { username } = useUserContext();
  const isCreator = !!collectionData && !!username && collectionData.createdBy === username;

  // 管理模式状态
  const [isManaging, setIsManaging] = useState(false);
  const [addedIds, setAddedIds] = useState<string[]>([]);
  const [removedIds, setRemovedIds] = useState<string[]>([]);
  const [addedSongs, setAddedSongs] = useState<Song[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [visibilityDraft, setVisibilityDraft] = useState<number | null>(null);
  const [nameDraft, setNameDraft] = useState<string | null>(null);
  const [descriptionDraft, setDescriptionDraft] = useState<string | null>(null);

  // 搜索状态
  const [searchQuery, setSearchQuery] = useState('');
  const [searchPage, setSearchPage] = useState(0);
  const [searchMaxPage, setSearchMaxPage] = useState(999999);
  const [searchSortType, setSearchSortType] = useState(0);

  const sortWords = ['', 'likep', 'commp', 'playp', 'timep'];

  // 歌单中原有的谱面 Id（歌单顺序）
  const originalIds = useMemo(
    () => collectionData?.items ?? [],
    [collectionData]
  );

  // 谱面信息一次批量获取；空歌单不发请求
  const { data: originalSongs, error: songsError, isLoading: isSongsLoading } = useSWR<Song[]>(
    originalIds.length > 0 ? ['collection-chart-infos', ...originalIds] : null,
    ([, ...ids]: string[]) => fetchChartInfos(ids),
    // 保存后 Id 列表变化，先保留旧数据避免整页闪回加载状态
    { revalidateOnFocus: false, keepPreviousData: true }
  );

  // 已存在的所有 ID（用于搜索结果中标记已添加）
  const allExistingIds = useMemo(
    () => new Set([...originalIds, ...addedIds]),
    [originalIds, addedIds]
  );

  // 当前可见性（管理模式下的草稿值，否则取原始值）
  const currentVisibility = isManaging
    ? (visibilityDraft ?? collectionData?.visibility ?? 0)
    : (collectionData?.visibility ?? 0);

  const currentName = isManaging
    ? (nameDraft ?? collectionData?.name ?? '')
    : (collectionData?.name ?? '');

  const currentDescription = isManaging
    ? (descriptionDraft ?? collectionData?.description ?? '')
    : (collectionData?.description ?? '');

  const nameChanged = nameDraft !== null && nameDraft !== collectionData?.name;
  const descriptionChanged = descriptionDraft !== null && descriptionDraft !== (collectionData?.description ?? '');
  const visibilityChanged = visibilityDraft !== null && visibilityDraft !== collectionData?.visibility;

  // 是否有变更
  const hasChanges = addedIds.length > 0 || removedIds.length > 0 || nameChanged || descriptionChanged || visibilityChanged;

  // 当前的谱面 Id 列表：原有（未移除） + 新增，即提交的顺序
  const displayIds = useMemo(() => {
    const removedSet = new Set(removedIds);
    return [...originalIds.filter((chartId) => !removedSet.has(chartId)), ...addedIds];
  }, [originalIds, removedIds, addedIds]);

  // 当前显示的歌曲列表，顺序与 displayIds 一致；已不存在的谱面不显示
  const displaySongs = useMemo(() => {
    // originalSongs 可能是保存前的旧数据，只保留仍在歌单中的谱面
    const kept = new Set(originalIds);
    for (const chartId of removedIds) kept.delete(chartId);
    const existing = (originalSongs ?? []).filter((s) => kept.has(s.id));
    return [...existing, ...addedSongs];
  }, [originalIds, originalSongs, removedIds, addedSongs]);

  // 搜索排序选项
  const searchSortOptions = [
    t("collection/CollectionPage.LatestActivity"),
    t("collection/CollectionPage.LikeCount"),
    t("collection/CollectionPage.CommentCount"),
    t("collection/CollectionPage.PlayCount"),
    t("collection/CollectionPage.UploadDate"),
  ];

  // 使用 SWR 进行搜索
  const searchUrl = searchQuery.trim()
    ? endpoints.maichart.listSearchAndSort(searchQuery, sortWords[searchSortType], searchPage)
    : null;

  const { data: searchData, isLoading: isSearchLoading } = useSWR<Song[]>(
    searchUrl,
    fetcher,
    {
      revalidateOnFocus: false,
      onSuccess: (data) => {
        if (data && Array.isArray(data) && data.length < 30 && data.length > 0) {
          setSearchMaxPage(searchPage);
        }
      },
    }
  );

  // 搜索结果
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    if (searchData && Array.isArray(searchData)) return searchData;
    return [];
  }, [searchData, searchQuery]);

  // 防抖搜索 - 重置分页（SWR 会自动通过 URL 变化触发请求）
  const debouncedSearch = useDebouncedCallback(() => {
    setSearchPage(0);
    setSearchMaxPage(999999);
  }, 500);

  // 添加歌曲到歌单
  const handleAddSong = (song: Song) => {
    if (allExistingIds.has(song.id)) return;
    setAddedIds((prev) => [...prev, song.id]);
    setAddedSongs((prev) => [...prev, song]);
  };

  // 从歌单移除歌曲
  const handleRemoveSong = (songId: string) => {
    if (addedIds.includes(songId)) {
      setAddedIds((prev) => prev.filter((id) => id !== songId));
      setAddedSongs((prev) => prev.filter((s) => s.id !== songId));
    } else {
      setRemovedIds((prev) => (prev.includes(songId) ? prev : [...prev, songId]));
    }
  };

  // 提交变更
  const handleSubmit = async () => {
    if (!id || !hasChanges || isSubmitting) return;

    setIsSubmitting(true);

    const body: Record<string, unknown> = {};
    if (addedIds.length > 0 || removedIds.length > 0) {
      // 整体替换：原有（未移除） + 新增
      body.items = displayIds;
    }
    if (visibilityChanged) {
      body.visibility = visibilityDraft;
    }
    if (nameChanged) {
      body.name = nameDraft;
    }
    if (descriptionChanged) {
      body.description = descriptionDraft;
    }

    try {
      const res = await fetch(endpoints.collection.modify(id), {
        method: 'PUT',
        mode: 'cors',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        toast.success(t("collection/CollectionPage.SaveSuccess"));
        setIsManaging(false);
        setAddedIds([]);
        setRemovedIds([]);
        setAddedSongs([]);
        setVisibilityDraft(null);
        setNameDraft(null);
        setDescriptionDraft(null);
        setSearchQuery('');
        setSearchPage(0);
        setSearchMaxPage(999999);
        setSearchSortType(0);
        mutate();
      } else {
        toast.error(t("collection/CollectionPage.SaveFailed"));
      }
    } catch {
      toast.error(t("collection/CollectionPage.SaveFailed"));
    } finally {
      setIsSubmitting(false);
    }
  };

  // 取消管理
  const handleCancel = () => {
    setIsManaging(false);
    setAddedIds([]);
    setRemovedIds([]);
    setAddedSongs([]);
    setVisibilityDraft(null);
    setNameDraft(null);
    setDescriptionDraft(null);
    setSearchQuery('');
    setSearchPage(0);
    setSearchMaxPage(999999);
    setSearchSortType(0);
  };

  // 无效参数、加载失败、歌单不存在：居中的一句提示
  const notice = (text: string) => (
    <PageLayout>
      <div className="mx-auto px-4 py-24 max-w-xl text-center">
        <p className="m-0 text-white/60! text-base">{text}</p>
      </div>
    </PageLayout>
  );

  if (!id) return notice(t("collection/CollectionPage.InvalidParams"));
  if (error || songsError) return notice(t("collection/CollectionPage.ServerError"));
  if (isLoading || (isSongsLoading && !originalSongs)) {
    return <PageLayout><PageLoading /></PageLayout>;
  }
  if (!collectionData) return notice(t("collection/CollectionPage.CollectionNotFound"));

  /** 封面左上角的添加 / 移出按钮（右上角会盖住标题） */
  const cardAction = (added: boolean, onClick: () => void) => (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`top-4 left-4 z-10 absolute place-items-center grid shadow-[0_2px_8px_rgb(0_0_0/0.4)] border-none rounded-lg w-7 h-7 text-white transition-colors cursor-pointer ${added ? 'bg-red-500/85 hover:bg-red-500' : 'bg-blue-500/85 hover:bg-blue-500'}`}
      title={added ? t("collection/CollectionPage.RemoveFromCollection") : t("collection/CollectionPage.Add")}
      aria-label={added ? t("collection/CollectionPage.RemoveFromCollection") : t("collection/CollectionPage.Add")}
    >
      {added ? <LuX aria-hidden="true" className="w-4 h-4" /> : <LuPlus aria-hidden="true" className="w-4 h-4" />}
    </button>
  );

  return (
    <PageLayout>
      <div className="mx-auto py-5 sm:py-8 w-full max-w-320 min-w-0">
        {/* Header：标题和简介居左，订阅 / 管理在右；管理时标题和简介变成输入框 */}
        <header className="flex sm:flex-row flex-col justify-between sm:items-start gap-4 mb-6">
          <div className="flex-1 min-w-0">
            {isManaging ? (
              <input
                type="text"
                value={currentName}
                onChange={(e) => setNameDraft(e.target.value)}
                aria-label={t("collection/CollectionPage.NameLabel")}
                className="bg-white/[0.04] focus:bg-white/[0.06] px-3 border border-white/10 focus:border-blue-400/60 rounded-xl outline-none focus:ring-2 focus:ring-blue-400/20 w-full h-12 font-semibold text-white text-xl sm:text-2xl transition-colors"
              />
            ) : (
              <h1 className="m-0 font-semibold text-white! text-2xl! sm:text-3xl! text-left! break-words tracking-tight">{collectionData.name}</h1>
            )}
            {isManaging ? (
              <input
                type="text"
                value={currentDescription}
                onChange={(e) => setDescriptionDraft(e.target.value)}
                placeholder={t("collection/CollectionPage.DescriptionPlaceholder")}
                aria-label={t("collection/CollectionPage.DescriptionPlaceholder")}
                className="bg-white/[0.04] focus:bg-white/[0.06] mt-2 px-3 border border-white/10 focus:border-blue-400/60 rounded-xl outline-none focus:ring-2 focus:ring-blue-400/20 w-full h-10 text-white/85 placeholder:text-white/35 text-sm transition-colors"
              />
            ) : (
              collectionData.description && (
                <p className="m-0 mt-1.5 text-white/60! text-sm break-words">{collectionData.description}</p>
              )
            )}
            <p className="m-0 mt-2 text-white/40! text-xs">
              {t("collection/CollectionPage.Creator")}:{' '}
              <Link to={`/space?id=${encodeURIComponent(collectionData.createdBy)}`} className="text-white/60 hover:text-white no-underline">{collectionData.createdBy}</Link>
              <span className="mx-1.5">·</span>{displaySongs.length} {t("collection/CollectionPage.Songs")}
              <span className="mx-1.5">·</span>{currentVisibility === 1 ? t("collection/CollectionPage.Public") : t("collection/CollectionPage.Private")}
            </p>
          </div>
          {!isManaging && (
            <div className="flex items-center gap-2 shrink-0">
              <CollectionSubscribeButton collectionId={collectionData.id} />
              {isCreator && (
                <button type="button" onClick={() => setIsManaging(true)} className={GHOST_BUTTON}>
                  <LuSettings2 aria-hidden="true" className="w-4 h-4" />
                  {t("collection/CollectionPage.Manage")}
                </button>
              )}
            </div>
          )}
        </header>

        {/* 管理模式：可见性、搜索添加谱面 */}
        {isManaging && (
          <section className="mb-8">
            <SegmentedTabs
              className="mb-4"
              tabs={[
                { key: 'private', label: t("collection/CollectionPage.Private") },
                { key: 'public', label: t("collection/CollectionPage.Public") },
              ]}
              active={currentVisibility === 1 ? 'public' : 'private'}
              onSelect={(key) => setVisibilityDraft(key === 'public' ? 1 : 0)}
            />

            <div className="flex items-center gap-2 mb-4">
              <div className="relative flex flex-1 items-center min-w-0">
                <LuSearch aria-hidden="true" className="left-3.5 absolute w-4 h-4 text-white/40 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    debouncedSearch();
                  }}
                  placeholder={t("collection/CollectionPage.SearchToAdd")}
                  aria-label={t("collection/CollectionPage.SearchToAdd")}
                  className="bg-white/[0.04] focus:bg-white/[0.06] pr-10 pl-10 border border-white/10 focus:border-blue-400/60 rounded-xl outline-none focus:ring-2 focus:ring-blue-400/20 w-full h-11 text-white placeholder:text-white/40 text-sm transition-colors"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setSearchPage(0);
                      setSearchMaxPage(999999);
                    }}
                    aria-label={t("collection/CollectionPage.Cancel")}
                    className="top-1/2 right-2 absolute place-items-center grid hover:bg-white/10 border-none rounded-md w-7 h-7 text-white/50 hover:text-white transition-colors -translate-y-1/2 cursor-pointer"
                  >
                    <LuX aria-hidden="true" className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <SortMenu options={searchSortOptions} value={searchSortType} onChange={setSearchSortType} label={t("collection/CollectionPage.SortBy")} />
            </div>

            {isSearchLoading && (
              <div className="flex justify-center py-4">
                <LoadingSpinner size={30} />
              </div>
            )}

            {searchResults.length > 0 && (
              <>
                <div className={SONG_GRID_CLASS}>
                  {searchResults.map((song, index) => {
                    const isAdded = allExistingIds.has(song.id);
                    return (
                      <div key={song.id} className="relative min-w-0">
                        <SongCard song={song} index={index} disableLink />
                        {cardAction(isAdded, () => (isAdded ? handleRemoveSong(song.id) : handleAddSong(song)))}
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-center mt-5">
                  <Pager page={searchPage} hasNext={searchPage < searchMaxPage} onPageChange={setSearchPage} />
                </div>
              </>
            )}
          </section>
        )}

        {/* 歌单里的谱面 */}
        {displaySongs.length === 0 ? (
          <EmptyState>{t("collection/CollectionPage.EmptyCollection")}</EmptyState>
        ) : (
          <div className={SONG_GRID_CLASS}>
            {displaySongs.map((song, index) => (
              <div key={song.id} className="relative min-w-0">
                <SongCard song={song} index={index} disableLink={isManaging} />
                {isManaging && cardAction(true, () => handleRemoveSong(song.id))}
              </div>
            ))}
          </div>
        )}

        {/* 管理模式：取消 / 保存 */}
        {isManaging && (
          <div className="flex justify-end items-center gap-2 mt-8">
            <button type="button" onClick={handleCancel} className={GHOST_BUTTON}>
              {t("collection/CollectionPage.Cancel")}
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!hasChanges || isSubmitting}
              className="inline-flex items-center gap-2 bg-blue-500 hover:bg-blue-400 disabled:opacity-50 px-4 border-none rounded-xl h-10 font-semibold text-white text-sm transition-colors cursor-pointer disabled:cursor-not-allowed"
            >
              {isSubmitting && <LoadingSpinner size={16} />}
              {t("collection/CollectionPage.Submit")}
            </button>
          </div>
        )}
      </div>
    </PageLayout>
  );
}
