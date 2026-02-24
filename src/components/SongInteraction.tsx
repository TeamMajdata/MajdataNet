/**
 * SongInteraction 组件 - 歌曲交互（点赞/踩）和成绩榜
 * 迁移自 legacy/src/app/song/page.jsx
 */

import React, { useState } from 'react';
import useSWR from 'swr';
import { apiroot3 } from '@/config/api';
import { toast } from 'react-toastify';
import { AiOutlineLoading3Quarters } from 'react-icons/ai';
import { useLoc } from '@/hooks';
import { getComboState, getLevelName } from '@/utils';
import type { Score, ScoreListProps, LikeSenderProps } from '@/types';

const fetcher = (url: string) =>
  fetch(url, { mode: 'cors', credentials: 'include' }).then((res) => res.json());

// ======================== Like Sender ========================
export function LikeSender({ songid }: LikeSenderProps) {
  const loc = useLoc();
  const [isLikeLoading, setIsLikeLoading] = useState(false);
  const [isDislikeLoading, setIsDislikeLoading] = useState(false);
  const { data, error, isLoading, mutate } = useSWR(
    apiroot3 + '/maichart/' + songid + '/interact',
    fetcher
  );

  if (error) {
    return <div>..?</div>;
  }
  if (isLoading) {
    return <div className="loading"></div>;
  }
  if (data === '' || data === undefined) {
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
        apiroot3 + '/maichart/' + songid + '/interact',
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
    <div className="song-interaction-section">
      <div className="interaction-layout-new">
        <div className="liked-users-header">
          <h4 className="liked-users-title">{loc('LikedBy')}</h4>
          <div className="interaction-buttons-inline">
            <button
              className="linkContentWithBorder modern-interaction-btn compact-interaction-btn"
              id="submitbuttonlike"
              type="button"
              onClick={() => onSubmit('like')}
              disabled={isLikeLoading || isDislikeLoading}
              style={{
                background: data.isLiked
                  ? 'linear-gradient(135deg, #10b981, #059669)'
                  : '',
                opacity: isLikeLoading || isDislikeLoading ? 0.6 : 1,
                cursor:
                  isLikeLoading || isDislikeLoading ? 'not-allowed' : 'pointer',
              }}
            >
              {isLikeLoading ? (
                <AiOutlineLoading3Quarters
                  className="loading-icon-spin"
                  style={{ width: '16px', height: '16px' }}
                />
              ) : (
                <svg
                  className="commentIco"
                  xmlns="http://www.w3.org/2000/svg"
                  height="16"
                  viewBox="0 -960 960 960"
                  width="16"
                  style={{ width: '16px', height: '16px' }}
                >
                  <path d="M720-120H280v-520l280-280 50 50q7 7 11.5 19t4.5 23v14l-44 174h258q32 0 56 24t24 56v80q0 7-2 15t-4 15L794-168q-9 20-30 34t-44 14Zm-360-80h360l120-280v-80H480l54-220-174 174v406Zm0-406v406-406Zm-80-34v80H160v360h120v80H80v-520h200Z" />
                </svg>
              )}
              <span className="btn-count">{likecount}</span>
            </button>

            <button
              className="linkContentWithBorder modern-interaction-btn compact-interaction-btn"
              id="submitbuttondislike"
              type="button"
              onClick={() => onSubmit('dislike')}
              disabled={isLikeLoading || isDislikeLoading}
              style={{
                background: data.isDisLiked
                  ? 'linear-gradient(135deg, #ef4444, #dc2626)'
                  : '',
                opacity: isLikeLoading || isDislikeLoading ? 0.6 : 1,
                cursor:
                  isLikeLoading || isDislikeLoading ? 'not-allowed' : 'pointer',
              }}
            >
              {isDislikeLoading ? (
                <AiOutlineLoading3Quarters
                  className="loading-icon-spin"
                  style={{ width: '16px', height: '16px' }}
                />
              ) : (
                <svg
                  className="commentIco"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 -960 960 960"
                  style={{ width: '16px', height: '16px' }}
                >
                  <path d="M240-840h440v520L400-40l-50-50q-7-7-11.5-19t-4.5-23v-14l44-174H120q-32 0-56-24t-24-56v-80q0-7 2-15t4-15l120-282q9-20 30-34t44-14Zm360 80H240L120-480v80h360l-54 220 174-174v-406Zm0 406v-406 406Zm80 34v-80h120v-360H680v-80h200v520H680Z" />
                </svg>
              )}
              <span className="btn-count">{dislikecount}</span>
            </button>
          </div>
        </div>

        <div className="liked-users-section-new">
          <div className="liked-users-grid">
            {data.likes && data.likes.length > 0 ? (
              <>
                {data.likes.slice(0, 40).map((username: string, index: number) => (
                  <a
                    key={username}
                    href={'/space?id=' + username}
                    className="liked-user-avatar"
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <img
                      className="user-avatar-img"
                      src={apiroot3 + '/account/Icon?username=' + username}
                      alt={username}
                      title={username}
                    />
                  </a>
                ))}
                {data.likes.length > 40 && (
                  <div
                    className="liked-user-avatar"
                    style={{ animationDelay: `${40 * 0.1}s` }}
                  >
                    <div
                      className="more-likes"
                      title={`还有 ${data.likes.length - 40} 位用户点赞`}
                    >
                      +{data.likes.length - 40}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="no-likes-placeholder">
                <p className="placeholder-text">{loc('BeFirstToLike')}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}



export function ScoreList({ songid }: ScoreListProps) {
  const loc = useLoc();
  const { data, error, isLoading } = useSWR(
    apiroot3 + '/maichart/' + songid + '/score',
    fetcher,
    { refreshInterval: 30000 }
  );

  if (error) {
    return <div>failed to load</div>;
  }
  if (isLoading) {
    return <div className="loading"></div>;
  }
  if (data === '' || data === undefined) {
    return <div>failed to load</div>;
  }

  const scoreList = data.scores;
  const objlist = scoreList.map((p: Score[], index: number) =>
    p.length !== 0 ? <ScoreListLevel key={index} scores={p} level={index} /> : <React.Fragment key={index}></React.Fragment>
  );

  return (
    <div className="song-score-list">
      <div className="theList">
        <h2 className="ranking-main-title">{loc('RankingList')}</h2>
      </div>
      <div className="theList">{objlist}</div>
    </div>
  );
}

function ScoreListLevel({ scores, level }: { scores: Score[]; level: number }) {
  return (
    <div>
      <p>{getLevelName(level)}</p>
      {scores.map((o, index) => (
        <ScoreCard key={index} score={o} index={index} />
      ))}
    </div>
  );
}

function ScoreCard({ score, index }: { score: Score; index: number }) {
  const comboState = getComboState(score.comboState);
  let cardClass = 'score-card modern-score-card';

  if (comboState === 'AP+' || comboState === 'AP') {
    cardClass += ' score-card-ap';
  } else if (comboState === 'FC+' || comboState === 'FC') {
    cardClass += ' score-card-fc';
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
        <div className="score-rank-display">
          <span className={`rank-number ${index < 3 ? 'top-three' : ''}`}>
            #{index + 1}
          </span>
        </div>
        <div className="score-player-info">
          <a
            href={'/space?id=' + score.player.username}
            className="player-link"
          >
            <img
              className="player-avatar"
              src={apiroot3 + '/account/Icon?username=' + score.player.username}
              alt={score.player.username}
            />
            <div className="player-details">
              <span className="player-username">{score.player.username}</span>
            </div>
          </a>
        </div>
        <div className="score-results">
          <div
            className={`score-accuracy ${
              comboState === 'AP+' || comboState === 'AP'
                ? 'score-accuracy-ap'
                : comboState === 'FC+' || comboState === 'FC'
                  ? 'score-accuracy-fc'
                  : ''
            }`}
          >
            {score.acc.toFixed(4)}%
          </div>
          <div className="score-combo">{displayText}</div>
        </div>
      </div>
    </div>
  );
}
