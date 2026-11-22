import { useTranslation } from 'react-i18next';
import { useFavorites } from '@/hooks';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

export default function CollectionSubscribeButton({ collectionId }: { collectionId: string }) {
  const { t } = useTranslation();
  const { favoriteIds, isLoadingFavorites, toggleFavorite, isPending } = useFavorites();
  const isSubscribed = favoriteIds.has(collectionId);
  const isSubscriptionPending = isPending(collectionId);

  return (
    // 和站内其他按钮同一套样式：未订阅是描边按钮，已订阅是蓝色实心
    <button
      type="button"
      aria-busy={isLoadingFavorites || isSubscriptionPending}
      onClick={() => toggleFavorite(collectionId, {
        added: t("collection/CollectionPage.SubscribeSuccess"),
        removed: t("collection/CollectionPage.UnsubscribeSuccess"),
      })}
      disabled={isLoadingFavorites || isSubscriptionPending}
      aria-label={isSubscribed ? t("collection/CollectionPage.Subscribed") : t("collection/CollectionPage.Subscribe")}
      aria-pressed={isSubscribed}
      className={`inline-flex items-center gap-2 px-4 border rounded-xl h-10 font-medium text-sm whitespace-nowrap transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 ${
        isSubscribed
          ? 'bg-blue-500 hover:bg-blue-400 border-transparent text-white'
          : 'bg-white/[0.06] hover:bg-white/10 border-white/10 hover:border-white/20 text-white/85'
      }`}
    >
      {isLoadingFavorites || isSubscriptionPending ? (
        <LoadingSpinner size={16} />
      ) : (
        <SubscribeIcon subscribed={isSubscribed} size={16} />
      )}
      <span>{isSubscribed ? t("collection/CollectionPage.Subscribed") : t("collection/CollectionPage.Subscribe")}</span>
    </button>
  );
}

/** 订阅图标：没订阅是铃铛，订阅了是对勾（歌单页按钮和歌单卡片共用） */
export function SubscribeIcon({ subscribed, size }: { subscribed: boolean; size: number }) {
  return subscribed ? (
    <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="m5 12 4 4L19 6" />
    </svg>
  ) : (
    <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
      <path d="M10 21h4" />
    </svg>
  );
}
