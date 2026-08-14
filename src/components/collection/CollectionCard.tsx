import { useState, useEffect, memo } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { motion, AnimatePresence } from "framer-motion";
import useSWR from "swr";
import { LazyLoad, CoverPic, LoadingSpinner } from "@/components";
import { endpoints } from "@/config/api";
import type { Collection, CollectionSongList } from "@/types";
import { useLoc, useFavorites } from "@/hooks";

const fetcher = (url: string) =>
  fetch(url, { mode: "cors", credentials: "include" }).then((res) =>
    res.json(),
  );

interface CollectionCardProps {
  collection: Collection;
  isManaging?: boolean;
  onDelete?: () => void;
}

const CollectionCardContent = memo(
  ({ collection, isManaging, onDelete }: CollectionCardProps) => {
    const loc = useLoc();
    const navigate = useNavigate();
    const { favoriteIds, toggleFavorite, isPending } = useFavorites();

    const url = endpoints.collection.songlist(collection.id);
    const { data, isLoading } = useSWR<CollectionSongList>(url, fetcher, {
      revalidateOnFocus: false,
    });

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
          method: "POST",
          mode: "cors",
          credentials: "include",
        });
        if (res.ok) {
          toast.success(loc("DeleteSuccess", "删除成功"));
          onDelete?.();
        } else {
          toast.error(loc("DeleteFailed", "删除失败"));
        }
      } catch {
        toast.error(loc("DeleteFailed", "删除失败"));
      } finally {
        setIsDeleting(false);
      }
    };

    return (
      <div className="relative">
        <div
          className={`flex bg-surface hover:shadow-card-hover w-full h-35 overflow-hidden border border-line shadow-card transition-all ${isManaging ? "cursor-default" : "cursor-pointer hover:-translate-y-1"}`}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => {
            setIsHovered(false);
            setCurrentCoverIndex(0);
          }}
          onClick={() => {
            if (isManaging) return;
            navigate("/collection?id=" + collection.id);
          }}
        >
          {/* Left side: Cover（方形，覆盖 CoverPic 的圆形样式） */}
          <div className="relative bg-surface-2 w-35 h-35 shrink-0 [&_img]:!rounded-none [&_img]:!float-none [&_img]:!border-0">
            {isLoading ? (
              <div className="flex justify-center items-center w-full h-full">
                <LoadingSpinner size="30px" />
              </div>
            ) : data && data.items && data.items.length > 0 ? (
              <CoverPic id={data.items[currentCoverIndex].id} />
            ) : (
              <div className="flex flex-col justify-center items-center bg-surface-2 w-full h-full text-ink-3 text-xs">
                <span>{loc("NoCover", "无封面")}</span>
              </div>
            )}
          </div>

          {/* Right side: Info */}
          <div className="flex flex-col flex-1 p-3 overflow-hidden text-sm">
            <div
              className="font-bold text-ink text-lg truncate"
              title={collection.name}
            >
              {collection.name}
            </div>
            <div
              className="flex-1 mt-1 text-ink-2 line-clamp-2"
              title={collection.description || ""}
            >
              {collection.description || loc("NoDescription", "暂无描述")}
            </div>
            <div className="mt-1 text-ink-3 truncate">
              {loc("CreatorLabel", "创建者")}: {collection.createdBy}
            </div>
            <div className="mt-1 text-ink-3 truncate">
              {loc("CountLabel", "数量")}: {collection.count}
            </div>
          </div>
        </div>

        {/* Favorite button */}
        {!isManaging && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={(e) => {
              e.stopPropagation();
              toggleFavorite(collection.id);
            }}
            disabled={isFavoriteLoading}
            className={`absolute top-2 right-2 z-10 flex justify-center items-center border rounded-full w-7 h-7 text-sm cursor-pointer shadow-card transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
              isFavorited
                ? "bg-pink-500 hover:bg-pink-600 border-pink-500 text-white"
                : "bg-surface border-line text-ink-3 hover:text-pink-500 hover:border-pink-400"
            }`}
            title={
              isFavorited
                ? loc("Unfavorite", "取消收藏")
                : loc("Favorite", "收藏")
            }
          >
            {isFavoriteLoading ? (
              <LoadingSpinner size="14px" />
            ) : isFavorited ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="currentColor"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            )}
          </motion.button>
        )}

        {/* Delete button (management mode) */}
        <AnimatePresence>
          {isManaging && !confirmDelete && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={(e) => {
                e.stopPropagation();
                setConfirmDelete(true);
              }}
              className="top-2 right-2 z-10 absolute flex justify-center items-center bg-danger hover:bg-danger shadow-card border-none rounded-full w-7 h-7 text-white text-sm transition-colors cursor-pointer"
              title={loc("Delete", "删除")}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 6h18" />
                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                <line x1="10" y1="11" x2="10" y2="17" />
                <line x1="14" y1="11" x2="14" y2="17" />
              </svg>
            </motion.button>
          )}
        </AnimatePresence>

        {/* Delete confirmation overlay */}
        <AnimatePresence>
          {confirmDelete && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="z-20 absolute inset-0 flex flex-col justify-center items-center bg-surface border border-line rounded-xl"
            >
              <p className="mb-3 font-medium text-ink text-sm">
                {loc("ConfirmDeleteCollection", "确认删除此歌单？")}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete();
                  }}
                  disabled={isDeleting}
                  className="bg-danger hover:bg-danger disabled:opacity-50 px-4 py-1.5 border-none rounded-md font-medium text-white text-sm transition-colors cursor-pointer disabled:cursor-not-allowed"
                >
                  {isDeleting ? "..." : loc("Confirm", "确认")}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setConfirmDelete(false);
                  }}
                  disabled={isDeleting}
                  className="bg-surface border border-line hover:border-primary px-4 py-1.5 rounded-md text-ink-2 hover:text-primary text-sm transition-colors cursor-pointer disabled:cursor-not-allowed"
                >
                  {loc("Cancel", "取消")}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  },
);

export default function CollectionCard({
  collection,
  isManaging,
  onDelete,
}: CollectionCardProps) {
  return (
    <LazyLoad height={140}>
      <CollectionCardContent
        collection={collection}
        isManaging={isManaging}
        onDelete={onDelete}
      />
    </LazyLoad>
  );
}
