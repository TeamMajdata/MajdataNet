/**
 * ChartVotePanel - 歌曲页侧栏的投票面板：标题、上下箭头和分数。
 */

import { useTranslation } from 'react-i18next';
import useSWR from 'swr';
import { endpoints } from '@/config/api';
import SectionLoading from '@/components/ui/SectionLoading';
import { apiFetcher, apiRequest, jsonRequest } from '@/utils/apiClient';
import { VoteControl } from './VoteControl';
import type { ChartInteractSummary, Vote, VoteResult } from '@/types';

export function ChartVotePanel({ songid }: { songid: string }) {
  const { t } = useTranslation();
  const { data, error, isLoading, mutate } = useSWR<ChartInteractSummary>(endpoints.maichart.interactsum(songid), apiFetcher, {
    revalidateOnFocus: false,
  });

  if (error) {
    return <div className="py-3 text-white/50 text-sm">{t("song/SongInteraction.FailedToLoad")}</div>;
  }
  if (isLoading || !data) {
    return <SectionLoading className="py-4" />;
  }

  // 赞、踩的明细不再单独列出：箭头中间的分数已经说明了；播放次数放在谱面资料里
  return (
    <div className="flex flex-wrap justify-between items-center gap-3">
      <h3 className="song-label">{t("song/SongInteraction.Votes")}</h3>
      <VoteControl
        size="md"
        score={data.score}
        myVote={data.myVote}
        label={t("song/SongInteraction.VoteOnChart")}
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
  );
}

/** 成绩卡片等紧凑场景下的投票控件：只有箭头和分数。 */
export function ChartVoteBadge({ songid }: { songid: string }) {
  const { t } = useTranslation();
  const { data, mutate } = useSWR<ChartInteractSummary>(endpoints.maichart.interactsum(songid), apiFetcher, {
    revalidateOnFocus: false,
    shouldRetryOnError: false,
  });
  if (!data) return null;
  return (
    <VoteControl
      score={data.score}
      myVote={data.myVote}
      label={t("song/SongInteraction.VoteOnChart")}
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
