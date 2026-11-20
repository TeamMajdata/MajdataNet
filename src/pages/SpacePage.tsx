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
import { apiPagesForView } from '@/components/song/songGrid';
import CollapsibleSection from '@/components/ui/CollapsibleSection';
import UserRating from '@/components/user/UserRating';
import { endpoints } from '@/config/api';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkCenter from '@/utils/remarkCenter';
import { LuPencil } from 'react-icons/lu';
import { useUsername } from '@/hooks';
import 'github-markdown-css/github-markdown-dark.css';
import type { IntroductionData } from '@/types';
import UserSeasons from '@/components/user/UserSeasons';

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
    <PageLayout showBackToHome={false}>
      <div className="mx-auto pt-5 sm:pt-8 w-full max-w-350 min-w-0">
      <section className="mb-8">
        <Introduction username={username} />
      </section>

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
            url={apiPagesForView(0).map((apiPage) => endpoints.maichart.listSearchAndSort('uploader:' + username, '', apiPage))}
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
      </div>
    </PageLayout>
  );
}

function Introduction({ username }: { username: string }) {
  const { t } = useTranslation();
  const language = useLanguage();
  const currentUsername = useUsername();
  const { data, error, isLoading } = useSWR<IntroductionData>(
    endpoints.account.profile(username),
    fetcher
  );

  if (error) {
    return (
      <p className="m-0 py-16 text-white/50! text-base text-center">{t("space/SpacePage.ServerError")}</p>
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
      <p className="m-0 py-16 text-white/50! text-base text-center">{t("space/SpacePage.UserNotFound")}</p>
    );
  }

  const isSelf = currentUsername !== '' && currentUsername.toLowerCase() === data.username.toLowerCase();

  return (
    <div className="bg-white/[0.03] p-5 sm:p-6 border border-white/10 rounded-2xl min-w-0">
      {/* 资料：头像在左，昵称、用户名和注册时间在右；自己的空间多一个“编辑资料” */}
      <div className="flex items-center gap-4 sm:gap-5 min-w-0">
        <img
          className="border border-white/15 rounded-full w-16 sm:w-20 h-16 sm:h-20 object-cover aspect-square shrink-0"
          src={endpoints.account.avatar(data.avatarId)}
          alt={username}
        />
        <div className="flex-1 min-w-0">
          <h1 className="m-0 font-semibold text-white! text-xl! sm:text-2xl! text-left! truncate tracking-tight">{data.nickname || data.username}</h1>
          <p className="m-0 mt-1 text-white/50! text-sm truncate">
            @{data.username}
            <span className="mx-1.5 text-white/25">·</span>
            {t("space/SpacePage.JoinAt", { date: new Date(data.joinDate).toLocaleDateString(getLocale(language)) })}
          </p>
        </div>
        {isSelf && (
          <Link
            to="/user/profile"
            className="inline-flex items-center gap-2 bg-white/[0.06] hover:bg-white/10 px-3.5 border border-white/10 hover:border-white/20 rounded-xl h-10 font-medium text-white/85 text-sm no-underline whitespace-nowrap transition-colors shrink-0"
          >
            <LuPencil aria-hidden="true" className="w-4 h-4" />
            <span className="max-sm:hidden">{t("space/SpacePage.EditProfile")}</span>
          </Link>
        )}
      </div>

      {/* 自我介绍 */}
      {data.introduction && (
        <article className="bg-transparent! mt-5 p-0! pt-5! border-white/[0.07] border-t min-w-0 text-sm select-text **:select-text markdown-body">
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
      )}
    </div>
  );
}