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
        <div className="mx-auto px-0 sm:px-4 max-w-250 min-w-0">
          {/* 产品介绍部分 */}
          <section className="mb-10 sm:mb-16 py-4 sm:py-8 text-center">
            <div className="bg-[rgb(30_30_30/90%)] shadow-[0_20px_60px_rgb(0_0_0/30%),0_4px_20px_rgb(59_130_246/10%)] backdrop-blur-[20px] p-4 sm:p-8 md:p-12 border border-white/10 rounded-2xl sm:rounded-3xl">
              <div className="flex justify-center items-center gap-3 sm:gap-4 mb-5 sm:mb-6">
                <img className="rounded-xl w-13 sm:w-16 h-13 sm:h-16 object-cover" src="/salt.webp" alt="MajdataEdit" />
                <h1 className="bg-clip-text bg-linear-to-br from-white to-[#e5e5e5] m-0 font-bold text-transparent text-3xl sm:text-4xl">MajdataEdit</h1>
              </div>
              <p className="my-4 text-[#b0b0b0] text-lg sm:text-xl leading-relaxed">{loc('MajdataPunchline', 'MajdataEdit 谱面编辑器')}</p>
              <p className="mb-8 text-[#888] text-base italic">Windows Only</p>

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
                <div className="flex items-center gap-3 bg-linear-to-br from-emerald-500 hover:from-emerald-600 to-emerald-600 hover:to-emerald-700 shadow-[0_8px_25px_rgb(16_185_129/30%),0_2px_10px_rgb(0_0_0/20%)] hover:shadow-[0_12px_35px_rgb(16_185_129/40%),0_4px_15px_rgb(0_0_0/30%)] px-6 sm:px-8 py-3.5 sm:py-4 rounded-2xl min-h-11 font-semibold text-white text-base sm:text-lg transition-all md:hover:-translate-y-1">{loc('Download', '下载')}</div>
              </a>
            </div>
          </section>

          {/* 教程部分 */}
          <section className="mb-16">
            <h2 className="mb-6 sm:mb-10 pl-1 sm:pl-4 font-bold text-white text-2xl sm:text-3xl text-left">{loc('Tutorials', '教程')}</h2>
            <div className="gap-4 sm:gap-6 grid grid-cols-1 sm:grid-cols-[repeat(auto-fit,minmax(280px,1fr))] mb-8 min-w-0">
              <a
                href="https://github.com/LingFeng-bbben/MajdataView/wiki/%E5%BF%AB%E9%80%9F%E5%85%A5%E9%97%A8"
                className="block bg-[rgb(30_30_30/90%)] hover:bg-[rgb(35_35_40/95%)] hover:shadow-[0_12px_30px_rgb(0_0_0/30%),0_4px_15px_rgb(59_130_246/10%)] backdrop-blur-[20px] p-6 border border-white/10 hover:border-blue-500/30 rounded-2xl text-inherit no-underline transition-all hover:-translate-y-1"
              >
                <div className="w-full">
                  <h3 className="inline-block m-0 mb-3 pb-2 border-emerald-500/30 border-b-2 font-bold text-white text-xl">{loc('QuickStart', '快速入门')}</h3>
                  <p className="m-0 text-[#b0b0b0] text-base leading-relaxed">{loc('QuickStartDesc', '快速入门教程')}</p>
                </div>
              </a>

              <a
                href="https://github.com/LingFeng-bbben/MajdataView/wiki/%E5%BF%AB%E9%80%9F%E5%85%A5%E9%97%A8"
                className="block bg-[rgb(30_30_30/90%)] hover:bg-[rgb(35_35_40/95%)] hover:shadow-[0_12px_30px_rgb(0_0_0/30%),0_4px_15px_rgb(59_130_246/10%)] backdrop-blur-[20px] p-6 border border-white/10 hover:border-blue-500/30 rounded-2xl text-inherit no-underline transition-all hover:-translate-y-1"
              >
                <div className="w-full">
                  <h3 className="inline-block m-0 mb-3 pb-2 border-emerald-500/30 border-b-2 font-bold text-white text-xl">{loc('HowToChart', '如何做谱')}</h3>
                  <p className="m-0 text-[#b0b0b0] text-base leading-relaxed">{loc('HowToChartDesc', '做谱教程')}</p>
                </div>
              </a>

              <a href="https://w.atwiki.jp/simai/pages/1002.html" className="block bg-[rgb(30_30_30/90%)] hover:bg-[rgb(35_35_40/95%)] hover:shadow-[0_12px_30px_rgb(0_0_0/30%),0_4px_15px_rgb(59_130_246/10%)] backdrop-blur-[20px] p-6 border border-white/10 hover:border-blue-500/30 rounded-2xl text-inherit no-underline transition-all hover:-translate-y-1">
                <div className="w-full">
                  <h3 className="inline-block m-0 mb-3 pb-2 border-emerald-500/30 border-b-2 font-bold text-white text-xl">{loc('JapaneseVersion', '日语版本')}</h3>
                  <p className="m-0 text-[#b0b0b0] text-base leading-relaxed">
                    {loc('JapaneseVersionDesc', '日语教程')}
                  </p>
                </div>
              </a>

              <a href="https://rentry.org/maiguide" className="block bg-[rgb(30_30_30/90%)] hover:bg-[rgb(35_35_40/95%)] hover:shadow-[0_12px_30px_rgb(0_0_0/30%),0_4px_15px_rgb(59_130_246/10%)] backdrop-blur-[20px] p-6 border border-white/10 hover:border-blue-500/30 rounded-2xl text-inherit no-underline transition-all hover:-translate-y-1">
                <div className="w-full">
                  <h3 className="inline-block m-0 mb-3 pb-2 border-emerald-500/30 border-b-2 font-bold text-white text-xl">English Guide</h3>
                  <p className="m-0 text-[#b0b0b0] text-base leading-relaxed">English tutorial and guide</p>
                </div>
              </a>
            </div>
          </section>

          {/* 视频教程部分 */}
          <section className="mb-16">
            <h2 className="mb-6 sm:mb-10 pl-1 sm:pl-4 font-bold text-white text-2xl sm:text-3xl text-left">{loc('VideoTutorials', '视频教程')}</h2>
            <div className="gap-8 grid grid-cols-[repeat(auto-fit,minmax(400px,1fr))] max-md:grid-cols-1 mb-8">
              <div className="bg-[rgb(30_30_30/90%)] hover:bg-[rgb(35_35_40/95%)] hover:shadow-[0_12px_30px_rgb(0_0_0/30%),0_4px_15px_rgb(59_130_246/10%)] backdrop-blur-[20px] p-4 border border-white/10 hover:border-blue-500/30 rounded-2xl transition-all hover:-translate-y-1">
                <iframe
                  src="//player.bilibili.com/player.html?aid=678023171&bvid=BV15m4y1D7h1&cid=482366924&p=1&autoplay=0"
                  className="mb-4 border-none rounded-xl w-full h-62.5 max-[480px]:h-45 max-md:h-50"
                  allowFullScreen
                ></iframe>
                <div className="text-center">
                  <h3 className="m-0 font-bold text-white text-xl text-left">{loc('BasicTutorial', '基础教程')}</h3>
                </div>
              </div>

              <div className="bg-[rgb(30_30_30/90%)] hover:bg-[rgb(35_35_40/95%)] hover:shadow-[0_12px_30px_rgb(0_0_0/30%),0_4px_15px_rgb(59_130_246/10%)] backdrop-blur-[20px] p-4 border border-white/10 hover:border-blue-500/30 rounded-2xl transition-all hover:-translate-y-1">
                <iframe
                  src="//player.bilibili.com/player.html?aid=961503110&bvid=BV1nH4y1U7Cc&cid=1281833478&p=1&autoplay=0"
                  className="mb-4 border-none rounded-xl w-full h-62.5 max-[480px]:h-45 max-md:h-50"
                  allowFullScreen
                ></iframe>
                <div className="text-center">
                  <h3 className="m-0 font-bold text-white text-xl text-left">{loc('AdvancedTutorial', '进阶教程')}</h3>
                </div>
              </div>
            </div>

            <div className="mt-8 text-center">
              <p className="m-0">
                <a
                  href="https://space.bilibili.com/397702/channel/collectiondetail?sid=391415&ctype=0"
                  className="font-medium text-blue-400 hover:text-blue-300 hover:underline no-underline transition-colors"
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
