/**
 * 个人空间页面
 */

import { useTranslation } from 'react-i18next';
import { getLocale, useLanguage } from '@/i18n';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import useSWR from 'swr';
import { PageLayout, RecentPlayedWidget, SongList, ScoreCount, LoadingSpinner, CommentListView } from '@/components';
import { apiPagesForView, SONG_GRID_CONTAINER_CLASS } from '@/components/song/songGrid';
import UserRating from '@/components/user/UserRating';
import { endpoints } from '@/config/api';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkCenter from '@/utils/remarkCenter';
import { LuCalendarDays, LuPencil } from 'react-icons/lu';
import { useUsername } from '@/hooks';
import 'github-markdown-css/github-markdown-dark.css';
import type { IntroductionData } from '@/types';
import UserSeasons from '@/components/user/UserSeasons';
import EmptyState from '@/components/ui/EmptyState';
import UnderlineTabs from '@/components/ui/UnderlineTabs';
import { CARD_SURFACE_CLASS, SECTION_HEADING_CLASS } from '@/components/ui/surface';

import { apiFetcher as fetcher, apiRequest } from '@/utils/apiClient';
import type { CommentList } from '@/types';

export default function SpacePage() {
  const { t } = useTranslation();
  const [hasUploadedCharts, setHasUploadedCharts] = useState<boolean | null>(null);
  const [hasRecentPlayed, setHasRecentPlayed] = useState<boolean | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const username = searchParams.get('id');
  const profile = useSWR<IntroductionData>(username ? endpoints.account.profile(username) : null, fetcher);

  const tabs = ([
    { key: 'overview', label: t("space/SpacePage.Overview"), show: true },
    { key: 'uploaded', label: t("space/SpacePage.UploadedCharts"), show: hasUploadedCharts !== false },
    { key: 'comments', label: t("space/SpacePage.Comments"), show: true },
    { key: 'fans', label: t("space/SpacePage.WhoLovesToPlay"), show: hasUploadedCharts === true },
  ] as const).filter((tab) => tab.show);
  type SpaceTab = typeof tabs[number]['key'];
  // 网址里记着当前页签；不存在或被隐藏的页签回到“概览”
  const requestedTab = searchParams.get('tab');
  const activeTab: SpaceTab = tabs.find((tab) => tab.key === requestedTab)?.key ?? 'overview';
  const selectTab = (tab: SpaceTab) => {
    const next = new URLSearchParams(searchParams);
    if (tab === 'overview') next.delete('tab'); else next.set('tab', tab);
    setSearchParams(next, { replace: true, preventScrollReset: true });
  };

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
    <PageLayout>
      {/* 和 GitHub 个人主页一样：资料在左边窄栏，页签和内容在右边 */}
      <div className="lg:items-start lg:gap-10 lg:grid lg:grid-cols-[16rem_minmax(0,1fr)] mx-auto pt-5 sm:pt-8 w-full max-w-320 min-w-0">
        <ProfileSidebar username={username} {...profile} />

        {/* 右栏比整页窄，里面的网格按这一栏的宽度分列 */}
        <div className="@container min-w-0">
          {/* 一次只看一块；没有内容的页签自动隐藏（内容一直挂载着，好知道有没有数据） */}
          <UnderlineTabs tabs={tabs} active={activeTab} onSelect={selectTab} idPrefix="space" label={t("space/SpacePage.Sections")} />

          <section id="space-panel-overview" role="tabpanel" aria-labelledby="space-tab-overview" hidden={activeTab !== 'overview'} className="group/overview">
            {profile.data?.introduction && <IntroductionCard text={profile.data.introduction} />}
            <UserSeasons key={username} username={username} />
            <UserRating key={`rating-${username}`} username={username} />
            {/* 最近游玩接在概览最后；没有记录时整块不显示 */}
            <section className="mt-10" aria-labelledby="space-recent-title" hidden={hasRecentPlayed === false} data-filled={hasRecentPlayed === false ? undefined : ''}>
              <h2 id="space-recent-title" className={SECTION_HEADING_CLASS}>
                {t("space/SpacePage.RecentlyPlayedCharts")}
              </h2>
              <RecentPlayedWidget username={username} onDataLoaded={setHasRecentPlayed} gridClassName={SONG_GRID_CONTAINER_CLASS} />
            </section>
            {/* 每个有内容的区块都带着 data-filled；一个都没有（新用户）时显示这条提示 */}
            <div className="hidden group-[:not(:has([data-filled]))]/overview:block">
              <EmptyState>{t("space/SpacePage.OverviewEmpty")}</EmptyState>
            </div>
          </section>

          <section id="space-panel-uploaded" role="tabpanel" aria-labelledby="space-tab-uploaded" hidden={activeTab !== 'uploaded'}>
            <SongList
              url={apiPagesForView(0).map((apiPage) => endpoints.maichart.listSearchAndSort('uploader:' + username, '', apiPage))}
              onDataLoaded={setHasUploadedCharts}
              gridClassName={SONG_GRID_CONTAINER_CLASS}
            />
          </section>

          <section id="space-panel-comments" role="tabpanel" aria-labelledby="space-tab-comments" hidden={activeTab !== 'comments'}>
            <CommentListView
              key={username}
              load={(page, signal) => apiRequest<CommentList>(endpoints.account.comments(username, 'new', page), { signal })}
              empty={t("space/SpacePage.NoComments")}
            />
          </section>

          {hasUploadedCharts === true && (
            <section id="space-panel-fans" role="tabpanel" aria-labelledby="space-tab-fans" hidden={activeTab !== 'fans'}>
              <ScoreCount uploader={username} page={0} pageSize={30} />
            </section>
          )}
        </div>
      </div>
    </PageLayout>
  );
}

