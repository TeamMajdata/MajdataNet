/**
 * 收藏 Hook - 基于 SWR 的轻量状态管理
 */

import { useMemo, useState, useCallback } from 'react';
import useSWR from 'swr';
import { toast } from 'react-toastify';
import { endpoints } from '@/config/api';
import { useLoc, useUserContext } from '@/hooks';
import type { Collection } from '@/types';

const fetcher = (url: string) => fetch(url, { mode: 'cors', credentials: 'include' }).then((res) => res.json());

export function useFavorites() {
  const loc = useLoc();
  const { user } = useUserContext();
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());

  const { data, isLoading, mutate } = useSWR<Collection[]>(
    user ? endpoints.favorite.list : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  const favoriteIds = useMemo(() => new Set(data?.map((c) => c.id) ?? []), [data]);

  const toggleFavorite = useCallback(async (collectionId: string) => {
    if (!user) {
      toast.info(loc('PleaseLogin', '请先登录'));
      return;
    }
    const isFavorited = favoriteIds.has(collectionId);
    setPendingIds((prev) => new Set(prev).add(collectionId));
    try {
      const res = await fetch(endpoints.favorite.diff, {
        method: isFavorited ? 'DELETE' : 'POST',
        mode: 'cors',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([collectionId]),
      });
      if (res.ok) {
        toast.success(isFavorited ? loc('UnfavoriteSuccess', '已取消收藏') : loc('FavoriteSuccess', '收藏成功'));
        mutate();
      } else {
        toast.error(loc('OperationFailed', '操作失败'));
      }
    } catch {
      toast.error(loc('OperationFailed', '操作失败'));
    } finally {
      setPendingIds((prev) => {
        const next = new Set(prev);
        next.delete(collectionId);
        return next;
      });
    }
  }, [user, favoriteIds, mutate, loc]);

  const isPending = useCallback((id: string) => pendingIds.has(id), [pendingIds]);

  return { favoriteIds, favorites: data, isLoadingFavorites: isLoading, toggleFavorite, isPending };
}
