/**
 * VoteControl - Reddit 式上下箭头投票控件
 * 按下已选中的箭头即撤票；分数立即更新，服务端拒绝时回滚。
 */

import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { PiArrowFatDownBold, PiArrowFatDownFill, PiArrowFatUpBold, PiArrowFatUpFill } from 'react-icons/pi';
import { useI18n, useUserContext } from '@/hooks';
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
  const { i18n, language } = useI18n();
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

  const iconClass = size === 'md' ? 'w-5 h-5' : 'w-4 h-4';
  const arrow = `inline-flex items-center justify-center rounded-full text-white/60 transition-all duration-200 hover:bg-white/10 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 disabled:pointer-events-none disabled:opacity-50 ${size === 'md' ? 'w-9 h-9' : 'w-7 h-7'}`;

  return (
    <div
      role="group"
      aria-label={label}
      className={`inline-flex shrink-0 items-center gap-0.5 ${layout === 'vertical' ? 'flex-col' : ''} ${className}`}
    >
      <button
        type="button"
        className={`${arrow} ${shown.myVote === 1 ? 'text-orange-400 hover:text-orange-300' : ''}`}
        aria-pressed={shown.myVote === 1}
        aria-label={i18n("song/VoteControl.Upvote", '赞')}
        title={i18n("song/VoteControl.Upvote", '赞')}
        disabled={disabled}
        onClick={() => void cast(1)}
      >
        {shown.myVote === 1 ? <PiArrowFatUpFill className={iconClass} /> : <PiArrowFatUpBold className={iconClass} />}
      </button>
      <span
        className={`min-w-6 text-center font-semibold tabular-nums ${size === 'md' ? 'text-lg' : 'text-sm'} ${shown.myVote === 1 ? 'text-orange-400' : shown.myVote === -1 ? 'text-sky-400' : 'text-white/90'}`}
        aria-live="polite"
        title={`${i18n("song/VoteControl.Score", '分数')}: ${shown.score}`}
      >
        {compactNumber(shown.score, language)}
      </span>
      <button
        type="button"
        className={`${arrow} ${shown.myVote === -1 ? 'text-sky-400 hover:text-sky-300' : ''}`}
        aria-pressed={shown.myVote === -1}
        aria-label={i18n("song/VoteControl.Downvote", '踩')}
        title={i18n("song/VoteControl.Downvote", '踩')}
        disabled={disabled}
        onClick={() => void cast(-1)}
      >
        {shown.myVote === -1 ? <PiArrowFatDownFill className={iconClass} /> : <PiArrowFatDownBold className={iconClass} />}
      </button>
    </div>
  );
}
