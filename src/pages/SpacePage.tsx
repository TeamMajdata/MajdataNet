/**
 * 个人空间页面
 * 迁移自 legacy/src/app/space/page.jsx
 */

import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import useSWR from 'swr';
import { setLanguage } from '@/utils/i18n';
import { useLoc } from '@/hooks';
import { PageLayout, RecentPlayedWidget, SongList, ScoreCount, LoadingSpinner } from '@/components';
import { endpoints } from '@/config/api';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkCenter from '@/utils/remarkCenter';
import { motion, type Variants } from 'framer-motion';
import 'github-markdown-css/github-markdown-dark.css';
import type { IntroductionData } from '@/types';

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

const fetcher = async (...args: Parameters<typeof fetch>) =>
  await fetch(...args).then(async (res) => res.json());

export default function SpacePage() {
  const loc = useLoc();
  const [ready, setReady] = useState(false);
  const [hasUploadedCharts, setHasUploadedCharts] = useState<boolean | null>(null);
  const [hasRecentPlayed, setHasRecentPlayed] = useState<boolean | null>(null);
  const [searchParams] = useSearchParams();
  const username = searchParams.get('id');

  useEffect(() => {
    setLanguage(localStorage.getItem('language') || navigator.language).then(() => {
      setReady(true);
    });
  }, []);

  if (!ready) return <div className="flex justify-center items-center h-screen"><LoadingSpinner size="50px" /></div>;

  if (!username) {
    return (
      <PageLayout>
        <div className="flex justify-center items-center min-h-screen">
          <div className="text-center">
            <h1 className="mb-4 font-bold text-2xl">{loc('Error', '错误')}</h1>
            <p className="mb-4">{loc('UserNotFound', '未找到用户')}</p>
            <Link to="/" className="text-blue-400 hover:text-blue-300 underline">
              {loc('BackToHome', '返回主页')}
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

      {/* Recent Activity */}
      {hasRecentPlayed !== false && (
        <motion.section
          className="mb-12"
          initial="hidden"
          animate="visible"
          custom={0.4}
          variants={slideInUp}
        >
          <h2 className="my-8 font-semibold text-white text-3xl text-center [text-shadow:0_2px_4px_rgb(0_0_0/30%)]">
            {loc('RecentlyPlayedCharts', '最近游玩的谱面')}
          </h2>
          <div
            className="relative mx-auto my-8 border-0 w-[70%] h-px"
            style={{
              background: 'linear-gradient(90deg, transparent 0%, rgb(255 255 255 / 20%) 15%, rgb(255 255 255 / 40%) 30%, rgb(255 255 255 / 60%) 50%, rgb(255 255 255 / 40%) 70%, rgb(255 255 255 / 20%) 85%, transparent 100%)'
            }}
          />
          <RecentPlayedWidget username={username} onDataLoaded={setHasRecentPlayed} />
        </motion.section>
      )}

      {/* Uploaded Charts */}
      {hasUploadedCharts !== false && (
        <motion.section
          className="mb-12"
          initial="hidden"
          animate="visible"
          custom={0.5}
          variants={slideInUp}
        >
          <h2 className="my-8 font-semibold text-white text-3xl text-center [text-shadow:0_2px_4px_rgb(0_0_0/30%)]">
            {loc('UploadedCharts', '已上传的谱面')}
          </h2>
          <div
            className="relative mx-auto my-8 border-0 w-[70%] h-px"
            style={{
              background: 'linear-gradient(90deg, transparent 0%, rgb(255 255 255 / 20%) 15%, rgb(255 255 255 / 40%) 30%, rgb(255 255 255 / 60%) 50%, rgb(255 255 255 / 40%) 70%, rgb(255 255 255 / 20%) 85%, transparent 100%)'
            }}
          />
          <SongList
            url={endpoints.maichart.listSearch('uploader:' + username)}
            onDataLoaded={setHasUploadedCharts}
          />
        </motion.section>
      )}

      {/* Who Loves To Play */}
      {hasUploadedCharts === true && (
        <motion.section
          className="mb-12"
          initial="hidden"
          animate="visible"
          custom={0.5}
          variants={slideInUp}
        >
          <h2 className="my-8 font-semibold text-white text-3xl text-center [text-shadow:0_2px_4px_rgb(0_0_0/30%)]">
            {loc('WhoLovesToPlay', '谁爱玩')}
          </h2>
          <div
            className="relative mx-auto my-8 border-0 w-[70%] h-px"
            style={{
              background: 'linear-gradient(90deg, transparent 0%, rgb(255 255 255 / 20%) 15%, rgb(255 255 255 / 40%) 30%, rgb(255 255 255 / 60%) 50%, rgb(255 255 255 / 40%) 70%, rgb(255 255 255 / 20%) 85%, transparent 100%)'
            }}
          />
          <ScoreCount uploader={username} page={0} pageSize={30} />
        </motion.section>
      )}
    </PageLayout>
  );
}

function Introduction({ username }: { username: string }) {
  const loc = useLoc();
  const { data, error, isLoading } = useSWR<IntroductionData>(
    endpoints.account.intro(username),
    fetcher
  );

  if (error) {
    return (
      <div className="mx-auto w-full text-5xl text-center">
        {loc('ServerError', '服务器错误')}
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
        {loc('UserNotFound', '未找到用户')}
      </div>
    );
  }

  return (
    <div className="bg-[rgb(30_30_30/90%)] shadow-[0_8px_25px_rgb(0_0_0/30%)] backdrop-blur-xl backdrop-saturate-180 p-8 border border-white/12 rounded-2xl">
      {/* Profile Header */}
      <div className="flex md:flex-row flex-col items-center gap-8 max-md:gap-6 mb-8 pb-8 border-white/10 border-b md:text-left text-center">
        {/* Avatar */}
        <div className="shrink-0">
          <img
            className="border-[3px] border-blue-500/50 rounded-full w-30 max-md:w-25 min-w-30 max-md:min-w-25 h-30 max-md:h-25 min-h-30 max-md:min-h-25 object-cover aspect-square"
            src={endpoints.account.icon(username)}
            alt={username}
          />
        </div>

        {/* User Info */}
        <div className="flex-1">
          <h1 className="mb-2 font-bold text-[2rem] text-gray-200 max-md:text-2xl">{data.username}</h1>
          <p className="m-0 text-gray-400 text-base text-right">
            {loc('JoinAt', '加入于')} {new Date(data.joinDate).toLocaleString()}
          </p>
        </div>
      </div>

      {/* Introduction */}
      {data.introduction && (
        <div className="mt-4">
          <h3 className="mb-4 font-semibold text-gray-200 text-xl text-center">
            {loc('SelfIntro', '自我介绍')}
          </h3>
          <article className="bg-black/30 p-6 rounded-xl select-text **:select-text markdown-body">
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
