/**
 * 排行榜页面
 * 迁移自 legacy/src/app/ranking/page.jsx
 */

import { useEffect, useState } from 'react';
import { setLanguage } from '@/utils/i18n';
import { useLoc } from '@/hooks';
import { PageLayout, SongList } from '@/components';
import { apiroot3 } from '@/config/api';
import type { RankingSectionProps } from '@/types';

export default function RankingPage() {
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
      <div className="mt-(--content-top-spacing) text-center mb-12">
        <p className="mx-auto max-w-150 text-[#f7f7f7] text-2xl leading-relaxed">
          {loc('RecommendedChartsHint', '这里会选出七天内最有人气的谱面哟！')}
        </p>
      </div>

      <div className="flex flex-col gap-12">
        <RankingSection
          title={loc('Play', '游玩')}
          subtitle={loc('PlayCountHint', '表示游玩次数多少')}
          sortType="scorep"
          delay="delay-[100ms]"
        />

        <RankingSection
          title={loc('Like', '点赞')}
          subtitle={loc('LikeCountHint', '被点赞的次数')}
          sortType="likep"
          delay="delay-[200ms]"
        />

        <RankingSection
          title={loc('Comment', '评论')}
          subtitle={loc('CommentCountHint', '被评论的次数')}
          sortType="commp"
          delay="delay-[300ms]"
        />

        <RankingSection
          title={loc('Download', '下载')}
          subtitle={loc('DownloadCountHint', '被下载的次数')}
          sortType="playp"
          delay="delay-[400ms]"
        />
      </div>
    </PageLayout>
  );
}

function RankingSection({ title, subtitle, sortType, delay = '' }: RankingSectionProps) {
  return (
    <div 
      className={`
        bg-[rgba(30,30,30,0.6)] 
        backdrop-blur-md 
        rounded-2xl 
        p-8 
        border border-white/10 
        shadow-[0_8px_32px_0_rgba(0,0,0,0.37)]
        animate-[slideInUp_0.6s_ease-out_both]
        ${delay}
      `}
    >
      <div className="flex items-center gap-4 mb-6 pb-4 border-white/10 border-b">
        <div>
          <h2 className="m-0 font-semibold text-[#e5e5e5] text-2xl">{title}</h2>
          <p className="m-0 mt-1 text-[#a0a0a0] text-sm">{subtitle}</p>
        </div>
      </div>
      <SongList
        url={apiroot3 + '/maichart/list?&isRanking=true&sort=' + encodeURIComponent(sortType)}
        isRanking={true}
      />
    </div>
  );
}
