/**
 * 个人空间页面
 * 迁移自 legacy/src/app/space/page.jsx
 */

import { useTranslation } from 'react-i18next';
import { getLocale, useLanguage } from '@/i18n';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import useSWR from 'swr';
import { PageLayout, RecentPlayedWidget, SongList, ScoreCount, LoadingSpinner, CommentListView } from '@/components';
import CollapsibleSection from '@/components/ui/CollapsibleSection';
import UserRating from '@/components/user/UserRating';
import { endpoints } from '@/config/api';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkCenter from '@/utils/remarkCenter';
import { motion, type Variants } from 'framer-motion';
import 'github-markdown-css/github-markdown-dark.css';
import type { IntroductionData } from '@/types';
import UserSeasons from '@/components/user/UserSeasons';

// slideInUp 动画变体
const slideInUp: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: (delay: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: [0.4, 0, 0.2, 1] as const,
      delay,
    },
  }),
};

import { apiFetcher as fetcher, apiRequest } from '@/utils/apiClient';
import type { CommentList } from '@/types';

export default function SpacePage() {
  const { t } = useTranslation();
  const [hasUploadedCharts, setHasUploadedCharts] = useState<boolean | null>(null);
  const [hasRecentPlayed, setHasRecentPlayed] = useState<boolean | null>(null);
  const [searchParams] = useSearchParams();
  const username = searchParams.get('id');

  if (!username) {
    return (
      <PageLayout>
        <div className="flex justify-center items-center min-h-screen">
          <div className="text-center">
            <h1 className="mb-4 font-bold text-2xl">{t("space/SpacePage.Error")}</h1>
            <p className="mb-4">{t("space/SpacePage.UserNotFound")}</p>
            <Link to="/" className="text-blue-400 hover:text-blue-300 underline">
              {t("space/SpacePage.BackToHome")}
            </Link>
          </div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout className="pb-8">
      {/* User Introduction */}
      <motion.section
        className="mt-(--content-top-spacing) mb-12"
        initial="hidden"
        animate="visible"
        custom={0.3}
        variants={slideInUp}
      >
        <Introduction username={username} />
      </motion.section>

      <UserSeasons key={username} username={username} />

      {/* Rating radar and its best 50 */}
      <CollapsibleSection key={`rating-${username}`} title={t("space/SpacePage.Rating")}>
        <UserRating username={username} />
      </CollapsibleSection>

      {/* Recent Activity */}
      {hasRecentPlayed !== false && (
        <CollapsibleSection title={t("space/SpacePage.RecentlyPlayedCharts")}>
          <RecentPlayedWidget username={username} onDataLoaded={setHasRecentPlayed} />
        </CollapsibleSection>
      )}

      {/* Uploaded Charts */}
      {hasUploadedCharts !== false && (
        <CollapsibleSection title={t("space/SpacePage.UploadedCharts")}>
          <SongList
            url={endpoints.maichart.listSearch('uploader:' + username)}
            onDataLoaded={setHasUploadedCharts}
          />
        </CollapsibleSection>
      )}

      {/* Comments */}
      <CollapsibleSection title={t("space/SpacePage.Comments")}>
        <div className="mx-auto w-full md:w-[82%] lg:w-[70%]">
          <CommentListView
            key={username}
            load={(page, signal) => apiRequest<CommentList>(endpoints.account.comments(username, 'new', page), { signal })}
            empty={t("space/SpacePage.NoComments")}
          />
        </div>
      </CollapsibleSection>

      {/* Who Loves To Play */}
      {hasUploadedCharts === true && (
        <CollapsibleSection title={t("space/SpacePage.WhoLovesToPlay")}>
          <ScoreCount uploader={username} page={0} pageSize={30} />
        </CollapsibleSection>
      )}
    </PageLayout>
  );
}

function Introduction({ username }: { username: string }) {
  const { t } = useTranslation();
  const language = useLanguage();
  const { data, error, isLoading } = useSWR<IntroductionData>(
    endpoints.account.profile(username),
    fetcher
  );

  if (error) {
    return (
      <div className="mx-auto w-full text-5xl text-center">
        {t("space/SpacePage.ServerError")}
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-20">
        <LoadingSpinner size={50} />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mx-auto w-full text-5xl text-center">
        {t("space/SpacePage.UserNotFound")}
      </div>
    );
  }

  return (
    <div className="bg-[rgb(30_30_30/90%)] shadow-[0_8px_25px_rgb(0_0_0/30%)] backdrop-blur-xl backdrop-saturate-180 p-4 sm:p-6 md:p-8 border border-white/12 rounded-2xl min-w-0">
      {/* Profile Header */}
      <div className="flex md:flex-row flex-col items-center gap-6 md:gap-8 mb-6 sm:mb-8 pb-6 sm:pb-8 border-white/10 border-b md:text-left text-center">
        {/* Avatar */}
        <div className="shrink-0">
          <img
            className="border-[3px] border-blue-500/50 rounded-full w-30 max-md:w-25 min-w-30 max-md:min-w-25 h-30 max-md:h-25 min-h-30 max-md:min-h-25 object-cover aspect-square"
            src={endpoints.account.avatar(data.avatarId)}
            alt={username}
          />
        </div>

        {/* User Info */}
        <div className="flex-1">
          <h1 className="mb-2 font-bold text-[2rem] text-gray-200 max-md:text-2xl">{data.nickname || data.username}</h1>
          <p className="text-gray-400 text-sm">@{data.username}</p>
          <p className="m-0 text-gray-400 text-sm sm:text-base md:text-right text-center break-words">
            {t("space/SpacePage.JoinAt", { date: new Date(data.joinDate).toLocaleString(getLocale(language)) })}
          </p>
        </div>
      </div>

      {/* Introduction */}
      {data.introduction && (
        <div className="mt-4">
          <h3 className="mb-4 font-semibold text-gray-200 text-xl text-center">
            {t("space/SpacePage.SelfIntro")}
          </h3>
          <article className="bg-black/30 p-0 sm:p-2 rounded-xl min-w-0 select-text **:select-text markdown-body">
            <Markdown
              remarkPlugins={[remarkGfm, remarkCenter]}
              components={{
                ol(props) {
                  const { ...rest } = props;
                  return <ol type="1" {...rest} />;
                },
                img(props) {
                  const { ...rest } = props;
                  return <img style={{ margin: 'auto' }} {...rest} />;
                },
              }}
            >
              {data.introduction}
            </Markdown>
          </article>
        </div>
      )}
    </div>
  );
}