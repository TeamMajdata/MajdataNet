/**
 * 推荐榜：七天内最受欢迎的谱面，按游玩、评价、评论、下载分页签查看
 */

import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { PageLayout, SongList } from '@/components';
import SegmentedTabs from '@/components/ui/SegmentedTabs';
import { endpoints } from '@/config/api';

/** 页签和后端排序参数的对应关系 */
const RANKINGS = [
  { key: 'play', sortType: 'scorep', label: 'ranking/RecommendRankingPage.Play', hint: 'ranking/RecommendRankingPage.PlayCountHint' },
  { key: 'score', sortType: 'topp', label: 'ranking/RecommendRankingPage.Score', hint: 'ranking/RecommendRankingPage.ScoreHint' },
  { key: 'comment', sortType: 'commp', label: 'ranking/RecommendRankingPage.Comment', hint: 'ranking/RecommendRankingPage.CommentCountHint' },
  { key: 'download', sortType: 'playp', label: 'ranking/RecommendRankingPage.Download', hint: 'ranking/RecommendRankingPage.DownloadCountHint' },
] as const;
type RankingKey = typeof RANKINGS[number]['key'];

export default function RecommendRankingPage() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  // 网址里记着当前页签，默认“游玩”
  const active = RANKINGS.find((ranking) => ranking.key === searchParams.get('tab')) ?? RANKINGS[0];
  const select = (key: RankingKey) => {
    const next = new URLSearchParams(searchParams);
    if (key === RANKINGS[0].key) next.delete('tab'); else next.set('tab', key);
    setSearchParams(next, { replace: true, preventScrollReset: true });
  };

  return (
    <PageLayout>
      <div className="mx-auto py-5 sm:py-8 w-full max-w-320 min-w-0">
        <header className="mb-5 sm:mb-6">
          <h1 className="m-0 font-semibold text-white! text-2xl! sm:text-3xl! text-left! tracking-tight">
            {t("ranking/RecommendRankingPage.Title")}
          </h1>
          <p className="m-0 mt-1.5 text-white/55! text-sm">{t("ranking/RecommendRankingPage.RecommendedChartsHint")}</p>
        </header>

        {/* 和“我的收藏”一样的分段页签 */}
        <SegmentedTabs
          className="mb-3"
          tabs={RANKINGS.map(({ key, label }) => ({ key, label: t(label) }))}
          active={active.key}
          onSelect={select}
          idPrefix="ranking"
          label={t("ranking/RecommendRankingPage.Title")}
        />

        <section id={`ranking-panel-${active.key}`} role="tabpanel" aria-labelledby={`ranking-tab-${active.key}`}>
          <p className="m-0 mb-4 text-white/45! text-xs">{t(active.hint)}</p>
          <SongList key={active.key} url={endpoints.maichart.listRanking(active.sortType)} isRanking />
        </section>
      </div>
    </PageLayout>
  );
}
