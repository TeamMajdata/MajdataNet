import { useState, useEffect, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { motion, AnimatePresence } from 'framer-motion';
import useSWR from 'swr';
import { LazyLoad, CoverPic, LoadingSpinner } from '@/components';
import { endpoints } from '@/config/api';
import type { Collection, CollectionSongList } from '@/types';
import { useLoc } from '@/hooks';

const fetcher = (url: string) => fetch(url, { mode: 'cors', credentials: 'include' }).then((res) => res.json());

interface CollectionCardProps {
  collection: Collection;
  isManaging?: boolean;
  onDelete?: () => void;
}

const CollectionCardContent = memo(({ collection, isManaging, onDelete }: CollectionCardProps) => {
  const loc = useLoc();
  const navigate = useNavigate();
  const url = endpoints.collection.songlist(collection.id);
  const { data, isLoading } = useSWR<CollectionSongList>(url, fetcher, { revalidateOnFocus: false });

  const [currentCoverIndex, setCurrentCoverIndex] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!data || !data.items || data.items.length === 0) return;
    if (data.items.length === 1) return;

    const timer = setInterval(() => {
      setCurrentCoverIndex((prev) => (prev + 1) % data.items.length);
    }, 3000);

    return () => clearInterval(timer);
  }, [data]);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch(endpoints.collection.destroy(collection.id), {
        method: 'POST',
        mode: 'cors',
        credentials: 'include',
      });
      if (res.ok) {
        toast.success(loc('DeleteSuccess', '删除成功'));
        onDelete?.();
      } else {
        toast.error(loc('DeleteFailed', '删除失败'));
      }
    } catch {
      toast.error(loc('DeleteFailed', '删除失败'));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="relative">
      <div
        className={`flex bg-[rgba(20,20,25,0.8)] shadow-lg hover:shadow-xl border rounded-xl w-full h-35 overflow-hidden transition-all ${isManaging ? 'cursor-default border-red-500/30' : 'cursor-pointer border-white/10 hover:-translate-y-1'}`}
        onClick={() => {
          if (isManaging) return;
          navigate('/collection?id=' + collection.id);
        }}>

        {/* Left side: Cover */}
        <div className="relative bg-black/40 w-35 h-35 shrink-0">
          {isLoading ? (
            <div className="flex justify-center items-center w-full h-full">
              <LoadingSpinner size="30px" />
            </div>
          ) : data && data.items && data.items.length > 0 ? (
            <CoverPic id={data.items[currentCoverIndex].id} />
          ) : (
            <div className="flex flex-col justify-center items-center bg-black/60 w-full h-full text-white/50 text-xs">
              <span>No</span>
              <span>Cover</span>
            </div>
          )}
        </div>

        {/* Right side: Info */}
        <div className="flex flex-col flex-1 p-3 overflow-hidden text-sm">
          <div className="font-bold text-white text-lg truncate" title={collection.name}>{collection.name}</div>
          <div className="flex-1 mt-1 text-gray-400 line-clamp-2" title={collection.description || ''}>
            {collection.description || loc('NoDescription', '暂无描述')}
          </div>
          <div className="mt-1 text-gray-500 truncate">Creator: {collection.createdBy}</div>
          <div className="mt-1 text-gray-500 truncate">Count: {collection.count}</div>
        </div>
      </div>

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
            className="absolute top-2 right-2 z-10 flex justify-center items-center bg-red-500/70 hover:bg-red-500 border-none rounded-full w-7 h-7 text-white text-sm cursor-pointer shadow-lg backdrop-blur-sm transition-colors"
            title={loc('Delete', '删除')}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
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
            className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/75 backdrop-blur-sm rounded-xl"
          >
            <p className="text-white font-medium text-sm mb-3">{loc('ConfirmDeleteCollection', '确认删除此歌单？')}</p>
            <div className="flex gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete();
                }}
                disabled={isDeleting}
                className="bg-red-500/80 hover:bg-red-500 disabled:opacity-50 px-4 py-1.5 border-none rounded-lg text-white text-sm font-medium cursor-pointer transition-colors disabled:cursor-not-allowed"
              >
                {isDeleting ? '...' : loc('Confirm', '确认')}
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setConfirmDelete(false);
                }}
                disabled={isDeleting}
                className="bg-white/10 hover:bg-white/20 px-4 py-1.5 border-none rounded-lg text-white text-sm cursor-pointer transition-colors disabled:cursor-not-allowed"
              >
                {loc('Cancel', '取消')}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

export default function CollectionCard({ collection, isManaging, onDelete }: CollectionCardProps) {
  return (
    <LazyLoad height={140}>
      <CollectionCardContent collection={collection} isManaging={isManaging} onDelete={onDelete} />
    </LazyLoad>
  );
}
