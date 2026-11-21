import { useTranslation } from 'react-i18next';
import { useLanguage } from '@/i18n';
import { LuArrowBigUp, LuMessageCircle, LuPlay } from 'react-icons/lu';
import { useInteractSummary } from '@/hooks';
import { compactNumber } from '@/utils/interaction';
import type { InteractCountProps } from '@/types';

/**
 * 互动计数组件
 * 显示播放次数、分数（赞减踩）、评论数；在列表里由 InteractSummaryProvider 批量提供数据。
 */
export default function InteractCount({ songid }: InteractCountProps) {
  const { t } = useTranslation();
  const language = useLanguage();
  const summary = useInteractSummary(songid);

  if (summary === null) return <div></div>;
  if (summary === undefined) return <div className="h-5 text-white/40 text-xs">..</div>;

  // 数值达到 5 时用琥珀色文字强调，不再用整块底色
  const highlight = (value: number) => (value >= 5 ? 'text-amber-300' : 'text-white/60');
  const cell = 'inline-flex items-center gap-1 h-5 text-xs tabular-nums whitespace-nowrap';

  return (
    <div className="flex items-center gap-2.5 min-w-0">
      <span className={`${cell} text-white/60`} title={t("score/InteractCount.Plays")}>
        <LuPlay className="w-3.5 h-3.5" aria-hidden="true" />
        {compactNumber(summary.plays, language)}
      </span>
      <span className={`${cell} ${highlight(summary.score)}`} title={t("score/InteractCount.Score")}>
        <LuArrowBigUp className="w-3.5 h-3.5" aria-hidden="true" />
        {compactNumber(summary.score, language)}
      </span>
      <span className={`${cell} ${highlight(summary.comments)}`} title={t("score/InteractCount.Comments")}>
        <LuMessageCircle className="w-3.5 h-3.5" aria-hidden="true" />
        {compactNumber(summary.comments, language)}
      </span>
    </div>
  );
}
