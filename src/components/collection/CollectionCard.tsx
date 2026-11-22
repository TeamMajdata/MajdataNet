import { useTranslation } from 'react-i18next';
import { useState, useEffect, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { m, AnimatePresence } from 'framer-motion';
import useSWR from 'swr';
import { LazyLoad, CoverPic, LoadingSpinner } from '@/components';
import { endpoints } from '@/config/api';
import type { Collection, CollectionSongList } from '@/types';
import { useFavorites } from '@/hooks';
import { LuListMusic, LuUser } from 'react-icons/lu';
import { CARD_SURFACE_CLASS } from '@/components/ui/surface';

const fetcher = (url: string) => fetch(url, { mode: 'cors', credentials: 'include' }).then((res) => res.json());

interface CollectionCardProps {
  collection: Collection;
  isManaging?: boolean;
  onDelete?: () => void;
}

const CollectionCardContent = memo(({ collection, isManaging, onDelete }: CollectionCardProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { favoriteIds, toggleFavorite, isPending } = useFavorites();

  const url = endpoints.collection.songlist(collection.id);
  const { data, isLoading } = useSWR<CollectionSongList>(url, fetcher, { revalidateOnFocus: false });

  const isFavorited = favoriteIds.has(collection.id);
  const isFavoriteLoading = isPending(collection.id);

  const [currentCoverIndex, setCurrentCoverIndex] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (!isHovered) return;
    if (!data || !data.items || data.items.length <= 1) return;

    const timer = setInterval(() => {
      setCurrentCoverIndex((prev) => (prev + 1) % data.items.length);
    }, 1000);

    return () => clearInterval(timer);
  }, [data, isHovered]);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch(endpoints.collection.destroy(collection.id), {
        method: 'POST',
        mode: 'cors',
        credentials: 'include',
      });
      if (res.ok) {
        toast.success(t("collection/CollectionCard.DeleteSuccess"));
        onDelete?.();
      } else {
        toast.error(t("collection/CollectionCard.DeleteFailed"));
      }
    } catch {
      toast.error(t("collection/CollectionCard.DeleteFailed"));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    // 悬停上浮放在外层，收藏/删除按钮跟着整张卡片一起动
    <div className={`relative transition-transform duration-250 ease-in-out ${isManaging ? '' : 'md:hover:-translate-y-1.25'}`}>
      <div
        className={`flex gap-3 ${CARD_SURFACE_CLASS} p-2.5 w-full h-36 overflow-hidden ${isManaging ? 'cursor-default ring-1 ring-red-500/30' : 'cursor-pointer'}`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => { setIsHovered(false); setCurrentCoverIndex(0); }}
        onClick={() => {
          if (isManaging) return;
          navigate('/collection?id=' + collection.id);
        }}>

        {/* Left side: Cover（悬停时轮播歌单里的封面） */}
        <div className="relative h-full aspect-square shrink-0">
          {isLoading ? (
            <div className="flex justify-center items-center bg-white/[0.04] rounded-lg w-full h-full">
              <LoadingSpinner size="24px" />
            </div>
          ) : data && data.items && data.items.length > 0 ? (
            <CoverPic id={data.items[currentCoverIndex] ?? data.items[0]} radiusClassName="rounded-lg" />
          ) : (
            <div className="flex flex-col justify-center items-center gap-1.5 bg-white/[0.04] rounded-lg w-full h-full text-white/30 text-xs">
              <LuListMusic aria-hidden="true" className="w-6 h-6" />
              <span>{t("collection/CollectionCard.NoCover")}</span>
            </div>
          )}
        </div>

        {/* Right side: Info */}
        <div className="flex flex-col flex-1 pr-8 min-w-0">
          <div className="font-bold text-white text-base truncate leading-snug" title={collection.name}>{collection.name}</div>
          <div
            className={`mt-1 text-[0.8rem] line-clamp-2 leading-relaxed ${collection.description ? 'text-white/60' : 'text-white/30'}`}
            title={collection.description || ''}
          >
            {collection.description || t("collection/CollectionCard.NoDescription")}
          </div>
          <div className="flex items-center gap-3 mt-auto min-w-0 text-white/50 text-xs">
            <span className="flex items-center gap-1 min-w-0" title={t("collection/CollectionCard.CreatorLabel")}>
              <LuUser aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{collection.createdBy}</span>
            </span>
            <span className="flex items-center gap-1 tabular-nums shrink-0" title={t("collection/CollectionCard.CountLabel")}>
              <LuListMusic aria-hidden="true" className="w-3.5 h-3.5" />
              {collection.count}
            </span>
          </div>
        </div>
      </div>

      {/* Favorite button */}
      {!isManaging && (
        <m.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={(e) => {
            e.stopPropagation();
            toggleFavorite(collection.id);
          }}
          disabled={isFavoriteLoading}
          className={`absolute top-2.5 right-2.5 z-10 flex justify-center items-center border-none rounded-lg w-7 h-7 text-sm cursor-pointer transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${isFavorited
            ? 'bg-pink-500/15 hover:bg-pink-500/25 text-pink-300'
            : 'bg-transparent hover:bg-white/10 text-white/45 hover:text-white'
            }`}
          title={isFavorited ? t("collection/CollectionCard.Unfavorite") : t("collection/CollectionCard.Favorite")}
        >
          {isFavoriteLoading ? (
            <LoadingSpinner size="14px" />
          ) : isFavorited ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>
          )}
        </m.button>
      )}

      {/* Delete button (management mode) */}
      <AnimatePresence>
        {isManaging && !confirmDelete && (
          <m.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={(e) => {
              e.stopPropagation();
              setConfirmDelete(true);
            }}
            className="top-2.5 right-2.5 z-10 absolute flex justify-center items-center bg-red-500/15 hover:bg-red-500/30 border-none rounded-lg w-7 h-7 text-red-300 hover:text-red-200 text-sm transition-colors cursor-pointer"
            title={t("collection/CollectionCard.Delete")}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" /></svg>
          </m.button>
        )}
      </AnimatePresence>

      {/* Delete confirmation overlay */}
      <AnimatePresence>
        {confirmDelete && (
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="z-20 absolute inset-0 flex flex-col justify-center items-center bg-black/75 backdrop-blur-sm rounded-2xl"
          >
            <p className="mb-3 font-medium text-white text-sm">{t("collection/CollectionCard.ConfirmDeleteCollection")}</p>
            <div className="flex gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete();
                }}
                disabled={isDeleting}
                className="bg-red-500/80 hover:bg-red-500 disabled:opacity-50 px-4 py-1.5 border-none rounded-lg font-medium text-white text-sm transition-colors cursor-pointer disabled:cursor-not-allowed"
              >
                {isDeleting ? '...' : t("collection/CollectionCard.Confirm")}
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setConfirmDelete(false);
                }}
                disabled={isDeleting}
                className="bg-white/10 hover:bg-white/20 px-4 py-1.5 border-none rounded-lg text-white text-sm transition-colors cursor-pointer disabled:cursor-not-allowed"
              >
                {t("collection/CollectionCard.Cancel")}
              </button>
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
});

export default function CollectionCard({ collection, isManaging, onDelete }: CollectionCardProps) {
  return (
    <LazyLoad height={144}>
      <CollectionCardContent collection={collection} isManaging={isManaging} onDelete={onDelete} />
    </LazyLoad>
  );
}
