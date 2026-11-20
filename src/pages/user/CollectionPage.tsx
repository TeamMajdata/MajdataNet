import { useTranslation } from 'react-i18next';
import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import useSWR from 'swr';
import { PageLayout, LoadingSpinner, CollectionCard, CollectionModal } from '@/components';
import { endpoints } from '@/config/api';
import { useUserContext, useFavorites } from '@/hooks';
import { LuArrowRight, LuCheck, LuCircleX, LuFolderOpen, LuPlus, LuSettings2, LuTriangleAlert } from 'react-icons/lu';
import Pager from '@/components/ui/Pager';
import type { Collection } from '@/types';

const fetcher = (url: string) => fetch(url, { mode: 'cors', credentials: 'include' }).then((res) => res.json());

type CollectionTab = 'mine' | 'favorites';

const GHOST_BUTTON = 'inline-flex items-center gap-2 bg-white/[0.04] hover:bg-white/[0.08] px-4 border border-white/10 hover:border-white/20 rounded-xl h-9 font-medium text-white/85 text-sm whitespace-nowrap transition-colors cursor-pointer';

/** 加载、出错、空列表时的占位，和歌单广场一致 */
function Placeholder({ icon, text, action }: { icon: ReactNode; text: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col justify-center items-center gap-4 py-20">
      {icon}
      <p className="m-0 text-white/40! text-base text-center">{text}</p>
      {action}
    </div>
  );
}

export default function UserCollectionPage() {
  const { t } = useTranslation();
  const { user } = useUserContext();
  const [activeTab, setActiveTab] = useState<CollectionTab>('mine');
  const [isManaging, setIsManaging] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [page, setPage] = useState(() => {
    const stored = localStorage.getItem('lastMyCollectionPage');
    return parseInt(stored || '0');
  });
  const pageSize = 30;

  const url = user
    ? endpoints.collection.list(page, pageSize, user.username)
    : null;

  const { data, error, isLoading, mutate } = useSWR<Collection[]>(url, fetcher, {
    revalidateOnFocus: false
  });

  const { favorites, isLoadingFavorites: favLoading } = useFavorites();
  const isLastPage = Boolean(data && data.length < pageSize && data.length > 0);

  if (!user) return null;

  const goToPage = (newPage: number) => {
    setPage(newPage);
    localStorage.setItem('lastMyCollectionPage', newPage.toString());
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const tabItems = [
    { key: 'mine' as const, label: t("user/collections/CollectionPage.MyCollections") },
    { key: 'favorites' as const, label: t("user/collections/CollectionPage.MyFavCollections") },
  ];
  // 空列表时引导去歌单广场订阅
  const toHiroba = (
    <Link to="/collection/hiroba" className={GHOST_BUTTON + ' no-underline'}>
      {t("user/collections/CollectionPage.GoToHiroba")}
      <LuArrowRight aria-hidden="true" className="w-4 h-4" />
    </Link>
  );
  const emptyIcon = <LuFolderOpen aria-hidden="true" className="w-12 h-12 text-white/20" />;
  const loading = <div className="flex justify-center items-center py-20 w-full"><LoadingSpinner size="50px" /></div>;

  return (
    <PageLayout showBackToHome={false}>
      <div className="mx-auto py-5 sm:py-8 w-full max-w-350 min-h-screen min-w-0">
        {/* Header：标题居左，新建按钮在右，两个分页都显示 */}
        <header className="flex justify-between items-center gap-4 mb-5 sm:mb-6">
          <h1 className="m-0 font-semibold text-white! text-2xl! sm:text-3xl! text-left! tracking-tight">
            {t("user/collections/CollectionPage.Title")}
          </h1>
          <button type="button" onClick={() => setIsModalOpen(true)} className="inline-flex items-center gap-1.5 bg-blue-500 hover:bg-blue-400 px-4 border-none rounded-xl h-11 font-semibold text-white text-sm whitespace-nowrap transition-colors cursor-pointer">
            <LuPlus aria-hidden="true" className="w-4 h-4" />
            {t("user/collections/CollectionPage.NewCollection")}
          </button>
        </header>

        {/* 收藏夹 / 订阅 切换 */}
        <div className="flex bg-white/[0.04] mb-4 p-1 border border-white/10 rounded-xl w-fit h-11" role="tablist">
          {tabItems.map((tab) => (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.key}
              className={`px-4 rounded-lg font-medium text-sm whitespace-nowrap transition-colors cursor-pointer ${activeTab === tab.key ? 'bg-white/10 text-white shadow-[0_1px_0_rgb(255_255_255/8%)_inset]' : 'text-white/55 hover:text-white'}`}
              onClick={() => {
                setActiveTab(tab.key);
                setIsManaging(false);
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'mine' ? (
          <>
            {isLoading ? loading : error ? (
              <Placeholder icon={<LuCircleX aria-hidden="true" className="w-12 h-12 text-red-400/60" />} text={t("user/collections/CollectionPage.ServerError")} />
            ) : !data || data.length === 0 ? (
              <Placeholder icon={emptyIcon} text={t("user/collections/CollectionPage.EmptyData")} action={toHiroba} />
            ) : (
              <>
                {/* 列表工具栏：管理按钮属于“我的收藏夹”列表，提示放在旁边 */}
                <div className="flex justify-end items-center gap-3 mb-4">
                  {isManaging && (
                    <span className="flex items-center gap-2 mr-auto min-w-0 text-red-200/80 text-sm">
                      <LuTriangleAlert aria-hidden="true" className="w-4 h-4 text-red-300 shrink-0" />
                      {t("user/collections/CollectionPage.ManageHint")}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsManaging((prev) => !prev)}
                    aria-pressed={isManaging}
                    className={isManaging ? GHOST_BUTTON.replace('text-white/85', 'text-red-300') + ' border-red-400/40! bg-red-500/10!' : GHOST_BUTTON}
                  >
                    {isManaging ? <LuCheck aria-hidden="true" className="w-4 h-4" /> : <LuSettings2 aria-hidden="true" className="w-4 h-4" />}
                    {isManaging ? t("user/collections/CollectionPage.ExitManage") : t("user/collections/CollectionPage.Manage")}
                  </button>
                </div>
              <div className="gap-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                {data.map((collection) => (
                  <CollectionCard
                    key={collection.id}
                    collection={collection}
                    isManaging={isManaging}
                    onDelete={() => mutate()}
                  />
                ))}
              </div>
              </>
            )}

            {data && data.length > 0 && (
              <div className="flex justify-center mt-8 sm:mt-10">
                <Pager page={page} hasNext={!isLastPage} onPageChange={goToPage} />
              </div>
            )}
          </>
        ) : (
          <>
            {favLoading ? loading : !favorites || favorites.length === 0 ? (
              <Placeholder icon={emptyIcon} text={t("user/collections/CollectionPage.EmptyFavorites")} action={toHiroba} />
            ) : (
              <div className="gap-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                {favorites.map((collection) => (
                  <CollectionCard
                    key={collection.id}
                    collection={collection}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* Create Collection Modal */}
        <CollectionModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onCreate={() => {
            setActiveTab('mine');
            mutate();
          }}
          createOnly
        />
      </div>
    </PageLayout>
  );
}
