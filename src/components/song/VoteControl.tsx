/**
 * VoteControl - Reddit 式上下箭头投票控件
 * 按下已选中的箭头即撤票；分数立即更新，服务端拒绝时回滚。
 */

import { useTranslation } from 'react-i18next';
import { useLanguage } from '@/i18n';
import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { LuArrowBigDown, LuArrowBigUp } from 'react-icons/lu';
import { useUserContext } from '@/hooks';
import { compactNumber, loginPath } from '@/utils/interaction';
import type { Vote, VoteResult } from '@/types';

export interface VoteControlProps {
  score: number;
  myVote: Vote;
  /** 发送投票请求；value 为 0 表示撤票。 */
  onVote: (value: Vote) => Promise<VoteResult>;
  /** 服务端确认后的结果，由调用方写回自己的状态。 */
  onResult: (result: VoteResult) => void;
  /** 无障碍标签，说明这组按钮投的是什么。 */
  label: string;
  layout?: 'horizontal' | 'vertical';
  size?: 'sm' | 'md';
  disabled?: boolean;
  className?: string;
}

export function VoteControl({
  score,
  myVote,
  onVote,
  onResult,
  label,
  layout = 'horizontal',
  size = 'sm',
  disabled = false,
  className = '',
}: VoteControlProps) {
  const { t } = useTranslation();
  const language = useLanguage();
  const { user } = useUserContext();
  const navigate = useNavigate();
  const location = useLocation();
  const [pending, setPending] = useState<{ score: number; myVote: Vote } | null>(null);
  const shown = pending ?? { score, myVote };

  const cast = async (direction: 1 | -1) => {
    if (!user) {
      navigate(loginPath(location));
      return;
    }
    if (pending) return;
    const next: Vote = shown.myVote === direction ? 0 : direction;
    setPending({ score: score - myVote + next, myVote: next });
    try {
      onResult(await onVote(next));
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setPending(null);
    }
  };

  // 左边“赞 + 分数”，右边“踩”；赞了是橙色、踩了是蓝色（分数也跟着变色），细线条的箭头图标。
  // md（谱面页侧栏）：和页头按钮同样风格的带边框胶囊；sm（评论里）：没有底色，紧凑一些
  const md = size === 'md';
  const half = `inline-flex items-center gap-1.5 h-full text-white/65 hover:text-white hover:bg-white/10 transition-colors cursor-pointer disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/40 ${md ? 'px-3' : 'px-1.5 rounded-md'}`;
  const icon = md ? 'w-4 h-4' : 'w-3.5 h-3.5';
  return (
    <div role="group" aria-label={label}
      className={`inline-flex shrink-0 items-stretch ${layout === 'vertical' ? 'flex-col' : ''} ${md ? 'bg-white/[0.06] border border-white/10 rounded-xl h-9 overflow-hidden text-sm' : 'h-7 text-xs'} ${className}`}>
      <button
        type="button"
        className={`${half} ${shown.myVote === 1 ? 'bg-orange-400/15 text-orange-300!' : ''}`}
        aria-pressed={shown.myVote === 1}
        aria-label={t("song/VoteControl.Upvote")}
        title={t("song/VoteControl.Upvote")}
        disabled={disabled}
        onClick={() => void cast(1)}
      >
        <LuArrowBigUp aria-hidden="true" className={icon} />
        <span className={`font-semibold tabular-nums ${shown.myVote === 1 ? 'text-orange-400' : shown.myVote === -1 ? 'text-sky-400' : ''}`} aria-live="polite" title={`${t("song/VoteControl.Score")}: ${shown.score}`}>
          {compactNumber(shown.score, language)}
        </span>
      </button>
      {md && <span aria-hidden="true" className="bg-white/10 my-2 w-px" />}
      <button
        type="button"
        className={`${half} ${shown.myVote === -1 ? 'bg-sky-400/15 text-sky-300!' : ''}`}
        aria-pressed={shown.myVote === -1}
        aria-label={t("song/VoteControl.Downvote")}
        title={t("song/VoteControl.Downvote")}
        disabled={disabled}
        onClick={() => void cast(-1)}
      >
        <LuArrowBigDown aria-hidden="true" className={icon} />
      </button>
    </div>
  );
}
