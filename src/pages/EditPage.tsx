/**
 * 编辑页面 (MajdataEdit介绍)
 * 迁移自 legacy/src/app/edit/page.jsx
 */

import { useEffect, useState } from 'react';
import { setLanguage } from '@/utils/i18n';
import { useLoc } from '@/hooks';
import { PageLayout } from '@/components';

export default function EditPage() {
  const loc = useLoc();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setLanguage(localStorage.getItem('language') || navigator.language).then(() => {
      setReady(true);
    });
  }, []);

  if (!ready) return <div className="m-auto border-[3px] border-[rgb(var(--background-start))] border-t-white border-solid rounded-full w-[50px] h-[50px] animate-[spin_0.1s_linear_infinite]"></div>;

  return (
    <PageLayout className="pb-8">
      <div className="mx-auto px-4 max-w-[1000px]">
        {/* 产品介绍部分 */}
        <section className="mb-16 py-8 text-center">
          <div className="bg-[rgb(30_30_30/90%)] shadow-[0_20px_60px_rgb(0_0_0/30%),0_4px_20px_rgb(59_130_246/10%)] backdrop-blur-[20px] p-8 md:p-12 border border-white/10 rounded-3xl">
            <div className="flex justify-center items-center gap-4 mb-6">
              <img className="rounded-xl w-16 h-16 object-cover" src="./salt.webp" alt="MajdataEdit" />
              <h1 className="bg-clip-text bg-gradient-to-br from-white to-[#e5e5e5] m-0 font-bold text-transparent text-4xl">MajdataEdit</h1>
            </div>
            <p className="my-4 text-[#b0b0b0] text-xl leading-relaxed">{loc('MajdataPunchline', 'MajdataEdit 谱面编辑器')}</p>
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
              <div className="flex items-center gap-3 bg-gradient-to-br from-emerald-500 hover:from-emerald-600 to-emerald-600 hover:to-emerald-700 shadow-[0_8px_25px_rgb(16_185_129/30%),0_2px_10px_rgb(0_0_0/20%)] hover:shadow-[0_12px_35px_rgb(16_185_129/40%),0_4px_15px_rgb(0_0_0/30%)] px-8 py-4 rounded-2xl font-semibold text-white text-lg transition-all hover:-translate-y-1">{loc('Download', '下载')}</div>
            </a>
          </div>
        </section>

        {/* 教程部分 */}
        <section className="mb-16">
          <h2 className="mb-10 pl-4 font-bold text-white text-3xl text-left">{loc('Tutorials', '教程')}</h2>
          <div className="gap-6 grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] mb-8">
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
          <h2 className="mb-10 pl-4 font-bold text-white text-3xl text-left">{loc('VideoTutorials', '视频教程')}</h2>
          <div className="gap-8 grid grid-cols-[repeat(auto-fit,minmax(400px,1fr))] max-md:grid-cols-1 mb-8">
            <div className="bg-[rgb(30_30_30/90%)] hover:bg-[rgb(35_35_40/95%)] hover:shadow-[0_12px_30px_rgb(0_0_0/30%),0_4px_15px_rgb(59_130_246/10%)] backdrop-blur-[20px] p-4 border border-white/10 hover:border-blue-500/30 rounded-2xl transition-all hover:-translate-y-1">
              <iframe
                src="//player.bilibili.com/player.html?aid=678023171&bvid=BV15m4y1D7h1&cid=482366924&p=1&autoplay=0"
                className="mb-4 border-none rounded-xl w-full h-[250px] max-[480px]:h-[180px] max-md:h-[200px]"
                allowFullScreen
              ></iframe>
              <div className="text-center">
                <h3 className="m-0 font-bold text-white text-xl text-left">{loc('BasicTutorial', '基础教程')}</h3>
              </div>
            </div>

            <div className="bg-[rgb(30_30_30/90%)] hover:bg-[rgb(35_35_40/95%)] hover:shadow-[0_12px_30px_rgb(0_0_0/30%),0_4px_15px_rgb(59_130_246/10%)] backdrop-blur-[20px] p-4 border border-white/10 hover:border-blue-500/30 rounded-2xl transition-all hover:-translate-y-1">
              <iframe
                src="//player.bilibili.com/player.html?aid=961503110&bvid=BV1nH4y1U7Cc&cid=1281833478&p=1&autoplay=0"
                className="mb-4 border-none rounded-xl w-full h-[250px] max-[480px]:h-[180px] max-md:h-[200px]"
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
  );
}
