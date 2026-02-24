/**
 * 个人空间页面
 * 迁移自 legacy/src/app/space/page.jsx
 */

import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import useSWR from 'swr';
import { loc, setLanguage } from '@/utils/i18n';
import { PageLayout, RecentPlayedWidget, SongList, ScoreCount } from '@/components';
import { apiroot3 } from '@/config/api';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import 'github-markdown-css/github-markdown-dark.css';

interface IntroductionData {
  username: string;
  joinDate: string;
  introduction?: string;
}

const fetcher = async (...args: Parameters<typeof fetch>) =>
  await fetch(...args).then(async (res) => res.json());

export default function SpacePage() {
  const [ready, setReady] = useState(false);
  const [searchParams] = useSearchParams();
  const username = searchParams.get('id');

  useEffect(() => {
    setLanguage(localStorage.getItem('language') || navigator.language).then(() => {
      setReady(true);
    });
  }, []);

  if (!ready) return <div className="loading"></div>;

  if (!username) {
    return (
      <PageLayout>
        <div className="flex justify-center items-center min-h-screen">
          <div className="text-center">
            <h1 className="mb-4 font-bold text-2xl">{loc('Error', '错误')}</h1>
            <p className="mb-4">{loc('UserNotFound', '未找到用户')}</p>
            <a href="/" className="text-blue-400 hover:text-blue-300 underline">
              {loc('BackToHome', '返回主页')}
            </a>
          </div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout className="user-space-page">
      {/* User Introduction */}
      <section className="mb-8">
        <Introduction username={username} />
      </section>

      {/* Recent Activity */}
      <section className="mb-8">
        <h2 className="mb-4 font-bold text-white text-2xl">
          {loc('RecentlyPlayedCharts', '最近游玩的谱面')}
        </h2>
        <div className="mb-6 border-gray-700 border-b"></div>
        <RecentPlayedWidget username={username} />
      </section>

      {/* Uploaded Charts */}
      <section className="mb-8">
        <h2 className="mb-4 font-bold text-white text-2xl">
          {loc('UploadedCharts', '已上传的谱面')}
        </h2>
        <div className="mb-6 border-gray-700 border-b"></div>
        <SongList
          url={`${apiroot3}/maichart/list?search=${encodeURIComponent('uploader:' + username)}`}
        />
      </section>

      {/* Who Loves To Play */}
      <section className="mb-8">
        <h2 className="mb-4 font-bold text-white text-2xl">
          {loc('WhoLovesToPlay', '谁爱玩这些谱面')}
        </h2>
        <div className="mb-6 border-gray-700 border-b"></div>
        <ScoreCount uploader={username} page={0} pageSize={30} />
      </section>
    </PageLayout>
  );
}

function Introduction({ username }: { username: string }) {
  const { data, error, isLoading } = useSWR<IntroductionData>(
    `${apiroot3}/account/intro?username=${encodeURIComponent(username)}`,
    fetcher
  );

  if (error) {
    return (
      <div className="bg-red-900/20 p-4 border border-red-500 rounded-lg text-red-300">
        {loc('ServerError', '服务器错误')}
      </div>
    );
  }

  if (isLoading) {
    return <div className="loading"></div>;
  }

  if (!data) {
    return (
      <div className="bg-yellow-900/20 p-4 border border-yellow-500 rounded-lg text-yellow-300">
        {loc('UserNotFound', '未找到用户')}
      </div>
    );
  }

  return (
    <div className="bg-linear-to-br from-gray-800/50 to-gray-900/50 shadow-2xl p-6 border border-gray-700 rounded-xl">
      {/* Profile Header */}
      <div className="flex items-start gap-6 mb-6">
        {/* Avatar */}
        <div className="shrink-0">
          <img
            className="shadow-lg border-4 border-purple-500 rounded-full w-24 h-24 object-cover"
            src={`${apiroot3}/account/Icon?username=${username}`}
            alt={username}
          />
        </div>

        {/* User Info */}
        <div className="flex-1">
          <h1 className="mb-2 font-bold text-white text-3xl">{data.username}</h1>
          <p className="text-gray-400 text-sm">
            {loc('JoinAt', '加入于')} {new Date(data.joinDate).toLocaleString()}
          </p>
        </div>
      </div>

      {/* Introduction */}
      {data.introduction && (
        <div className="mt-6 pt-6 border-gray-700 border-t">
          <h3 className="mb-3 font-semibold text-white text-xl">
            {loc('SelfIntro', '自我介绍')}
          </h3>
          <article className="bg-gray-900/50 prose-invert p-4 rounded-lg max-w-none markdown-body prose">
            <Markdown
              remarkPlugins={[remarkGfm]}
              components={{
                ol(props) {
                  const { ...rest } = props;
                  return <ol type="1" {...rest} />;
                },
                ul(props) {
                  const { ...rest } = props;
                  return <ul style={{ listStyleType: 'disc' }} {...rest} />;
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
