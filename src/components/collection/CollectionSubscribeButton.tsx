import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { useFavorites } from '@/hooks';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

export default function CollectionSubscribeButton({ collectionId }: { collectionId: string }) {
  const { t } = useTranslation();
  const { favoriteIds, isLoadingFavorites, toggleFavorite, isPending } = useFavorites();
  const isSubscribed = favoriteIds.has(collectionId);
  const isSubscriptionPending = isPending(collectionId);

  return (
    <motion.button
      type="button"
      aria-busy={isLoadingFavorites || isSubscriptionPending}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      onClick={() => toggleFavorite(collectionId, {
        added: t("collection/CollectionPage.SubscribeSuccess"),
        removed: t("collection/CollectionPage.UnsubscribeSuccess"),
      })}
      disabled={isLoadingFavorites || isSubscriptionPending}
      aria-label={isSubscribed ? t("collection/CollectionPage.Subscribed") : t("collection/CollectionPage.Subscribe")}
      aria-pressed={isSubscribed}
      className={`flex items-center gap-2 shadow-lg backdrop-blur-md px-4 py-2 border rounded-xl font-bold transition-all cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 ${
        isSubscribed
          ? 'bg-blue-500/80 hover:bg-blue-500 border-blue-300/30 text-white'
          : 'bg-white/10 hover:bg-white/20 border-white/20 text-white'
      }`}
    >
      {isLoadingFavorites || isSubscriptionPending ? (
        <LoadingSpinner size={16} />
      ) : isSubscribed ? (
        <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="m5 12 4 4L19 6" />
        </svg>
      ) : (
        <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
          <path d="M10 21h4" />
        </svg>
      )}
      <span>{isSubscribed ? t("collection/CollectionPage.Subscribed") : t("collection/CollectionPage.Subscribe")}</span>
    </motion.button>
  );
}
