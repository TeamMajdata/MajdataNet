import { useState, useEffect, memo } from 'react';
import useSWR from 'swr';
import { LazyLoad, CoverPic, LoadingSpinner } from '@/components';
import { endpoints } from '@/config/api';
import type { Collection, CollectionSongList } from '@/types';
import { useLoc } from '@/hooks';

const fetcher = (url: string) => fetch(url, { mode: 'cors', credentials: 'include' }).then((res) => res.json());

interface CollectionCardProps {
  collection: Collection;
}

const CollectionCardContent = memo(({ collection }: CollectionCardProps) => {
  const loc = useLoc();
  const url = endpoints.collection.songlist(collection.id);
  const { data, isLoading } = useSWR<CollectionSongList>(url, fetcher, { revalidateOnFocus: false });

  const [currentCoverIndex, setCurrentCoverIndex] = useState(0);

  useEffect(() => {
    if (!data || !data.items || data.items.length === 0) return;
    if (data.items.length === 1) return;

    const timer = setInterval(() => {
      setCurrentCoverIndex((prev) => (prev + 1) % data.items.length);
    }, 3000); // 3 seconds rotation

    return () => clearInterval(timer);
  }, [data]);

  return (
    <div className="flex bg-[rgba(20,20,25,0.8)] shadow-lg hover:shadow-xl border border-white/10 rounded-xl w-full h-[140px] overflow-hidden transition-transform hover:-translate-y-1">
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
  );
});

export default function CollectionCard({ collection }: CollectionCardProps) {
  return (
    <LazyLoad height={140}>
      <CollectionCardContent collection={collection} />
    </LazyLoad>
  );
}
