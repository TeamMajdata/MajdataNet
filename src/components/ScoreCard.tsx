/**
 * ScoreCard 组件
 * 展示单个成绩的卡片
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import useSWR from 'swr';
import { toast } from 'react-toastify';
import LoadingSpinner from '@/components/LoadingSpinner';
import { CoverPic, Level, LazyLoad } from '@/components';
import { endpoints } from '@/config/api';
import { getComboState } from '@/utils';
import { useLoc } from '@/hooks';
import type { Score } from '@/types';

const fetcher = async (...args: Parameters<typeof fetch>) =>
  await fetch(...args).then(async (res) => res.json());

/**
 * 简化的点赞按钮组件
 */
function SimpleLikeButton({ songid }: { songid: string }) {
  const loc = useLoc();
  const [isLoading, setIsLoading] = useState(false);
  const { data, error, isLoading: isFetching, mutate } = useSWR(
    endpoints.maichart.interact(songid),
    fetcher
  );

  if (error || isFetching) return null;
  if (!data || data.likes === undefined) return null;

  const likecount = data.likes.length;
  const isLiked = data.isLiked;

  const handleLike = async () => {
    if (isLoading) return;

    const formData = new FormData();
    formData.set('type', 'like');
    formData.set('content', 'like');
    setIsLoading(true);

    try {
      const response = await fetch(
        endpoints.maichart.interact(songid),
        {
          method: 'POST',
          body: formData,
          mode: 'cors',
          credentials: 'include',
        }
      );

      if (response.status === 200) {
        toast.success(isLiked ? loc('CancelSuccess') : loc('LikeAction') + loc('Success'));
        mutate();
      } else {
        toast.error(loc('LikeAction') + loc('FailedLoginPrompt'));
      }
    } catch {
      toast.error(loc('LikeAction') + loc('FailedLoginPrompt'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleLike}
      disabled={isLoading}
      className="flex items-center gap-1.5 bg-white/10 hover:bg-white/15 disabled:opacity-60 px-2 py-1 border border-white/20 rounded-md font-semibold text-xs transition-all duration-200 disabled:cursor-not-allowed"
      style={{
        background: isLiked
          ? 'linear-gradient(135deg, #10b981, #059669)'
          : '',
        borderColor: isLiked ? '#10b981' : '',
      }}
    >
      {isLoading ? (
        <LoadingSpinner className="w-3.5 h-3.5" />
      ) : (
        <svg
          className="w-3.5 h-3.5"
          xmlns="http://www.w3.org/2000/svg"
          height="14"
          viewBox="0 -960 960 960"
          width="14"
          fill="currentColor"
        >
          <path d="M720-120H280v-520l280-280 50 50q7 7 11.5 19t4.5 23v14l-44 174h258q32 0 56 24t24 56v80q0 7-2 15t-4 15L794-168q-9 20-30 34t-44 14Zm-360-80h360l120-280v-80H480l54-220-174 174v406Zm0-406v406-406Zm-80-34v80H160v360h120v80H80v-520h200Z" />
        </svg>
      )}
      <span className="text-xs">{likecount}</span>
    </button>
  );
}

export interface ScoreCardProps {
  score: Score;
  showLikeButton?: boolean;
}

/**
 * ScoreCard 组件
 */
export function ScoreCard({ score, showLikeButton = true }: ScoreCardProps) {
  return (
    <LazyLoad height={165} width={352} offset={300}>
      <div className="bg-[rgb(var(--background-start)/0.8)] shadow-[0_20px_60px_rgb(0_0_0/40%),0_8px_32px_rgb(0_0_0/20%),0_2px_0_rgb(255_255_255/8%)_inset] m-auto p-[0.8rem] rounded-[10px] w-[20rem] h-40 overflow-hidden transition-transform hover:-translate-y-1.25 duration-250 ease-in-out">
        <CoverPic id={score.chartInfo.id} />
        <div className="ml-[8.9rem]">
          <div className="mb-1.25 font-bold text-base truncate">
            <Link to={'/song?id=' + score.chartInfo.id}>
              {score.chartInfo.title}
            </Link>
          </div>

          <div className="mb-[0.3rem] text-[0.8rem] truncate italic">
            <Link to={'/song?id=' + score.chartInfo.id}>
              {score.chartInfo.artist === '' || score.chartInfo.artist == null
                ? '-'
                : score.chartInfo.artist}
            </Link>
          </div>

          <div className="mb-2 text-[0.8rem] truncate">
            <Link to={'/space?id=' + score.chartInfo.uploader}>
              <img
                className="inline-block mx-[0.1rem] rounded-[1.3rem] w-[1.3rem] h-[1.3rem] overflow-hidden cursor-pointer select-none"
                src={endpoints.account.icon(score.chartInfo.uploader)}
                alt={score.chartInfo.uploader}
              />
              {score.chartInfo.designer}
            </Link>
          </div>

          <Level
            level={score.chartLevel.toString()}
            difficulty={score.chartInfo.levels[score.chartLevel]}
            songid={score.chartInfo.id}
            isPlayer={false}
          />

          <div className="flex flex-wrap gap-1 mt-1">
            <div
              className="float-left m-[0.1rem] h-[1.3rem] overflow-hidden text-[0.8rem] text-center leading-[1.2rem] select-none"
              title={`DX: ${score.acc.dx.toFixed(4)}`}
            >
              {score.acc.dx.toFixed(4) + (score.comboState > 0 && typeof score.comboState === 'number' ? ` ${getComboState(score.comboState)}` : '')}
            </div>
          </div>

          {showLikeButton && (
            <div className="flex flex-wrap gap-1 mt-1">
              <SimpleLikeButton songid={score.chartInfo.id} />
            </div>
          )}
        </div>
      </div>
    </LazyLoad>
  );
}