/** 左侧资料栏：大头像、昵称、用户名、编辑资料和注册时间；窄屏时头像缩小、和名字排成一行 */
function ProfileSidebar({ username, data, error, isLoading }: {
  username: string;
  data?: IntroductionData;
  error?: unknown;
  isLoading: boolean;
}) {
  const { t } = useTranslation();
  const language = useLanguage();
  const currentUsername = useUsername();

  if (error) {
    return <p className="m-0 mb-6 py-16 text-white/50! text-base text-center">{t("space/SpacePage.ServerError")}</p>;
  }
  if (isLoading) {
    return (
      <div className="flex justify-center items-center mb-6 py-20">
        <LoadingSpinner size={50} />
      </div>
    );
  }
  if (!data) {
    return <p className="m-0 mb-6 py-16 text-white/50! text-base text-center">{t("space/SpacePage.UserNotFound")}</p>;
  }

  const joinDate = new Date(data.joinDate);
  const isSelf = currentUsername !== '' && currentUsername.toLowerCase() === data.username.toLowerCase();

  return (
    <aside className="lg:top-24 lg:sticky mb-6 lg:mb-0 min-w-0">
      <div className="flex lg:flex-col lg:items-stretch items-center gap-4">
        <img
          className="border border-white/15 rounded-full w-16 sm:w-20 lg:w-full h-auto object-cover aspect-square shrink-0"
          src={endpoints.account.avatar(data.avatarId)}
          alt={username}
        />
        <div className="min-w-0">
          <h1 className="m-0 font-semibold text-white! text-xl! lg:text-2xl! text-left! truncate tracking-tight">{data.nickname || data.username}</h1>
          <p className="m-0 mt-0.5 text-white/50! text-base lg:text-lg truncate">@{data.username}</p>
        </div>
      </div>
      {isSelf && (
        <Link
          to="/user/profile"
          className="flex justify-center items-center gap-2 bg-white/[0.06] hover:bg-white/10 mt-4 border border-white/10 hover:border-white/20 rounded-xl w-full h-9 font-medium text-white/85 text-sm no-underline transition-colors"
        >
          <LuPencil aria-hidden="true" className="w-4 h-4" />
          {t("space/SpacePage.EditProfile")}
        </Link>
      )}
      {/* 早期账号没有记录注册时间（接口给的是 1970 年），显示为“早期用户” */}
      <p className="flex items-center gap-2 m-0 mt-4 text-white/55! text-sm">
        <LuCalendarDays aria-hidden="true" className="w-4 h-4 shrink-0" />
        {joinDate.getFullYear() > 2000
          ? t("space/SpacePage.JoinAt", { date: joinDate.toLocaleDateString(getLocale(language)) })
          : t("space/SpacePage.EarlyMember")}
      </p>
    </aside>
  );
}

/** 个人简介：和概览里其他区块一样，小标题在卡片外面，正文用正常字号 */
function IntroductionCard({ text }: { text: string }) {
  const { t } = useTranslation();
  return (
    <section className="mb-10 min-w-0" aria-labelledby="space-intro-title" data-filled="">
      <h2 id="space-intro-title" className={SECTION_HEADING_CLASS}>{t("space/SpacePage.Introduction")}</h2>
      <div className={`${CARD_SURFACE_CLASS} px-5 sm:px-6 py-5 min-w-0`}>
        <div className="bg-transparent! p-0! min-w-0 text-[14px]! select-text **:select-text markdown-body">
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
            {text}
          </Markdown>
        </div>
      </div>
    </section>
  );
}
