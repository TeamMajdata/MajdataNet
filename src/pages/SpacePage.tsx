/**
 * 个人空间页面
 * 迁移自 legacy/src/app/space/page.jsx
 */

import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import useSWR from 'swr';
import { setLanguage } from '@/utils/i18n';
import { useLoc } from '@/hooks';
import { PageLayout, RecentPlayedWidget, SongMosaicCard, ScoreCount, LoadingSpinner } from '@/components';
import { endpoints } from '@/config/api';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkCenter from '@/utils/remarkCenter';
import { motion, type Variants } from 'framer-motion';
import 'github-markdown-css/github-markdown.css';
import type { IntroductionData, Song } from '@/types';
import { Activity, Music, Trophy } from 'lucide-react';

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
            <Link to="/" className="text-primary hover:text-primary-hover underline">
              {loc('BackToHome', '返回主页')}
            </Link>
          </div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout className="pb-8">
      {/* 内容容器：限宽居中 */}
      <div className="gap-8 flex flex-col mx-auto my-0 w-full max-w-5xl mt-(--content-top-spacing)">
        {/* User Introduction */}
        <motion.section
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
            initial="hidden"
            animate="visible"
            custom={0.4}
            variants={slideInUp}
          >
            <SectionCard
              title={loc('RecentlyPlayedCharts', '最近游玩的谱面')}
              icon={<Activity size={20} />}
            >
              <RecentPlayedWidget username={username} onDataLoaded={setHasRecentPlayed} />
            </SectionCard>
          </motion.section>
        )}

        {/* Uploaded Charts */}
        {hasUploadedCharts !== false && (
          <motion.section
            initial="hidden"
            animate="visible"
            custom={0.5}
            variants={slideInUp}
          >
            <SectionCard
              title={loc('UploadedCharts', '已上传的谱面')}
              icon={<Music size={20} />}
            >
              <UploadedChartsMosaic username={username} onDataLoaded={setHasUploadedCharts} />
            </SectionCard>
          </motion.section>
        )}

        {/* Who Loves To Play */}
        {hasUploadedCharts === true && (
          <motion.section
            initial="hidden"
            animate="visible"
            custom={0.5}
            variants={slideInUp}
          >
            <SectionCard
              title={loc('WhoLovesToPlay', '谁爱玩')}
              icon={<Trophy size={20} />}
            >
              <ScoreCount uploader={username} page={0} pageSize={30} />
            </SectionCard>
          </motion.section>
        )}
      </div>
    </PageLayout>
  );
}

/** 已上传谱面：主页同款马赛克卡片，一行 3 个 */
function UploadedChartsMosaic({
  username,
  onDataLoaded,
}: {
  username: string;
  onDataLoaded: (hasData: boolean) => void;
}) {
  const loc = useLoc();
  const { data, error, isLoading } = useSWR<Song[]>(
    endpoints.maichart.listSearch('uploader:' + username),
    fetcher,
    {
      revalidateOnFocus: false,
      onSuccess: (data) => {
        onDataLoaded?.(!!data && Array.isArray(data) && data.length > 0);
      },
    }
  );

  if (error) {
    return <div className="m-auto w-full text-[50px] text-center">{loc('ServerError', '服务器错误')}</div>;
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-20 w-full">
        <LoadingSpinner size="50px" />
      </div>
    );
  }

  if (!data || !Array.isArray(data) || data.length === 0) {
    return <div className="m-auto w-full text-[50px] text-center">{loc('EmptyData', '暂无数据')}</div>;
  }

  return (
    <div className="gap-x-6 gap-y-12 grid grid-cols-12 w-full">
      {data.map((song, index) => (
        <SongMosaicCard
          key={song.id}
          song={song}
          index={index}
          className="col-span-12 md:col-span-4"
        />
      ))}
    </div>
  );
}

/** 分区卡片：图标标题 + 白底内容 */
function SectionCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {  return (
    <div className="bg-surface border border-line shadow-card hover:shadow-card-hover p-6 md:p-8 transition-all hover:-translate-y-0.5 duration-300">
      <div className="flex items-center gap-3 mb-6 pb-4 border-line border-b">
        <div className="bg-primary-soft p-2 rounded-md">
          {icon}
        </div>
        <h2 className="m-0 font-semibold text-ink text-xl md:text-2xl">
          {title}
        </h2>
      </div>
      {children}
    </div>
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
    <div className="bg-surface border border-line shadow-card hover:shadow-card-hover p-6 md:p-8 transition-all hover:-translate-y-0.5 duration-300">
      {/* Profile Header */}
      <div className="flex md:flex-row flex-col items-center gap-8 max-md:gap-6 mb-8 pb-8 border-line border-b md:text-left text-center">
        {/* Avatar */}
        <div className="shrink-0">
          <img
            className="border-[3px] border-primary/40 rounded-full w-30 max-md:w-25 min-w-30 max-md:min-w-25 h-30 max-md:h-25 min-h-30 max-md:min-h-25 object-cover aspect-square"
            src={endpoints.account.icon(username)}
            alt={username}
          />
        </div>

        {/* User Info */}
        <div className="flex-1">
          <h1 className="mb-2 font-bold text-[2rem] text-ink max-md:text-2xl text-left!">{data.username}</h1>
          <p className="m-0 text-ink-3 text-base text-left!">
            {loc('JoinAt', '加入于')} {new Date(data.joinDate).toLocaleString()}
          </p>
        </div>
      </div>

      {/* Introduction */}
      {data.introduction && (
        <div className="mt-4">
          <h3 className="mb-4 font-semibold text-ink text-xl">
            {loc('SelfIntro', '自我介绍')}
          </h3>
          <article className="p-6 select-text **:select-text markdown-body">
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
