import { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import useSWR from 'swr';
import { useDebouncedCallback } from 'use-debounce';
import { motion } from 'framer-motion';
import { PageLayout, SongMosaicCard, LoadingSpinner } from '@/components';
import { endpoints } from '@/config/api';
import { setLanguage } from '@/utils/i18n';
import { useLoc, useUserContext } from '@/hooks';
import type { CollectionSongList, Song } from '@/types';

const fetcher = (url: string) =>
  fetch(url, { mode: 'cors', credentials: 'include' }).then((res) => res.json());

export default function CollectionPage() {
  const loc = useLoc();
  const [searchParams] = useSearchParams();
  const id = searchParams.get('id');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setLanguage(localStorage.getItem('language') || navigator.language).then(() => setReady(true));
  }, []);

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
  const [addedHashes, setAddedHashes] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [visibilityDraft, setVisibilityDraft] = useState<number | null>(null);
  const [nameDraft, setNameDraft] = useState<string | null>(null);
  const [descriptionDraft, setDescriptionDraft] = useState<string | null>(null);

  // 搜索状态
  const [searchQuery, setSearchQuery] = useState('');
  const [addingSongId, setAddingSongId] = useState<string | null>(null);
  const [searchPage, setSearchPage] = useState(0);
  const [searchMaxPage, setSearchMaxPage] = useState(999999);
  const [searchSortType, setSearchSortType] = useState(0);

  const sortWords = ['', 'likep', 'commp', 'playp'];

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
    loc('UploadDate', '上传日期'),
    loc('LikeCount', '点赞数'),
    loc('CommentCount', '评论数'),
    loc('PlayCount', '播放数'),
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

  // 添加歌曲到歌单（同时获取 hash）
  const handleAddSong = async (song: Song) => {
    if (allExistingIds.has(song.id) || addingSongId) return;

    // 先尝试从搜索结果中获取 hash（API 可能返回了但 TS 类型未声明）
    let hash = song.hash;

    if (!hash) {
      setAddingSongId(song.id);
      try {
        const summary = await fetch(endpoints.maichart.summary(song.id), {
          mode: 'cors',
          credentials: 'include',
        }).then((res) => res.json());
        hash = summary?.hash;
      } catch {
        // ignore
      }
      setAddingSongId(null);
    }

    if (!hash) {
      toast.error(loc('FetchHashFailed', '获取歌曲 hash 失败'));
      return;
    }

    setAddedIds((prev) => [...prev, song.id]);
    setAddedSongs((prev) => [...prev, song]);
    setAddedHashes((prev) => [...prev, hash]);
  };

  // 从歌单移除歌曲
  const handleRemoveSong = (songId: string) => {
    if (addedIds.includes(songId)) {
      const idx = addedIds.indexOf(songId);
      setAddedIds((prev) => prev.filter((id) => id !== songId));
      setAddedSongs((prev) => prev.filter((s) => s.id !== songId));
      setAddedHashes((prev) => prev.filter((_, i) => i !== idx));
    } else {
      setRemovedIds((prev) => (prev.includes(songId) ? prev : [...prev, songId]));
    }
  };

  // 提交变更
  const handleSubmit = async () => {
    if (!id || !hasChanges || isSubmitting) return;

    setIsSubmitting(true);

    // 构造当前 hash 列表：原有（未移除） + 新增
    const currentHashes: string[] = [];
    for (const song of collectionData?.items || []) {
      if (!removedIds.includes(song.id)) {
        currentHashes.push(song.hash);
      }
    }
    currentHashes.push(...addedHashes);

    const body: Record<string, unknown> = {};
    if (addedIds.length > 0 || removedIds.length > 0) {
      body.items = currentHashes;
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
        toast.success(loc('SaveSuccess', '保存成功'));
        setIsManaging(false);
        setAddedIds([]);
        setRemovedIds([]);
        setAddedSongs([]);
        setAddedHashes([]);
        setVisibilityDraft(null);
        setNameDraft(null);
        setDescriptionDraft(null);
        setSearchQuery('');
        setSearchPage(0);
        setSearchMaxPage(999999);
        setSearchSortType(0);
        mutate();
      } else {
        toast.error(loc('SaveFailed', '保存失败'));
      }
    } catch {
      toast.error(loc('SaveFailed', '保存失败'));
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
    setAddedHashes([]);
    setVisibilityDraft(null);
    setNameDraft(null);
    setDescriptionDraft(null);
    setSearchQuery('');
    setSearchPage(0);
    setSearchMaxPage(999999);
    setSearchSortType(0);
  };

  // Loading states
  if (!ready) {
    return (
      <div className="flex justify-center items-center h-screen">
        <LoadingSpinner size={50} />
      </div>
    );
  }

  if (!id) {
    return (
      <PageLayout>
        <div className="flex justify-center items-center min-h-[60vh]">
          <div className="text-ink text-2xl">{loc('InvalidParams', '参数错误')}</div>
        </div>
      </PageLayout>
    );
  }

  if (error) {
    return (
      <PageLayout>
        <div className="flex justify-center items-center min-h-[60vh]">
          <div className="text-ink text-2xl">{loc('ServerError', '服务器错误')}</div>
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
          <div className="text-ink text-2xl">{loc('CollectionNotFound', '歌单不存在')}</div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div className="px-4 py-8 w-full">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-start">
            <div className="flex-1 min-w-0">
              {isManaging ? (
                <input
                  type="text"
                  value={currentName}
                  onChange={(e) => setNameDraft(e.target.value)}
                  className="bg-transparent py-1 border-line-strong focus:border-primary border-b-2 outline-none w-full font-bold text-ink text-3xl"
                />
              ) : (
                <h1 className="font-bold text-ink text-3xl">{collectionData.name}</h1>
              )}
              {isManaging ? (
                <input
                  type="text"
                  value={currentDescription}
                  onChange={(e) => setDescriptionDraft(e.target.value)}
                  placeholder={loc('DescriptionPlaceholder', '描述（可选）')}
                  className="bg-transparent mt-2 py-1 border-line focus:border-primary border-b outline-none w-full text-ink-2 placeholder:text-ink-3 text-sm"
                />
              ) : (
                collectionData.description && (
                  <p className="mt-2 text-ink-2">{collectionData.description}</p>
                )
              )}
              <div className="mt-2 text-ink-3 text-sm">
                {loc('Creator', '创建者')}: {collectionData.createdBy} · {displaySongs.length}{' '}
                {loc('Songs', '首')} · {currentVisibility === 1 ? loc('Public', '公开') : loc('Private', '私有')}
              </div>
            </div>
            {isCreator && !isManaging && (
              <button
                onClick={() => setIsManaging(true)}
                className="bg-surface hover:border-primary shadow-card px-4 py-2 border border-line rounded-lg font-semibold text-ink-2 hover:text-primary transition-colors cursor-pointer"
              >
                {loc('Manage', '管理')}
              </button>
            )}
          </div>
        </div>

        {/* 管理模式: 可见性切换 + 搜索栏 */}
        {isManaging && (
          <>
            <div className="flex justify-center mb-4">
              <div className="inline-flex bg-surface-2 p-1 border border-line rounded-full">
                <button
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors cursor-pointer ${currentVisibility === 0
                    ? 'bg-primary text-white'
                    : 'text-ink-2 hover:text-ink'
                    }`}
                  onClick={() => setVisibilityDraft(0)}
                >
                  {loc('Private', '私有')}
                </button>
                <button
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors cursor-pointer ${currentVisibility === 1
                    ? 'bg-primary text-white'
                    : 'text-ink-2 hover:text-ink'
                    }`}
                  onClick={() => setVisibilityDraft(1)}
                >
                  {loc('Public', '公开')}
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
                    placeholder={loc('SearchToAdd', '搜索歌曲以添加...')}
                    className="bg-surface px-6 py-3 pr-10 border border-line focus:border-primary rounded-full outline-none w-full text-ink placeholder:text-ink-3 text-sm"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        setSearchPage(0);
                        setSearchMaxPage(999999);
                      }}
                      className="top-1/2 right-3 absolute bg-transparent border-none text-ink-3 hover:text-ink text-xl -translate-y-1/2 cursor-pointer"
                    >
                      ×
                    </button>
                  )}
                </div>
                <select
                  value={searchSortType}
                  onChange={(e) => setSearchSortType(parseInt(e.target.value))}
                  className="bg-surface px-2 py-1 border border-line rounded-full outline-none h-10 overflow-hidden text-ink text-xs sm:text-sm text-center whitespace-nowrap appearance-none cursor-pointer shrink-0"
                >
                  {searchSortOptions.map((label, i) => (
                    <option key={i} value={i}>{label}</option>
                  ))}
                </select>
              </div>
            </div>

            {(isSearchLoading || addingSongId) && (
              <div className="flex justify-center py-4">
                <LoadingSpinner size={30} />
              </div>
            )}

            {searchResults.length > 0 && (
              <>
                <div className="gap-x-6 gap-y-12 grid grid-cols-12 w-full">
                  {searchResults.map((song, index) => {
                    const isAdded = allExistingIds.has(song.id);
                    return (
                      <div key={song.id} className="relative col-span-12 md:col-span-2">
                        <SongMosaicCard song={song} index={index} />
                        <motion.button
                          whileHover={{ scale: 1.15 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (isAdded) handleRemoveSong(song.id)
                            else handleAddSong(song);
                          }}
                          disabled={!!addingSongId}
                          className={`top-3 left-3 z-20 absolute flex justify-center items-center shadow-card border-none rounded-full w-7 h-7 font-bold text-white text-base leading-none cursor-pointer transition-colors ${isAdded
                            ? 'bg-danger hover:bg-danger'
                            : 'bg-primary hover:bg-primary-hover disabled:bg-surface-2 disabled:cursor-not-allowed'
                            }`}
                          title={isAdded ? loc('RemoveFromCollection', '从歌单移除') : loc('Add', '添加')}
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
                    className={`px-4 py-1.5 border-none rounded-md text-sm cursor-pointer ${searchPage <= 0 ? 'bg-surface-2 text-ink-3 cursor-not-allowed opacity-60' : 'bg-primary text-white'}`}
                    disabled={searchPage <= 0}
                    onClick={() => setSearchPage((p) => p - 1)}
                  >
                    ←
                  </button>
                  <span className="text-ink-2 text-sm">
                    {searchPage + 1}
                  </span>
                  <button
                    className={`px-4 py-1.5 border-none rounded-md text-sm cursor-pointer ${searchPage >= searchMaxPage ? 'bg-surface-2 text-ink-3 cursor-not-allowed opacity-60' : 'bg-primary text-white'}`}
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
        <div className="bg-line mb-6 h-px" />

        {/* 歌曲网格 */}
        {displaySongs.length === 0 ? (
          <div className="py-20 text-ink-2 text-xl text-center">
            {loc('EmptyCollection', '歌单为空')}
          </div>
        ) : (
          <div className="gap-x-6 gap-y-12 grid grid-cols-12 w-full">
            {displaySongs.map((song, index) => (
              <div key={song.id} className="relative col-span-12 md:col-span-2">
                <SongMosaicCard song={song} index={index} />
                {isManaging && (
                  <motion.button
                    whileHover={{ scale: 1.15 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveSong(song.id);
                    }}
                    className="top-3 left-3 z-20 absolute flex justify-center items-center bg-danger hover:bg-danger shadow-card border-none rounded-full w-7 h-7 font-bold text-white text-base leading-none cursor-pointer"
                    title={loc('RemoveFromCollection', '从歌单移除')}
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
              className="bg-surface hover:border-primary shadow-card px-6 py-2.5 border border-line rounded-lg font-semibold text-ink-2 hover:text-primary transition-colors cursor-pointer"
            >
              {loc('Cancel', '取消')}
            </button>
            <button
              onClick={handleSubmit}
              disabled={!hasChanges || isSubmitting}
              className="bg-primary hover:bg-primary-hover disabled:bg-surface-2 px-6 py-2.5 border-none rounded-lg font-bold text-white disabled:text-ink-3 transition-colors cursor-pointer disabled:cursor-not-allowed"
            >
              {isSubmitting ? '...' : loc('Submit', '提交')}
            </button>
          </div>
        )}
      </div>
    </PageLayout>
  );
}
