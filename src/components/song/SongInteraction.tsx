/**
 * ChartVotePanel - 歌曲页侧栏的投票面板：上下箭头、分数，以及赞/踩/播放的明细。
 */

import useSWR from 'swr';
import { PiArrowFatDownBold, PiArrowFatUpBold, PiPlayBold } from 'react-icons/pi';
import { endpoints } from '@/config/api';
import { LoadingSpinner } from '@/components';
import { useI18n } from '@/hooks';
import { apiFetcher, apiRequest, jsonRequest } from '@/utils/apiClient';
import { VoteControl } from './VoteControl';
import { compactNumber } from '@/utils/interaction';
import type { ChartInteractSummary, Vote, VoteResult } from '@/types';

export function ChartVotePanel({ songid }: { songid: string }) {
  const { i18n, language } = useI18n();
  const { data, error, isLoading, mutate } = useSWR<ChartInteractSummary>(endpoints.maichart.interactsum(songid), apiFetcher, {
    revalidateOnFocus: false,
  });

  if (error) {
    return <div className="py-3 text-white/50 text-sm">{i18n("song/SongInteraction.FailedToLoad", '加载失败')}</div>;
  }
  if (isLoading || !data) {
    return (
      <div className="flex justify-center items-center py-6">
        <LoadingSpinner size={28} />
      </div>
    );
  }

  const stat = 'inline-flex items-center gap-1 text-white/60 text-xs tabular-nums';
  return (
    <div className="flex flex-col gap-3 pt-2">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <h4 className="m-0 font-bold text-white/95 text-base tracking-widest">{i18n("song/SongInteraction.Votes", '评价')}</h4>
        <VoteControl
          size="md"
          score={data.score}
          myVote={data.myVote}
          label={i18n("song/SongInteraction.VoteOnChart", '给谱面投票')}
          onVote={(value: Vote) => apiRequest<VoteResult>(endpoints.maichart.vote(songid), jsonRequest('PUT', { value }))}
          onResult={(result) => {
            void mutate(
              (current) =>
                current && {
                  ...current,
                  score: result.score,
                  upvotes: result.upvotes ?? current.upvotes,
                  downvotes: result.downvotes ?? current.downvotes,
                  myVote: result.myVote,
                },
              { revalidate: false },
            );
          }}
        />
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        <span className={stat} title={i18n("song/VoteControl.Upvote", '赞')}>
          <PiArrowFatUpBold className="w-3.5 h-3.5 text-orange-400" aria-hidden="true" />
          {compactNumber(data.upvotes, language)}
        </span>
        <span className={stat} title={i18n("song/VoteControl.Downvote", '踩')}>
          <PiArrowFatDownBold className="w-3.5 h-3.5 text-sky-400" aria-hidden="true" />
          {compactNumber(data.downvotes, language)}
        </span>
        <span className={stat} title={i18n("song/SongInteraction.Plays", '播放')}>
          <PiPlayBold className="w-3.5 h-3.5" aria-hidden="true" />
          {compactNumber(data.plays, language)}
        </span>
      </div>
    </div>
  );
}

/** 成绩卡片等紧凑场景下的投票控件：只有箭头和分数。 */
export function ChartVoteBadge({ songid }: { songid: string }) {
  const { i18n } = useI18n();
  const { data, mutate } = useSWR<ChartInteractSummary>(endpoints.maichart.interactsum(songid), apiFetcher, {
    revalidateOnFocus: false,
    shouldRetryOnError: false,
  });
  if (!data) return null;
  return (
    <VoteControl
      score={data.score}
      myVote={data.myVote}
      label={i18n("song/SongInteraction.VoteOnChart", '给谱面投票')}
      onVote={(value: Vote) => apiRequest<VoteResult>(endpoints.maichart.vote(songid), jsonRequest('PUT', { value }))}
      onResult={(result) => {
        void mutate(
          (current) =>
            current && {
              ...current,
              score: result.score,
              upvotes: result.upvotes ?? current.upvotes,
              downvotes: result.downvotes ?? current.downvotes,
              myVote: result.myVote,
            },
          { revalidate: false },
        );
      }}
    />
  );
}
