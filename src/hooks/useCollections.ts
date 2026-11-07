/**
 * 收藏夹 Hook - 基于 SWR 的轻量状态管理
 * 管理用户所有收藏夹及其包含的歌曲信息
 */

import { useTranslation } from 'react-i18next';
import { useMemo, useState, useCallback } from 'react';
import useSWR from 'swr';
import { toast } from 'react-toastify';
import { endpoints } from '@/config/api';
import { useUserContext } from '@/hooks';
import type { Collection, CollectionDanInfo } from '@/types';

const fetcher = (url: string) =>
  fetch(url, { mode: 'cors', credentials: 'include' }).then((res) => res.json());

/** 要加入或移出谱单的谱面 */
export interface CollectionChart {
  /** 谱面 Id（MaiChart.Id），谱单增删按它提交 */
  chartId: string;
  /** 谱面当前的 maidata hash，用于对照 hashlist 判断是否已在谱单中 */
  songHash: string;
}

export function useCollections() {
  const { t } = useTranslation();
  const { username } = useUserContext();
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());

  // 获取用户的所有收藏夹
  const {
    data: collections,
    error: collectionsError,
    isLoading: isLoadingCollections,
    mutate: mutateCollections,
  } = useSWR<Collection[]>(
    username ? endpoints.collection.list(0, 100, username) : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  const collectionIds = useMemo(
    () => collections?.map((c) => c.id) ?? [],
    [collections]
  );

  // 获取所有收藏夹的 hash 列表（用于判断歌曲是否在收藏夹中）
  const hashListsKey = username && collectionIds.length > 0
    ? `user-collections-hashlists-${username}`
    : null;

  const {
    data: hashListMap,
    isLoading: isLoadingHashLists,
    mutate: mutateHashLists,
  } = useSWR<Record<string, string[]>>(
    hashListsKey,
    async () => {
      const entries = await Promise.all(
        collectionIds.map(async (id) => {
          try {
            const res = await fetch(endpoints.collection.hashlist(id), {
              mode: 'cors',
              credentials: 'include',
            });
            if (res.ok) {
              const info: CollectionDanInfo = await res.json();
              return [id, info.songHashs] as const;
            }
          } catch { /* ignore */ }
          return [id, []] as const;
        })
      );
      return Object.fromEntries(entries);
    },
    { revalidateOnFocus: false }
  );

  // 判断歌曲是否在指定收藏夹中
  const isSongInCollection = useCallback(
    (collectionId: string, songHash?: string) => {
      if (!songHash || !hashListMap) return false;
      return ((collectionId in hashListMap) && (hashListMap[collectionId].includes(songHash))) ?? false;
    },
    [hashListMap]
  );

  // 切换歌曲在收藏夹中的状态（添加 / 移除）
  // hashlist 仍返回 hash，所以按 hash 判断是否已收录；增删请求按谱面 Id 提交
  const toggleSongInCollection = useCallback(
    async (collectionId: string, { chartId, songHash }: CollectionChart) => {
      if (!username) return;
      const isIn = isSongInCollection(collectionId, songHash);
      setPendingIds((prev) => new Set(prev).add(collectionId));
      try {
        const body = isIn
          ? { chartIdsToRemove: [chartId] }
          : { chartIdsToAdd: [chartId] };

        const res = await fetch(endpoints.collection.diff(collectionId), {
          method: 'POST',
          mode: 'cors',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });

        if (res.ok) {
          toast.success(
            isIn
              ? t("shared/useCollections.RemoveFromCollection")
              : t("shared/useCollections.AddToCollectionSuccess")
          );
          mutateCollections();
          mutateHashLists();
        } else {
          toast.error(t("shared/useCollections.OperationFailed"));
        }
      } catch {
        toast.error(t("shared/useCollections.OperationFailed"));
      } finally {
        setPendingIds((prev) => {
          const next = new Set(prev);
          next.delete(collectionId);
          return next;
        });
      }
    },
    [username, isSongInCollection, mutateCollections, mutateHashLists, t]
  );

  const isPending = useCallback((id: string) => pendingIds.has(id), [pendingIds]);

  return {
    collections,
    error: collectionsError,
    isLoading: isLoadingCollections || isLoadingHashLists,
    isSongInCollection,
    toggleSongInCollection,
    isPending,
    mutateCollections,
    mutateHashLists,
  };
}
