/**
 * 排行榜页面
 * 迁移自 legacy/src/app/ranking/page.jsx
 */

import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { PageLayout, SongList } from '@/components';
import { endpoints } from '@/config/api';
import type { RankingSectionProps } from '@/types';

export default function RankingPage() {
  const { t } = useTranslation();

  return (
    <PageLayout className="pb-8">
      <div className="mt-(--content-top-spacing) text-center mb-8 sm:mb-12">
        <p className="mx-auto max-w-150 text-[#f7f7f7] text-lg sm:text-2xl leading-relaxed">
          {t("ranking/RankingPage.RecommendedChartsHint")}
        </p>
      </div>

      <div className="flex flex-col gap-6 sm:gap-12">
        <RankingSection
          title={t("ranking/RankingPage.Play")}
          subtitle={t("ranking/RankingPage.PlayCountHint")}
          sortType="scorep"
          delay="delay-[100ms]"
        />

        <RankingSection
          title={t("ranking/RankingPage.Score")}
          subtitle={t("ranking/RankingPage.ScoreHint")}
          sortType="topp"
          delay="delay-[200ms]"
        />

        <RankingSection
          title={t("ranking/RankingPage.Comment")}
          subtitle={t("ranking/RankingPage.CommentCountHint")}
          sortType="commp"
          delay="delay-[300ms]"
        />

        <RankingSection
          title={t("ranking/RankingPage.Download")}
          subtitle={t("ranking/RankingPage.DownloadCountHint")}
          sortType="playp"
          delay="delay-[400ms]"
        />
      </div>
    </PageLayout>
  );
}

function RankingSection({ title, subtitle, sortType, delay = '' }: RankingSectionProps) {
  // Extract delay number if possible, or mapping it. It seems delay is a class string like "delay-[100ms]".
  // Since we are moving to framer-motion, we should parse this or pass a number.
  // The delay prop is "delay-[100ms]", "delay-[200ms]" etc.
  const delayMs = delay ? parseInt(delay.replace(/[^0-9]/g, '')) / 1000 : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut", delay: delayMs }}
      className={`
        bg-[rgba(30,30,30,0.6)] 
        backdrop-blur-md 
        rounded-2xl 
        p-4 sm:p-6 md:p-8
        border border-white/10 
        shadow-[0_8px_32px_0_rgba(0,0,0,0.37)]
      `}
    >
      <div className="flex items-center gap-4 mb-6 pb-4 border-white/10 border-b">
        <div>
          <h2 className="m-0 font-semibold text-[#e5e5e5] text-2xl">{title}</h2>
          <p className="m-0 mt-1 text-[#a0a0a0] text-sm">{subtitle}</p>
        </div>
      </div>
      <SongList
        url={endpoints.maichart.listRanking(sortType)}
        isRanking={true}
      />
    </motion.div>
  );
}
