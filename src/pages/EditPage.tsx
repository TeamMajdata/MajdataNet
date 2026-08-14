/**
 * 编辑页面 (MajdataEdit介绍)
 * 迁移自 legacy/src/app/edit/page.jsx
 */

import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { setLanguage } from '@/utils/i18n';
import { useLoc } from '@/hooks';
import { PageLayout, LoadingSpinner } from '@/components';

export default function EditPage() {
  const loc = useLoc();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setLanguage(localStorage.getItem('language') || navigator.language).then(() => {
      setReady(true);
    });
  }, []);

  if (!ready) return <div className="flex justify-center items-center h-screen"><LoadingSpinner size="50px" /></div>;

  return (
    <>
      <Helmet>
        <title>MajdataEdit - Majdata Net</title>
        <meta name="description" content="MajdataEdit 是一款 majdata 谱面编辑器，支持 Windows 平台，提供完整的谱面制作工具" />
        <meta name="keywords" content="MajdataEdit, maimai, 谱面编辑器, 音游, 谱面制作, simai" />

        {/* Open Graph */}
        <meta property="og:title" content="MajdataEdit - 谱面编辑器" />
        <meta property="og:description" content="MajdataEdit 是一款 majdata 谱面编辑器，支持 Windows 平台，提供完整的谱面制作工具" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://majdata.net/edit" />
        <meta property="og:image" content="https://majdata.net/salt.webp" />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="MajdataEdit - 谱面编辑器" />
        <meta name="twitter:description" content="MajdataEdit 是一款 majdata 谱面编辑器，支持 Windows 平台" />
        <meta name="twitter:image" content="https://majdata.net/salt.webp" />
      </Helmet>

      <PageLayout className="pb-8">
        <div className="px-4">
          {/* 产品介绍部分 */}
          <section className="mb-16 py-8 text-center">
            <div className="p-8 md:p-12 rounded-xl">
              <div className="flex justify-center items-center gap-4 mb-6">
                <img className="rounded-lg w-16 h-16 object-cover" src="./salt.webp" alt="MajdataEdit" />
                <h1 className="m-0 font-bold text-ink text-4xl">MajdataEdit</h1>
              </div>
              <p className="my-4 text-ink-2 text-xl leading-relaxed">{loc('MajdataPunchline', 'MajdataEdit 谱面编辑器')}</p>
              <p className="mb-8 text-ink-3 text-base italic">Windows Only</p>

              <div className="flex flex-wrap justify-center items-center gap-4 my-6">
                <a href="https://github.com/LingFeng-bbben/MajdataView" className="transition-transform hover:-translate-y-0.5">
                  <img
                    src="https://badgen.net/github/tag/LingFeng-bbben/MajdataView"
                    alt="GitHub Tag"
                    className="rounded-md"
                  />
                </a>
                <img
                  src="https://img.shields.io/static/v1?label=State-of-the-art&message=Shitcode&color=7B5804"
                  alt="Quality Badge"
                  className="rounded-md"
                />
              </div>

              <a
                href="https://github.com/LingFeng-bbben/MajdataView/releases"
                className="inline-block mt-8 no-underline"
              >
                <div className="flex items-center gap-3 bg-primary hover:bg-primary-hover px-8 py-4 rounded-md font-semibold text-white text-lg transition-colors hover:-translate-y-1">{loc('Download', '下载')}</div>
              </a>
            </div>
          </section>

          {/* 教程部分 */}
          <section className="mb-16">
            <h2 className="mb-10 pl-4 font-bold text-ink text-3xl text-left">{loc('Tutorials', '教程')}</h2>
            <div className="gap-6 grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] mb-8">
              <a
                href="https://github.com/LingFeng-bbben/MajdataView/wiki/%E5%BF%AB%E9%80%9F%E5%85%A5%E9%97%A8"
                className="block p-6 rounded-lg text-inherit no-underline transition-all hover:-translate-y-1"
              >
                <div className="w-full">
                  <h3 className="inline-block m-0 mb-3 pb-2 border-primary/30 border-b-2 font-bold text-ink text-xl">{loc('QuickStart', '快速入门')}</h3>
                  <p className="m-0 text-ink-2 text-base leading-relaxed">{loc('QuickStartDesc', '快速入门教程')}</p>
                </div>
              </a>

              <a
                href="https://github.com/LingFeng-bbben/MajdataView/wiki/%E5%BF%AB%E9%80%9F%E5%85%A5%E9%97%A8"
                className="block p-6 rounded-lg text-inherit no-underline transition-all hover:-translate-y-1"
              >
                <div className="w-full">
                  <h3 className="inline-block m-0 mb-3 pb-2 border-primary/30 border-b-2 font-bold text-ink text-xl">{loc('HowToChart', '如何做谱')}</h3>
                  <p className="m-0 text-ink-2 text-base leading-relaxed">{loc('HowToChartDesc', '做谱教程')}</p>
                </div>
              </a>

              <a href="https://w.atwiki.jp/simai/pages/1002.html" className="block p-6 rounded-lg text-inherit no-underline transition-all hover:-translate-y-1">
                <div className="w-full">
                  <h3 className="inline-block m-0 mb-3 pb-2 border-primary/30 border-b-2 font-bold text-ink text-xl">{loc('JapaneseVersion', '日语版本')}</h3>
                  <p className="m-0 text-ink-2 text-base leading-relaxed">
                    {loc('JapaneseVersionDesc', '日语教程')}
                  </p>
                </div>
              </a>

              <a href="https://rentry.org/maiguide" className="block p-6 rounded-lg text-inherit no-underline transition-all hover:-translate-y-1">
                <div className="w-full">
                  <h3 className="inline-block m-0 mb-3 pb-2 border-primary/30 border-b-2 font-bold text-ink text-xl">English Guide</h3>
                  <p className="m-0 text-ink-2 text-base leading-relaxed">English tutorial and guide</p>
                </div>
              </a>
            </div>
          </section>

          {/* 视频教程部分 */}
          <section className="mb-16">
            <h2 className="mb-10 pl-4 font-bold text-ink text-3xl text-left">{loc('VideoTutorials', '视频教程')}</h2>
            <div className="gap-8 grid grid-cols-[repeat(auto-fit,minmax(400px,1fr))] max-md:grid-cols-1 mb-8">
              <div className="p-4 rounded-lg transition-all hover:-translate-y-1">
                <iframe
                  src="//player.bilibili.com/player.html?aid=678023171&bvid=BV15m4y1D7h1&cid=482366924&p=1&autoplay=0"
                  className="mb-4 border-none rounded-lg w-full h-62.5 max-[480px]:h-45 max-md:h-50"
                  allowFullScreen
                ></iframe>
                <div className="text-center">
                  <h3 className="m-0 font-bold text-ink text-xl text-left">{loc('BasicTutorial', '基础教程')}</h3>
                </div>
              </div>

              <div className="p-4 rounded-lg transition-all hover:-translate-y-1">
                <iframe
                  src="//player.bilibili.com/player.html?aid=961503110&bvid=BV1nH4y1U7Cc&cid=1281833478&p=1&autoplay=0"
                  className="mb-4 border-none rounded-lg w-full h-62.5 max-[480px]:h-45 max-md:h-50"
                  allowFullScreen
                ></iframe>
                <div className="text-center">
                  <h3 className="m-0 font-bold text-ink text-xl text-left">{loc('AdvancedTutorial', '进阶教程')}</h3>
                </div>
              </div>
            </div>

            <div className="mt-8 text-center">
              <p className="m-0">
                <a
                  href="https://space.bilibili.com/397702/channel/collectiondetail?sid=391415&ctype=0"
                  className="font-medium text-primary hover:text-primary-hover hover:underline no-underline transition-colors"
                >
                  {loc('MoreTutorials', '查看更多教程')} →
                </a>
              </p>
            </div>
          </section>
        </div>
      </PageLayout>
    </>
  );
}
