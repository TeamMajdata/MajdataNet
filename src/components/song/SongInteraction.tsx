import { useState } from 'react';
import useSWR from 'swr';
import { endpoints } from '@/config/api';
import { toast } from 'react-toastify';
import { LoadingSpinner } from '@/components';
import { useLoc } from '@/hooks';
import type { LikeSenderProps } from '@/types';
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
    return <div className="flex justify-center items-center py-8"><LoadingSpinner className="border-4 border-line border-t-primary rounded-full w-8 h-8" /></div>;
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
          <h4 className="font-bold text-ink text-base text-left tracking-widest">{loc('LikedBy')}</h4>
          <div className="flex items-center gap-1.5 mr-1.25 ml-1.25">
            <button
              className="flex items-center gap-1.5 bg-surface border border-line hover:border-primary disabled:opacity-60 px-2.5 py-1.5 rounded-md font-semibold text-ink-2 text-xs transition-colors disabled:cursor-not-allowed"
              id="submitbuttonlike"
              type="button"
              onClick={() => onSubmit('like')}
              disabled={isLikeLoading || isDislikeLoading}
              style={{
                background: data.isLiked
                  ? 'var(--ok)'
                  : '',
                color: data.isLiked
                  ? 'var(--surface)'
                  : undefined,
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
              className="flex items-center gap-1.5 bg-surface border border-line hover:border-danger disabled:opacity-60 px-2.5 py-1.5 rounded-md font-semibold text-ink-2 text-xs transition-colors disabled:cursor-not-allowed"
              id="submitbuttondislike"
              type="button"
              onClick={() => onSubmit('dislike')}
              disabled={isLikeLoading || isDislikeLoading}
              style={{
                background: data.isDisLiked
                  ? 'var(--danger)'
                  : '',
                color: data.isDisLiked
                  ? 'var(--surface)'
                  : undefined,
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
                        className="border border-line hover:border-primary rounded-full w-8 min-w-8 h-8 min-h-8 transition-all"
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
                      className="flex justify-center items-center border border-line rounded-full w-8 min-w-8 h-8 min-h-8 font-semibold text-ink-2 text-xs transition-all"
                      title={`还有 ${data.likes.length - 40} 位用户点赞`}
                    >
                      +{data.likes.length - 40}
                    </div>
                  </motion.div>
                )}
              </>
            ) : (
              <div className="flex flex-col justify-center items-start opacity-60 p-4 text-left transition-all">
                <p className="m-0 text-ink-3 text-sm italic">{loc('BeFirstToLike')}</p>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
