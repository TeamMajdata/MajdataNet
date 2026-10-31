import { PiArrowFatUpBold, PiChatCircleBold, PiPlayBold } from 'react-icons/pi';
import { useI18n, useInteractSummary } from '@/hooks';
import { compactNumber } from '@/utils/interaction';
import type { InteractCountProps } from '@/types';

/**
 * 互动计数组件
 * 显示播放次数、分数（赞减踩）、评论数；在列表里由 InteractSummaryProvider 批量提供数据。
 */
export default function InteractCount({ songid }: InteractCountProps) {
  const { i18n, language } = useI18n();
  const summary = useInteractSummary(songid);

  if (summary === null) return <div></div>;
  if (summary === undefined) return <div className="mt-2 ml-0.5 h-[1.3rem] text-[0.8rem] text-white/50">..</div>;

  const highlight = (value: number) => (value >= 5 ? 'bg-amber-300 text-black' : 'text-white');
  const cell = 'inline-flex items-center gap-0.5 rounded px-1 h-[1.3rem] text-[0.8rem] tabular-nums';

  return (
    <div className="flex items-center gap-1 mt-2 ml-0.5">
      <span className={`${cell} text-white`} title={i18n("score/InteractCount.Plays", '播放')}>
        <PiPlayBold className="w-3.5 h-3.5" aria-hidden="true" />
        {compactNumber(summary.plays, language)}
      </span>
      <span className={`${cell} ${highlight(summary.score)}`} title={i18n("score/InteractCount.Score", '分数')}>
        <PiArrowFatUpBold className="w-3.5 h-3.5" aria-hidden="true" />
        {compactNumber(summary.score, language)}
      </span>
      <span className={`${cell} ${highlight(summary.comments)}`} title={i18n("score/InteractCount.Comments", '评论')}>
        <PiChatCircleBold className="w-3.5 h-3.5" aria-hidden="true" />
        {compactNumber(summary.comments, language)}
      </span>
    </div>
  );
}
