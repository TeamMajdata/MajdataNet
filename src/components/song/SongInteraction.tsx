/**
 * SongInteraction 组件 - 歌曲交互（点赞/踩）和成绩榜
 * 迁移自 legacy/src/app/song/page.jsx
 */

import React, { useState } from 'react';
import useSWR from 'swr';
import { endpoints } from '@/config/api';
import { toast } from 'react-toastify';
import { LoadingSpinner } from '@/components';
import { useLoc } from '@/hooks';
import { getComboState, getLevelName } from '@/utils';
import type { ChartScore, ScoreListProps, LikeSenderProps } from '@/types';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const fetcher = (url: string) =>
  fetch(url, { mode: 'cors', credentials: 'include' }).then((res) => res.json());

// ======================== Like Sender ========================
export function LikeSender({ songid }: LikeSenderProps) {
  const loc = useLoc();
  const [isLikeLoading, setIsLikeLoading] = useState(false);
  const [isDislikeLoading, setIsDislikeLoading] = useState(false);
  const { data, error, isLoading, mutate } = useSWR(
    endpoints.maichart.interact(songid),
    fetcher
  );

  if (error) {
    return <div>..?</div>;
  }
  if (isLoading) {
    return <div className="flex justify-center items-center py-8"><LoadingSpinner className="border-4 border-white/30 border-t-white rounded-full w-8 h-8" /></div>;
  }
  if (data === '' || data === undefined || data.likes === undefined || data.disLikeCount === undefined) {
    return <div>failed to load</div>;
  }

  const likecount = data.likes.length;
  const dislikecount = data.disLikeCount;
  let playcount = data.plays;
  if (playcount === undefined) {
    playcount = 0;
  }

  const onSubmit = async (type: string) => {
    if (type === 'like' && isLikeLoading) return;
    if (type === 'dislike' && isDislikeLoading) return;

    const formData = new FormData();
    formData.set('type', type);
    formData.set('content', type);
    let name = '';
    if (type === 'like') {
      name = loc('LikeAction');
      setIsLikeLoading(true);
    } else {
      name = loc('DislikeAction');
      setIsDislikeLoading(true);
    }

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
        if (type === 'like') {
          toast.success(
            data.isLiked ? loc('CancelSuccess') : name + loc('Success')
          );
        } else {
          toast.success(
            data.isDisLiked ? loc('CancelSuccess') : name + loc('Success')
          );
        }

        mutate();
      } else if (response.status === 400) {
        toast.error(name + loc('FailedLoginPrompt'));
      } else {
        toast.error(name + loc('FailedLoginPrompt'));
      }
    } catch {
      toast.error(name + loc('FailedLoginPrompt'));
    } finally {
      if (type === 'like') {
        setIsLikeLoading(false);
      } else {
        setIsDislikeLoading(false);
      }
    }
  };

  return (
    <div className="p-0">
      <div className="flex flex-col gap-2 p-0">
        <div className="flex justify-between items-center pt-3">
          <h4 className="font-bold text-white/95 text-base text-left tracking-widest">{loc('LikedBy')}</h4>
          <div className="flex items-center gap-1.5 mr-1.25 ml-1.25">
            <button
              className="flex items-center gap-1.5 bg-white/14 hover:bg-white/20 disabled:opacity-60 hover:shadow-[0_8px_25px_rgb(0,0,0,0.25),0_2px_8px_rgb(0,0,0,0.15)] backdrop-blur-md px-2.5 py-1.5 border border-white/22 hover:border-white/35 rounded-lg font-semibold text-xs transition-all hover:-translate-y-0.5 duration-300 ease-[cubic-bezier(0.25,0.46,0.45,0.94)] disabled:cursor-not-allowed"
              id="submitbuttonlike"
              type="button"
              onClick={() => onSubmit('like')}
              disabled={isLikeLoading || isDislikeLoading}
              style={{
                background: data.isLiked
                  ? 'linear-gradient(135deg, #10b981, #059669)'
                  : '',
              }}
            >
              {isLikeLoading ? (
                <LoadingSpinner className="w-4 h-4" />
              ) : (
                <svg
                  className="w-4 h-4"
                  xmlns="http://www.w3.org/2000/svg"
                  height="16"
                  viewBox="0 -960 960 960"
                  width="16"
                >
                  <path d="M720-120H280v-520l280-280 50 50q7 7 11.5 19t4.5 23v14l-44 174h258q32 0 56 24t24 56v80q0 7-2 15t-4 15L794-168q-9 20-30 34t-44 14Zm-360-80h360l120-280v-80H480l54-220-174 174v406Zm0-406v406-406Zm-80-34v80H160v360h120v80H80v-520h200Z" />
                </svg>
              )}
              <span className="font-semibold text-xs">{likecount}</span>
            </button>

            <button
              className="flex items-center gap-1.5 bg-white/14 hover:bg-white/20 disabled:opacity-60 hover:shadow-[0_8px_25px_rgb(0,0,0,0.25),0_2px_8px_rgb(0,0,0,0.15)] backdrop-blur-md px-2.5 py-1.5 border border-white/22 hover:border-white/35 rounded-lg font-semibold text-xs transition-all hover:-translate-y-0.5 duration-300 ease-[cubic-bezier(0.25,0.46,0.45,0.94)] disabled:cursor-not-allowed"
              id="submitbuttondislike"
              type="button"
              onClick={() => onSubmit('dislike')}
              disabled={isLikeLoading || isDislikeLoading}
              style={{
                background: data.isDisLiked
                  ? 'linear-gradient(135deg, #ef4444, #dc2626)'
                  : '',
              }}
            >
              {isDislikeLoading ? (
                <LoadingSpinner className="w-4 h-4" />
              ) : (
                <svg
                  className="w-4 h-4"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 -960 960 960"
                >
                  <path d="M240-840h440v520L400-40l-50-50q-7-7-11.5-19t-4.5-23v-14l44-174H120q-32 0-56-24t-24-56v-80q0-7 2-15t4-15l120-282q9-20 30-34t44-14Zm360 80H240L120-480v80h360l-54 220 174-174v-406Zm0 406v-406 406Zm80 34v-80h120v-360H680v-80h200v520H680Z" />
                </svg>
              )}
              <span className="font-semibold text-xs">{dislikecount}</span>
            </button>
          </div>
        </div>

        <div className="flex flex-col p-0">
          <motion.div
            className="flex flex-wrap gap-2"
            initial="hidden"
            animate="visible"
            variants={{
              visible: {
                transition: {
                  staggerChildren: 0.05
                }
              }
            }}
          >
            {data.likes && data.likes.length > 0 ? (
              <>
                {data.likes.slice(0, 40).map((username: string) => (
                  <motion.div
                    key={username}
                    variants={{
                      hidden: { opacity: 0, scale: 0.8 },
                      visible: { opacity: 1, scale: 1 }
                    }}
                  >
                    <Link
                      to={'/space?id=' + username}
                      className="inline-block relative hover:scale-110 transition-all hover:-translate-y-1"
                    >
                      <img
                        className="hover:shadow-[0_4px_15px_rgb(0,0,0,0.3)] border-2 border-white/20 hover:border-white/30 rounded-full w-8 min-w-8 h-8 min-h-8 transition-all"
                        src={endpoints.account.icon(username)}
                        alt={username}
                        title={username}
                      />
                    </Link>
                  </motion.div>
                ))}
                {data.likes.length > 40 && (
                  <motion.div
                    className="inline-block relative hover:scale-110 transition-all hover:-translate-y-1"
                    variants={{
                      hidden: { opacity: 0, scale: 0.8 },
                      visible: { opacity: 1, scale: 1 }
                    }}
                  >
                    <div
                      className="flex justify-center items-center hover:shadow-[0_4px_15px_rgb(0,0,0,0.3)] border-2 border-white/20 hover:border-white/30 rounded-full w-8 min-w-8 h-8 min-h-8 font-semibold text-xs transition-all"
                      title={`还有 ${data.likes.length - 40} 位用户点赞`}
                    >
                      +{data.likes.length - 40}
                    </div>
                  </motion.div>
                )}
              </>
            ) : (
              <div className="flex flex-col justify-center items-start opacity-60 p-4 text-left transition-all">
                <p className="m-0 text-gray-400 text-sm italic">{loc('BeFirstToLike')}</p>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}



export function ScoreList({ songid }: ScoreListProps) {
  const loc = useLoc();
  const { data, error, isLoading } = useSWR(
    endpoints.maichart.score(songid),
    fetcher,
    { refreshInterval: 30000 }
  );

  if (error) {
    return <div>failed to load</div>;
  }
  if (isLoading) {
    return <div className="flex justify-center items-center py-8"><LoadingSpinner className="border-4 border-white/30 border-t-white rounded-full w-8 h-8" /></div>;
  }
  if (data === '' || data === undefined || data.scores === undefined) {
    return <div>failed to load</div>;
  }

  const objlist = data.scores.map((p: ChartScore[], index: number) =>
    p.length !== 0 ? <ScoreListLevel key={index} scores={p} level={index} /> : <React.Fragment key={index}></React.Fragment>
  );

  return (
    <div className="w-full">
      <div>
        <h2 className="mb-6 font-bold text-white text-2xl">{loc('RankingList')}</h2>
      </div>
      <div>{objlist}</div>
    </div>
  );
}

function ScoreListLevel({ scores, level }: { scores: ChartScore[]; level: number }) {
  return (
    <div>
      <p>{getLevelName(level)}</p>
      {scores.map((o, index) => (
        <ScoreCard key={index} score={o} index={index} />
      ))}
    </div>
  );
}

function ScoreCard({ score, index }: { score: ChartScore; index: number }) {
  const comboState = getComboState(score.comboState);
  let cardClass = 'flex items-center gap-2 md:gap-4 p-2 md:p-4 rounded-xl bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/10 transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_25px_rgb(0,0,0,0.3),0_4px_12px_rgb(0,0,0,0.2)] hover:border-white/20 mb-2 md:mb-4';

  if (comboState === 'AP+' || comboState === 'AP') {
    cardClass += ' border-yellow-500/45 shadow-[0_2px_8px_rgb(0,0,0,0.12),0_0_10px_2px_rgb(251,191,36,0.32),0_0_6px_1px_rgb(251,191,36,0.22),inset_0_0_8px_1px_rgb(251,191,36,0.18)]';
  } else if (comboState === 'FC+' || comboState === 'FC') {
    cardClass += ' border-blue-400/45 shadow-[0_2px_8px_rgb(0,0,0,0.12),0_0_10px_2px_rgb(59,130,246,0.32),0_0_6px_1px_rgb(59,130,246,0.22),inset_0_0_8px_1px_rgb(59,130,246,0.18)]';
  }

  let displayText;
  if (score.acc < 80) {
    displayText = 'Failed';
  } else if (comboState && comboState !== '') {
    displayText = comboState;
  } else {
    displayText = 'Clear';
  }

  return (
    <div>
      <div className={cardClass}>
        <div className="flex justify-center items-center min-w-12 md:min-w-20 shrink-0">
          <span className={`text-base md:text-2xl font-bold text-white/80 ${index < 3 ? 'text-amber-400' : ''}`}>
            #{index + 1}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <Link
            to={'/space?id=' + score.player.username}
            className="flex items-center gap-2 md:gap-3 text-white no-underline transition-all hover:translate-x-1"
          >
            <img
              className="hover:shadow-[0_4px_15px_rgb(0,0,0,0.3)] border-2 border-white/20 hover:border-white/40 rounded-full w-9 md:w-12 min-w-9 md:min-w-12 h-9 md:h-12 min-h-9 md:min-h-12 object-cover transition-all"
              src={endpoints.account.icon(score.player.username)}
              alt={score.player.username}
            />
            <div className="flex flex-col flex-1 gap-0.5 md:gap-1 min-w-0">
              <span className="font-semibold text-white text-sm md:text-lg truncate">{score.player.username}</span>
            </div>
          </Link>
        </div>
        <div className="flex flex-col items-end gap-0.5 md:gap-1 shrink-0">
          <div
            className={`text-base md:text-2xl font-bold text-white ${comboState === 'AP+' || comboState === 'AP'
                ? 'score-accuracy-ap'
                : comboState === 'FC+' || comboState === 'FC'
                  ? 'score-accuracy-fc'
                  : ''
              }`}
          >
            {score.acc.toFixed(4)}%
          </div>
          <div className="font-medium text-white/70 text-xs md:text-sm">{displayText}</div>
        </div>
      </div>
    </div>
  );
}
