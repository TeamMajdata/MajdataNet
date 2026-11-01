/**
 * 收藏 Hook - 基于 SWR 的轻量状态管理
 */

import { useTranslation } from 'react-i18next';
import { useMemo, useState, useCallback } from 'react';
import useSWR from 'swr';
import { toast } from 'react-toastify';
import { endpoints } from '@/config/api';
import { useUserContext } from '@/hooks';
import type { Collection, CollectionDanInfo } from '@/types';

import { apiRequest } from '@/utils/apiClient';

export async function fetchFavoriteCollections(url: string): Promise<Collection[]> {
  const collections = await apiRequest<CollectionDanInfo[]>(url);
  return collections.map(collection => ({ ...collection, count: collection.songHashs.length }));
}

export function useFavorites() {
  const { t } = useTranslation();
  const { user } = useUserContext();
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());

  const { data, isLoading, mutate } = useSWR<Collection[]>(
    user ? endpoints.favorite.list : null,
    fetchFavoriteCollections,
    { revalidateOnFocus: false }
  );

  const favoriteIds = useMemo(() => new Set(data?.map((c) => c.id) ?? []), [data]);

  const toggleFavorite = useCallback(async (
    collectionId: string,
    successMessages?: { added: string; removed: string }
  ) => {
    if (!user) {
      toast.info(t("shared/useFavorites.PleaseLogin"));
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
        toast.success(
          isFavorited
            ? (successMessages?.removed ?? t("shared/useFavorites.UnfavoriteSuccess"))
            : (successMessages?.added ?? t("shared/useFavorites.FavoriteSuccess"))
        );
        mutate();
      } else {
        toast.error(t("shared/useFavorites.OperationFailed"));
      }
    } catch {
      toast.error(t("shared/useFavorites.OperationFailed"));
    } finally {
      setPendingIds((prev) => {
        const next = new Set(prev);
        next.delete(collectionId);
        return next;
      });
    }
  }, [user, favoriteIds, mutate, t]);

  const isPending = useCallback((id: string) => pendingIds.has(id), [pendingIds]);

  return { favoriteIds, favorites: data, isLoadingFavorites: isLoading, toggleFavorite, isPending };
}
