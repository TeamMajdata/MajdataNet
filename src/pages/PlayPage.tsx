/**
 * MajdataPlay 介绍页面
 */

import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { setLanguage } from '@/utils/i18n';
import { useLoc } from '@/hooks';
import { PageLayout, LoadingSpinner } from '@/components';

export default function PlayPage() {
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
        <title>MajdataPlay - Majdata Net</title>
        <meta name="description" content="MajdataPlay 是一款免费开源的 majdata 游玩器，支持 Windows、Android 和 iOS 平台" />
        <meta name="keywords" content="MajdataPlay, Majplay, maimai, 音游, 模拟器, maimai simulator, majdata, player" />

        {/* Open Graph */}
        <meta property="og:title" content="MajdataPlay - majdata 游玩器" />
        <meta property="og:description" content="MajdataPlay 是一款免费开源的 majdata 游玩器，支持 Windows、Android 和 iOS 平台" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://majdata.net/play" />
        <meta property="og:image" content="https://majdata.net/salt.webp" />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="MajdataPlay - majdata 游玩器" />
        <meta name="twitter:description" content="MajdataPlay 是一款免费开源的 majdata 游玩器，支持 Windows、Android 和 iOS 平台" />
        <meta name="twitter:image" content="https://majdata.net/salt.webp" />
      </Helmet>

      <PageLayout className="pb-8">
        <div className="mx-auto px-4 max-w-250">
          {/* 特别注意 */}
          <section className="bg-yellow-500/5 mb-8 p-6 border border-yellow-500/30 rounded-2xl">
            <h2 className="mb-4 font-bold text-yellow-400 text-2xl">⚠️ {loc('ImportantNotice', '特别注意')}</h2>
            <ul className="space-y-2 text-[#b0b0b0] text-base leading-relaxed list-disc list-inside">
              <li>{loc('Notice1', '我们不提倡使用 Majplay 游玩 Maimai 官方谱面，请支持街机游戏')}</li>
              <li>{loc('Notice2', '请勿将其他软件的游玩视频标为 Majplay，欢迎你分享真 Majplay 的游玩视频！')}</li>
              <li>{loc('Notice3', '本软件为全开源免费软件，开发者不做任何保证')}</li>
            </ul>
          </section>

          {/* 产品介绍部分 */}
          <section className="mb-16 py-8 text-center">
            <div className="bg-[rgb(30_30_30/90%)] shadow-[0_20px_60px_rgb(0_0_0/30%),0_4px_20px_rgb(59_130_246/10%)] backdrop-blur-[20px] p-8 md:p-12 border border-white/10 rounded-3xl">
              <div className="flex justify-center items-center gap-4 mb-6">
                <img className="rounded-xl w-16 h-16 object-cover" src="./salt.webp" alt="MajdataPlay" />
                <h1 className="bg-clip-text bg-linear-to-br from-white to-[#e5e5e5] m-0 font-bold text-transparent text-4xl">MajdataPlay</h1>
              </div>
              <p className="my-4 text-[#b0b0b0] text-xl leading-relaxed">{loc('MajplayPunchline', '免费开源的 majdata 游玩器')}</p>
              <p className="mb-8 text-[#888] text-base italic">Windows / Android / iOS</p>

              <div className="flex flex-wrap justify-center items-center gap-4 my-6">
                <a href="https://github.com/LingFeng-bbben/MajdataPlay" className="transition-transform hover:-translate-y-0.5">
                  <img
                    src="https://img.shields.io/github/stars/LingFeng-bbben/MajdataPlay?style=social"
                    alt="GitHub Stars"
                    className="rounded-md"
                  />
                </a>
                <img
                  src="https://img.shields.io/badge/License-GPL--3.0-blue"
                  alt="License Badge"
                  className="rounded-md"
                />
              </div>
            </div>
          </section>

          {/* 下载部分 */}
          <section className="mb-16">
            <h2 className="mb-10 pl-4 font-bold text-white text-3xl text-left">{loc('Download', '下载')}</h2>

            {/* PC版下载 */}
            <div className="mb-12">
              <h3 className="mb-6 pl-2 font-semibold text-white text-2xl text-left">💻 {loc('DownloadPC', '下载 PC 版')}</h3>
              <div className="gap-6 grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] mb-8">
                {/* Majdata Hub */}
                <div className="bg-[rgb(30_30_30/90%)] backdrop-blur-[20px] p-6 border border-white/10 rounded-2xl">
                  <h4 className="mb-4 font-bold text-emerald-400 text-xl">{loc('UseMajdataHub', '使用 Majdata Hub')}</h4>
                  <p className="mb-4 text-[#888] text-sm">{loc('RecommendedMethod', '推荐方式，支持增量更新')}</p>
                  <div className="flex flex-col gap-3">
                    <a
                      href="https://github.com/KirisameVanilla/MajdataHub/releases/latest"
                      className="block bg-linear-to-r from-blue-500 hover:from-blue-600 to-blue-600 hover:to-blue-700 shadow-md hover:shadow-lg px-4 py-3 rounded-xl font-medium text-white text-sm text-center transition-all hover:-translate-y-0.5"
                    >
                      {loc('OverseasGitHub', '海外推荐 (GitHub)')}
                    </a>
                    <a
                      href="https://cnb.cool/TeamMajdata/MajdataHub-Build"
                      className="block bg-linear-to-r from-purple-500 hover:from-purple-600 to-purple-600 hover:to-purple-700 shadow-md hover:shadow-lg px-4 py-3 rounded-xl font-medium text-white text-sm text-center transition-all hover:-translate-y-0.5"
                    >
                      {loc('DomesticCNB', '国内推荐 (腾讯 CNB)')}
                    </a>
                  </div>
                </div>

                {/* 直链下载 */}
                <div className="bg-[rgb(30_30_30/90%)] backdrop-blur-[20px] p-6 border border-white/10 rounded-2xl">
                  <h4 className="mb-4 font-bold text-blue-400 text-xl">{loc('DirectDownload', '使用直链下载')}</h4>
                  <p className="mb-4 text-[#888] text-sm">{loc('DirectDownloadDesc', '直接下载游戏压缩包')}</p>
                  <div className="flex flex-col gap-3">
                    <a
                      href="https://github.com/TeamMajdata/MajdataPlay_Build/archive/refs/heads/main.zip"
                      className="block bg-linear-to-r from-blue-500 hover:from-blue-600 to-blue-600 hover:to-blue-700 shadow-md hover:shadow-lg px-4 py-3 rounded-xl font-medium text-white text-sm text-center transition-all hover:-translate-y-0.5"
                    >
                      {loc('OverseasGitHub', '海外推荐 (GitHub)')}
                    </a>
                    <a
                      href="https://cnb.cool/TeamMajdata/MajdataPlay_Build/-/git/archive/LATEST.zip"
                      className="block bg-linear-to-r from-purple-500 hover:from-purple-600 to-purple-600 hover:to-purple-700 shadow-md hover:shadow-lg px-4 py-3 rounded-xl font-medium text-white text-sm text-center transition-all hover:-translate-y-0.5"
                    >
                      {loc('DomesticCNB', '国内推荐 (腾讯 CNB)')}
                    </a>
                    <a
                      href="https://storage.leziblog.com/MajdataPlay"
                      className="block bg-linear-to-r from-green-500 hover:from-green-600 to-green-600 hover:to-green-700 shadow-md hover:shadow-lg px-4 py-3 rounded-xl font-medium text-white text-sm text-center transition-all hover:-translate-y-0.5"
                    >
                      LeZi's Storage
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* 移动端下载 */}
            <div className="mb-12">
              <h3 className="mb-6 pl-2 font-semibold text-white text-2xl text-left">📱 {loc('DownloadMobile', '下载移动版')}</h3>
              <div className="gap-6 grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] mb-8">
                {/* Android */}
                <div className="bg-[rgb(30_30_30/90%)] backdrop-blur-[20px] p-6 border border-white/10 rounded-2xl">
                  <div className="flex items-center gap-3 mb-4">
                    <h4 className="m-0 font-bold text-green-400 text-xl">Android</h4>
                  </div>
                  <div className="flex flex-col gap-3">
                    <a
                      href="https://github.com/TeamMajdata/MajdataPlay_Build/releases"
                      className="block bg-linear-to-r from-blue-500 hover:from-blue-600 to-blue-600 hover:to-blue-700 shadow-md hover:shadow-lg px-4 py-3 rounded-xl font-medium text-white text-sm text-center transition-all hover:-translate-y-0.5"
                    >
                      GitHub Releases
                    </a>
                    <a
                      href="https://storage.leziblog.com/MajdataPlay/Android"
                      className="block bg-linear-to-r from-green-500 hover:from-green-600 to-green-600 hover:to-green-700 shadow-md hover:shadow-lg px-4 py-3 rounded-xl font-medium text-white text-sm text-center transition-all hover:-translate-y-0.5"
                    >
                      LeZi's Storage
                    </a>
                  </div>
                </div>

                {/* iOS */}
                <div className="bg-[rgb(30_30_30/90%)] backdrop-blur-[20px] p-6 border border-white/10 rounded-2xl">
                  <div className="flex items-center gap-3 mb-4">
                    <h4 className="m-0 font-bold text-blue-400 text-xl">iOS</h4>
                  </div>
                  <div className="flex flex-col gap-3">
                    <a
                      href="https://github.com/TeamMajdata/MajdataPlay_Build/releases"
                      className="block bg-linear-to-r from-blue-500 hover:from-blue-600 to-blue-600 hover:to-blue-700 shadow-md hover:shadow-lg px-4 py-3 rounded-xl font-medium text-white text-sm text-center transition-all hover:-translate-y-0.5"
                    >
                      GitHub Releases
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* 教程部分 */}
          <section className="mb-16">
            <h2 className="mb-10 pl-4 font-bold text-white text-3xl text-left">{loc('Tutorials', '教程')}</h2>
            <div className="gap-6 grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] mb-8">
              <a
                href="https://github.com/LingFeng-bbben/MajdataPlay/blob/beta1.0/Doc/Majplay.pdf"
                className="block bg-[rgb(30_30_30/90%)] hover:bg-[rgb(35_35_40/95%)] hover:shadow-[0_12px_30px_rgb(0_0_0/30%),0_4px_15px_rgb(59_130_246/10%)] backdrop-blur-[20px] p-6 border border-white/10 hover:border-blue-500/30 rounded-2xl text-inherit no-underline transition-all hover:-translate-y-1"
              >
                <div className="w-full">
                  <h3 className="inline-block m-0 mb-3 pb-2 border-emerald-500/30 border-b-2 font-bold text-white text-xl">{loc('SetupTutorial', '设置教程')}</h3>
                  <p className="m-0 text-[#b0b0b0] text-base leading-relaxed">{loc('SetupTutorialDesc', 'MajdataPlay 设置教程 PDF')}</p>
                </div>
              </a>

              <a
                href="https://github.com/LingFeng-bbben/MajdataPlay/wiki"
                className="block bg-[rgb(30_30_30/90%)] hover:bg-[rgb(35_35_40/95%)] hover:shadow-[0_12px_30px_rgb(0_0_0/30%),0_4px_15px_rgb(59_130_246/10%)] backdrop-blur-[20px] p-6 border border-white/10 hover:border-blue-500/30 rounded-2xl text-inherit no-underline transition-all hover:-translate-y-1"
              >
                <div className="w-full">
                  <h3 className="inline-block m-0 mb-3 pb-2 border-emerald-500/30 border-b-2 font-bold text-white text-xl">GitHub Wiki</h3>
                  <p className="m-0 text-[#b0b0b0] text-base leading-relaxed">{loc('WikiDesc', '详细的使用文档和常见问题')}</p>
                </div>
              </a>
            </div>
          </section>

          {/* 社群部分 */}
          <section className="mb-16">
            <h2 className="mb-10 pl-4 font-bold text-white text-3xl text-left">{loc('Community', '社群')}</h2>
            <div className="gap-6 grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] mb-8">
              <a
                href="https://qm.qq.com/q/UmWlxCho4M"
                className="block bg-[rgb(30_30_30/90%)] hover:bg-[rgb(35_35_40/95%)] hover:shadow-[0_12px_30px_rgb(0_0_0/30%),0_4px_15px_rgb(59_130_246/10%)] backdrop-blur-[20px] p-6 border border-white/10 hover:border-blue-500/30 rounded-2xl text-inherit no-underline transition-all hover:-translate-y-1"
              >
                <div className="flex items-center gap-4 mb-3">
                  <span className="text-4xl">💬</span>
                  <h3 className="m-0 font-bold text-white text-xl">QQ {loc('Group', '群')}</h3>
                </div>
                <p className="m-0 text-[#b0b0b0] text-base">667644338</p>
              </a>

              <a
                href="https://discord.gg/AcWgZN7j6K"
                className="block bg-[rgb(30_30_30/90%)] hover:bg-[rgb(35_35_40/95%)] hover:shadow-[0_12px_30px_rgb(0_0_0/30%),0_4px_15px_rgb(59_130_246/10%)] backdrop-blur-[20px] p-6 border border-white/10 hover:border-blue-500/30 rounded-2xl text-inherit no-underline transition-all hover:-translate-y-1"
              >
                <div className="flex items-center gap-4 mb-3">
                  <span className="text-4xl">💬</span>
                  <h3 className="m-0 font-bold text-white text-xl">Discord</h3>
                </div>
                <p className="m-0 text-[#b0b0b0] text-base">{loc('JoinDiscord', '加入 Discord 服务器')}</p>
              </a>

              <a
                href="https://majdata.net"
                className="block bg-[rgb(30_30_30/90%)] hover:bg-[rgb(35_35_40/95%)] hover:shadow-[0_12px_30px_rgb(0_0_0/30%),0_4px_15px_rgb(59_130_246/10%)] backdrop-blur-[20px] p-6 border border-white/10 hover:border-blue-500/30 rounded-2xl text-inherit no-underline transition-all hover:-translate-y-1"
              >
                <div className="flex items-center gap-4 mb-3">
                  <span className="text-4xl">🌐</span>
                  <h3 className="m-0 font-bold text-white text-xl">Majdata.net</h3>
                </div>
                <p className="m-0 text-[#b0b0b0] text-base">{loc('ChartsSharingPlatform', '谱面分享平台')}</p>
              </a>
            </div>
          </section>

          {/* 相关项目 */}
          <section className="mb-16">
            <h2 className="mb-10 pl-4 font-bold text-white text-3xl text-left">{loc('RelatedProjects', '相关项目')}</h2>
            <div className="bg-[rgb(30_30_30/90%)] backdrop-blur-[20px] p-6 border border-white/10 rounded-2xl">
              <ul className="space-y-3 text-[#b0b0b0] text-base leading-relaxed">
                <li>
                  <a href="https://github.com/TeamMajdata/MajdataNet" className="text-blue-400 hover:text-blue-300 hover:underline transition-colors">
                    MajdataNet
                  </a>
                  {' '}- {loc('ChartsSharingFrontend', '谱面分享站前端')}
                </li>
                <li>
                  <a href="https://github.com/Wh1tyEnd/MajdataView_web/tree/nolist" className="text-blue-400 hover:text-blue-300 hover:underline transition-colors">
                    MajdataView_web
                  </a>
                  {' '}- {loc('WebChartPlayer', 'Web 谱面播放器')}
                </li>
                <li>
                  <a href="https://github.com/LingFeng-bbben/MajSimai" className="text-blue-400 hover:text-blue-300 hover:underline transition-colors">
                    MajSimai
                  </a>
                  {' '}- {loc('CSharpSimaiParser', 'C# 的 Simai 解释器')}
                </li>
                <li>
                  <a href="https://github.com/LingFeng-bbben/MajdataEdit-Neo" className="text-blue-400 hover:text-blue-300 hover:underline transition-colors">
                    MajdataEdit-neo
                  </a>
                  {' '}- {loc('NewChartEditor', '带语法高亮的新谱面编辑器 (WIP)')}
                </li>
                <li>
                  <a href="https://github.com/KirisameVanilla/MajdataHub" className="text-blue-400 hover:text-blue-300 hover:underline transition-colors">
                    MajdataHub
                  </a>
                  {' '}- {loc('HubDesc', '可用于下载更新游戏、下载谱面、下载皮肤')}
                </li>
              </ul>
            </div>
          </section>

          {/* 开源信息 */}
          <section className="mb-8 text-center">
            <h2 className="mb-4 font-bold text-white text-2xl">{loc('OpenSource', '开源')}</h2>
            <div className="bg-[rgb(30_30_30/90%)] backdrop-blur-[20px] p-8 border border-white/10 rounded-2xl">
              <p className="mb-6 text-[#b0b0b0] text-base leading-relaxed">
                {loc('OpenSourceDesc', 'MajdataPlay 是一个开源项目，欢迎贡献代码')}
              </p>
              <a
                href="https://github.com/LingFeng-bbben/MajdataPlay"
                className="inline-block bg-linear-to-br from-gray-700 hover:from-gray-600 to-gray-800 hover:to-gray-700 shadow-lg hover:shadow-xl px-8 py-4 rounded-2xl font-semibold text-white text-lg no-underline transition-all hover:-translate-y-1"
              >
                {loc('ViewSourceCode', '查看源代码')} →
              </a>
            </div>
          </section>

          {/* 隐私政策 */}
          <section className="mb-16 text-left">
            <h2 className="mb-10 pl-4 font-bold text-white text-3xl text-left">{loc('PrivatePolicy', 'Privacy Policy')}</h2>
            <div className="bg-[rgb(30_30_30/90%)] backdrop-blur-[20px] p-8 border border-white/10 rounded-2xl">
              <div className="space-y-8">
                {/* Introduction */}
                <div className="text-left">
                  <h3 className="mb-3 pb-2 border-emerald-500/30 border-b font-bold text-white text-xl text-left">1. {loc('PrivacyIntroTitle', 'Introduction')}</h3>
                  <p className="text-[#b0b0b0] text-base text-left leading-relaxed">{loc('PrivacyIntro', 'Welcome to this game. This game is an open-source project, and its source code is publicly available. This Privacy Policy explains how we collect, use, and protect your information.')}</p>
                </div>

                {/* Information We Collect */}
                <div className="text-left">
                  <h3 className="mb-3 pb-2 border-emerald-500/30 border-b font-bold text-white text-xl text-left">2. {loc('PrivacyInfoWeCollect', 'Information We Collect')}</h3>
                  <div className="space-y-4">
                    <div className="text-left">
                      <h4 className="mb-2 font-semibold text-white text-lg text-left">2.1 {loc('PrivacyNoPersonalInfo', 'No Personally Identifiable Information')}</h4>
                      <p className="text-[#b0b0b0] text-base text-left leading-relaxed">{loc('PrivacyNoPersonalInfoDesc', 'This game does not require user registration and does not actively collect your name, address, email address, phone number, or other personally identifiable information.')}</p>
                    </div>
                  </div>
                </div>

                {/* Data Storage and Security */}
                <div className="text-left">
                  <h3 className="mb-3 pb-2 border-emerald-500/30 border-b font-bold text-white text-xl text-left">3. {loc('PrivacyDataSecurity', 'Data Storage and Security')}</h3>
                  <p className="text-[#b0b0b0] text-base text-left leading-relaxed">{loc('PrivacyDataSecurityDesc', 'We take reasonable measures to protect data security. However, no method of transmission over the Internet can guarantee absolute security.')}</p>
                </div>

                {/* Local Data Storage */}
                <div className="text-left">
                  <h3 className="mb-3 pb-2 border-emerald-500/30 border-b font-bold text-white text-xl text-left">4. {loc('PrivacyLocalStorage', 'Local Data Storage')}</h3>
                  <p className="mb-3 text-[#b0b0b0] text-base text-left leading-relaxed">{loc('PrivacyLocalStorageDesc1', 'The game may store the following data locally on your device:')}</p>
                  <ul className="space-y-2 pl-6 text-[#b0b0b0] text-base text-left leading-relaxed list-disc">
                    <li className="text-left">{loc('PrivacyLocalStorageItem1', 'Game settings')}</li>
                    <li className="text-left">{loc('PrivacyLocalStorageItem2', 'Game levels')}</li>
                    <li className="text-left">{loc('PrivacyLocalStorageItem3', 'Chart scores')}</li>
                    <li className="text-left">{loc('PrivacyLocalStorageItem4', 'Game logs')}</li>
                  </ul>
                  <p className="mt-3 text-[#b0b0b0] text-base text-left leading-relaxed">{loc('PrivacyLocalStorageDesc2', 'This data remains on your device and is not automatically uploaded.')}</p>
                </div>

                {/* Open Source Notice */}
                <div className="text-left">
                  <h3 className="mb-3 pb-2 border-emerald-500/30 border-b font-bold text-white text-xl text-left">5. {loc('PrivacyOpenSource', 'Open Source Notice')}</h3>
                  <p className="text-[#b0b0b0] text-base text-left leading-relaxed">{loc('PrivacyOpenSourceDesc', 'This game is an open-source project. You may review the source code to understand how data is handled. Community review and contributions are encouraged.')}</p>
                </div>

                {/* Changes to This Policy */}
                <div className="text-left">
                  <h3 className="mb-3 pb-2 border-emerald-500/30 border-b font-bold text-white text-xl text-left">6. {loc('PrivacyChanges', 'Changes to This Policy')}</h3>
                  <p className="text-[#b0b0b0] text-base text-left leading-relaxed">{loc('PrivacyChangesDesc', 'We may update this Privacy Policy from time to time. Updates will be posted on the project page.')}</p>
                </div>

                {/* Contact Information */}
                <div className="text-left">
                  <h3 className="mb-3 pb-2 border-emerald-500/30 border-b font-bold text-white text-xl text-left">7. {loc('PrivacyContact', 'Contact Information')}</h3>
                  <p className="mb-3 text-[#b0b0b0] text-base text-left leading-relaxed">{loc('PrivacyContactDesc', 'If you have any privacy-related questions, please contact us via:')}</p>
                  <ul className="space-y-2 pl-6 text-[#b0b0b0] text-base text-left leading-relaxed list-disc">
                    <li className="text-left">{loc('PrivacyContactItem1', 'Project homepage')}</li>
                    <li className="text-left"><a href="https://github.com/LingFeng-bbben/MajdataPlay/issues" className="text-blue-400 hover:text-blue-300 hover:underline transition-colors">{loc('PrivacyContactItem2', 'Repository issue tracker')}</a></li>
                    <li className="text-left">
                      <a href="mailto:admin@majdata.net" className="text-blue-400 hover:text-blue-300 hover:underline transition-colors">
                        admin@majdata.net
                      </a>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </section>
        </div>
      </PageLayout>
    </>
  );
}
