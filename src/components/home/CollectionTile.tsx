import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import useSWR from 'swr';
import { LuListMusic } from 'react-icons/lu';
import { endpoints } from '@/config/api';
import { apiFetcher } from '@/utils/apiClient';
import { useFavorites } from '@/hooks';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { SubscribeIcon } from '@/components/collection/CollectionSubscribeButton';
import type { Collection, CollectionSongList } from '@/types';

/**
 * 首页歌单横栏的卡片：和谱面卡片一样的大封面（歌单第一张谱面的封面），像视频网站的播放列表那样，
 * 封面上面露出两层“叠在后面的卡片”，右下角是谱面数量；右上角是订阅按钮（和歌单页的“订阅”同一个操作）。
 */
export default function CollectionTile({ collection }: { collection: Collection }) {
  const { t } = useTranslation();
  const href = '/collection?id=' + collection.id;
  const { data } = useSWR<CollectionSongList>(endpoints.collection.songlist(collection.id), apiFetcher, { revalidateOnFocus: false });
  const coverId = data?.items?.[0];
  const { favoriteIds, toggleFavorite, isPending } = useFavorites();
  const subscribed = favoriteIds.has(collection.id);
  const pending = isPending(collection.id);
  const subscribeLabel = subscribed ? t('collection/CollectionPage.Subscribed') : t('collection/CollectionPage.Subscribe');

  return (
    <div className="group min-w-0">
      {/* 上面两层是“后面叠着的卡片”，越往后越窄、越淡 */}
      <div className="relative pt-2">
        <div aria-hidden="true" className="top-0 absolute inset-x-4 bg-white/12 rounded-t-lg h-2" />
        <div aria-hidden="true" className="top-1 absolute inset-x-2 bg-white/22 rounded-t-lg h-2" />
        <Link to={href} className="block relative bg-white/5 rounded-xl aspect-[4/3] overflow-hidden" aria-label={collection.name}>
          {coverId ? (
            <img src={endpoints.maichart.image(coverId)} alt="" loading="lazy" draggable={false} className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300" />
          ) : (
            <span className="grid place-items-center w-full h-full text-white/30"><LuListMusic aria-hidden="true" className="w-8 h-8" /></span>
          )}
          {/* 谱面数量 */}
          <span className="right-2 bottom-2 absolute flex items-center gap-1 bg-black/70 px-1.5 py-0.5 rounded font-semibold text-white text-xs tabular-nums pointer-events-none"
            title={t('collection/CollectionCard.CountLabel')}>
            <LuListMusic aria-hidden="true" className="w-3.5 h-3.5" />{collection.count}
          </span>
        </Link>
        <button
          type="button"
          onClick={() => toggleFavorite(collection.id, {
            added: t('collection/CollectionPage.SubscribeSuccess'),
            removed: t('collection/CollectionPage.UnsubscribeSuccess'),
          })}
          disabled={pending}
          aria-pressed={subscribed}
          aria-label={subscribeLabel}
          title={subscribeLabel}
          className={`top-4 right-2 absolute grid place-items-center backdrop-blur-sm rounded-lg w-8 h-8 transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 ${subscribed ? 'bg-blue-500/85 hover:bg-blue-500 text-white' : 'bg-black/55 hover:bg-black/70 text-white/85 hover:text-white'}`}
        >
          {pending ? <LoadingSpinner size={14} /> : <SubscribeIcon subscribed={subscribed} size={15} />}
        </button>
      </div>
      <Link to={href} className="block mt-2.5 font-semibold text-white group-hover:text-blue-200 text-sm truncate no-underline transition-colors">
        {collection.name}
      </Link>
      <div className="mt-0.5 text-white/50 text-xs truncate">{collection.createdBy}</div>
    </div>
  );
}
