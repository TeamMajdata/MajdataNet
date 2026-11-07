import { useTranslation } from 'react-i18next';
import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import useSWR from 'swr';
import { useDebouncedCallback } from 'use-debounce';
import { motion } from 'framer-motion';
import { PageLayout, SongCard, LoadingSpinner } from '@/components';
import { endpoints } from '@/config/api';
import { useUserContext } from '@/hooks';
import type { CollectionSongList, Song } from '@/types';
import CollectionSubscribeButton from '@/components/collection/CollectionSubscribeButton';

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

  // 歌单中原有的歌曲 ID
  const originalIds = useMemo(
    () => collectionData?.items?.map((s) => s.id) || [],
    [collectionData]
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

  // 当前显示的歌曲列表
  const displaySongs = useMemo(() => {
    const removedSet = new Set(removedIds);
    const existing = (collectionData?.items || []).filter((s) => !removedSet.has(s.id));
    return [...existing, ...addedSongs];
  }, [collectionData, removedIds, addedSongs]);

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
      // 谱面 Id 列表即当前显示的顺序：原有（未移除） + 新增
      body.items = displaySongs.map((s) => s.id);
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
        method: 'POST',
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

  if (!id) {
    return (
      <PageLayout>
        <div className="flex justify-center items-center min-h-[60vh]">
          <div className="text-white text-2xl">{t("collection/CollectionPage.InvalidParams")}</div>
        </div>
      </PageLayout>
    );
  }

  if (error) {
    return (
      <PageLayout>
        <div className="flex justify-center items-center min-h-[60vh]">
          <div className="text-white text-2xl">{t("collection/CollectionPage.ServerError")}</div>
        </div>
      </PageLayout>
    );
  }

  if (isLoading) {
    return (
      <PageLayout>
        <div className="flex justify-center items-center min-h-[60vh]">
          <LoadingSpinner size={50} />
        </div>
      </PageLayout>
    );
  }

  if (!collectionData) {
    return (
      <PageLayout>
        <div className="flex justify-center items-center min-h-[60vh]">
          <div className="text-white text-2xl">{t("collection/CollectionPage.CollectionNotFound")}</div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div className="mx-auto px-4 py-8 w-full max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
            <div className="flex-1 min-w-0">
              {isManaging ? (
                <input
                  type="text"
                  value={currentName}
                  onChange={(e) => setNameDraft(e.target.value)}
                  className="bg-transparent py-1 border-white/20 focus:border-blue-500 border-b-2 outline-none w-full font-bold text-white text-3xl"
                />
              ) : (
                <h1 className="font-bold text-white text-3xl">{collectionData.name}</h1>
              )}
              {isManaging ? (
                <input
                  type="text"
                  value={currentDescription}
                  onChange={(e) => setDescriptionDraft(e.target.value)}
                  placeholder={t("collection/CollectionPage.DescriptionPlaceholder")}
                  className="bg-transparent mt-2 py-1 border-white/10 focus:border-white/30 border-b outline-none w-full text-white/60 placeholder:text-white/30 text-sm"
                />
              ) : (
                collectionData.description && (
                  <p className="mt-2 text-white/60">{collectionData.description}</p>
                )
              )}
              <div className="mt-2 text-white/40 text-sm">
                {t("collection/CollectionPage.Creator")}: {collectionData.createdBy} · {displaySongs.length}{' '}
                {t("collection/CollectionPage.Songs")} · {currentVisibility === 1 ? t("collection/CollectionPage.Public") : t("collection/CollectionPage.Private")}
              </div>
            </div>
            {!isManaging && (
              <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                <CollectionSubscribeButton collectionId={collectionData.id} />
                {isCreator && (
                  <button
                    onClick={() => setIsManaging(true)}
                    className="bg-white/10 hover:bg-white/20 shadow-lg backdrop-blur-md px-4 py-2 border border-white/20 rounded-xl font-bold text-white transition-all cursor-pointer"
                  >
                    {t("collection/CollectionPage.Manage")}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 管理模式: 可见性切换 + 搜索栏 */}
        {isManaging && (
          <>
            <div className="flex justify-center mb-4">
              <div className="inline-flex bg-[rgba(20,20,25,0.7)] p-1 border border-white/10 rounded-full">
                <button
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors cursor-pointer ${currentVisibility === 0
                    ? 'bg-blue-500/80 text-white'
                    : 'text-white/80 hover:text-white'
                    }`}
                  onClick={() => setVisibilityDraft(0)}
                >
                  {t("collection/CollectionPage.Private")}
                </button>
                <button
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors cursor-pointer ${currentVisibility === 1
                    ? 'bg-blue-500/80 text-white'
                    : 'text-white/80 hover:text-white'
                    }`}
                  onClick={() => setVisibilityDraft(1)}
                >
                  {t("collection/CollectionPage.Public")}
                </button>
              </div>
            </div>

            <div className="relative mb-4">
              <div className="flex flex-row items-center gap-2">
                <div className="relative flex-1 min-w-0">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      debouncedSearch();
                    }}
                    placeholder={t("collection/CollectionPage.SearchToAdd")}
                    className="bg-[rgba(20,20,25,0.8)] backdrop-blur-[15px] backdrop-saturate-150 px-6 py-3 pr-10 border-2 border-white/15 rounded-[30px] outline-none w-full text-white placeholder:text-white/60 text-sm"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        setSearchPage(0);
                        setSearchMaxPage(999999);
                      }}
                      className="top-1/2 right-3 absolute bg-transparent border-none text-white/60 hover:text-white/90 text-xl -translate-y-1/2 cursor-pointer"
                    >
                      ×
                    </button>
                  )}
                </div>
                <select
                  value={searchSortType}
                  onChange={(e) => setSearchSortType(parseInt(e.target.value))}
                  className="bg-[rgba(20,20,25,0.8)] backdrop-blur-xl backdrop-saturate-150 px-2 py-1 border border-white/20 rounded-full outline-none h-10 overflow-hidden text-white text-xs sm:text-sm text-center whitespace-nowrap appearance-none cursor-pointer shrink-0"
                >
                  {searchSortOptions.map((label, i) => (
                    <option key={i} value={i}>{label}</option>
                  ))}
                </select>
              </div>
            </div>

            {isSearchLoading && (
              <div className="flex justify-center py-4">
                <LoadingSpinner size={30} />
              </div>
            )}

            {searchResults.length > 0 && (
              <>
      <div className="justify-center gap-3 sm:gap-[0.6rem] grid grid-cols-[minmax(0,20.6rem)] sm:grid-cols-[repeat(auto-fit,minmax(20rem,20.6rem))] mx-auto p-0 sm:p-2 w-full max-w-350 min-w-0">
                  {searchResults.map((song, index) => {
                    const isAdded = allExistingIds.has(song.id);
                    return (
                      <div key={song.id} className="relative">
                        <SongCard song={song} index={index} disableLink />
                        <motion.button
                          whileHover={{ scale: 1.15 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (isAdded) handleRemoveSong(song.id)
                            else handleAddSong(song);
                          }}
                          className={`top-2 right-2 z-10 absolute flex justify-center items-center shadow-lg border-none rounded-full w-6 h-6 font-bold text-white text-base leading-none cursor-pointer transition-colors ${isAdded
                            ? 'bg-red-500/80 hover:bg-red-500'
                            : 'bg-blue-500/80 hover:bg-blue-500'
                            }`}
                          title={isAdded ? t("collection/CollectionPage.RemoveFromCollection") : t("collection/CollectionPage.Add")}
                        >
                          {isAdded ? '×' : '+'}
                        </motion.button>
                      </div>
                    );
                  })}
                </div>

                {/* 搜索结果分页 */}
                <div className="flex justify-center items-center gap-3 mt-4 mb-4">
                  <button
                    className={`px-4 py-1.5 bg-blue-500/80 border-none rounded-lg text-white text-sm cursor-pointer ${searchPage <= 0 ? 'bg-gray-500/50 cursor-not-allowed opacity-60' : ''}`}
                    disabled={searchPage <= 0}
                    onClick={() => setSearchPage((p) => p - 1)}
                  >
                    ←
                  </button>
                  <span className="text-white/60 text-sm">
                    {searchPage + 1}
                  </span>
                  <button
                    className={`px-4 py-1.5 bg-blue-500/80 border-none rounded-lg text-white text-sm cursor-pointer ${searchPage >= searchMaxPage ? 'bg-gray-500/50 cursor-not-allowed opacity-60' : ''}`}
                    disabled={searchPage >= searchMaxPage}
                    onClick={() => setSearchPage((p) => p + 1)}
                  >
                    →
                  </button>
                </div>
              </>
            )}
          </>
        )}

        {/* 分割线 */}
        <div className="bg-linear-to-r from-transparent via-white/20 to-transparent mb-6 h-px" />

        {/* 歌曲网格 */}
        {displaySongs.length === 0 ? (
          <div className="py-20 text-white/60 text-xl text-center">
            {t("collection/CollectionPage.EmptyCollection")}
          </div>
        ) : (
      <div className="justify-center gap-3 sm:gap-[0.6rem] grid grid-cols-[minmax(0,20.6rem)] sm:grid-cols-[repeat(auto-fit,minmax(20rem,20.6rem))] mx-auto p-0 sm:p-2 w-full max-w-350 min-w-0">
            {displaySongs.map((song, index) => (
              <div key={song.id} className="relative">
                <SongCard song={song} index={index} disableLink={isManaging} />
                {isManaging && (
                  <motion.button
                    whileHover={{ scale: 1.15 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveSong(song.id);
                    }}
                    className="top-2 right-2 z-10 absolute flex justify-center items-center bg-red-500/80 hover:bg-red-500 shadow-lg border-none rounded-full w-6 h-6 font-bold text-white text-base leading-none cursor-pointer"
                    title={t("collection/CollectionPage.RemoveFromCollection")}
                  >
                    ×
                  </motion.button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* 管理模式: 操作按钮 */}
        {isManaging && (
          <div className="flex justify-center items-center gap-4 mt-10">
            <button
              onClick={handleCancel}
              className="bg-white/10 hover:bg-white/20 shadow-lg backdrop-blur-md px-6 py-2.5 border border-white/20 rounded-xl font-bold text-white transition-all cursor-pointer"
            >
              {t("collection/CollectionPage.Cancel")}
            </button>
            <button
              onClick={handleSubmit}
              disabled={!hasChanges || isSubmitting}
              className="bg-blue-500/80 hover:bg-blue-500 disabled:bg-white/10 px-6 py-2.5 border-none rounded-xl font-bold text-white disabled:text-white/30 transition-all cursor-pointer disabled:cursor-not-allowed"
            >
              {isSubmitting ? '...' : t("collection/CollectionPage.Submit")}
            </button>
          </div>
        )}
      </div>
    </PageLayout>
  );
}
