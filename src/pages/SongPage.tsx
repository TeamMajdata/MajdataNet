/**
 * 歌曲详情页 - 完整迁移
 * 迁移自 legacy/src/app/song/page.jsx
 */

import { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import useSWR from 'swr';
import { apiroot3 } from '@/config/api';
import Tippy, { useSingleton } from '@tippyjs/react';
import 'tippy.js/dist/tippy.css';
import { toast } from 'react-toastify';
import { setLanguage } from '@/utils/i18n';
import { useLoc } from '@/hooks';
import {
  PageLayout,
  CoverPic,
  Majdata,
  TagManageWidget,
  TagManageTagLauncher,
  SongDifficultyLevels,
  CommentSender,
  CommentList,
  LikeSender,
  ScoreList,
} from '@/components';
import { downloadSong } from '@/utils/download';

const fetcher = (url: string) =>
  fetch(url, { mode: 'cors', credentials: 'include' }).then((res) => res.json());

export default function SongPage() {
  const [source, target] = useSingleton();
  const [ready, setReady] = useState(false);
  const [searchParams] = useSearchParams();
  const param = searchParams.get('id');

  useEffect(() => {
    setLanguage(localStorage.getItem('language') || navigator.language).then(() => {
      setReady(true);
    });
  }, []);

  if (!ready || !param) return <div className="loading"></div>;

  return (
    <PageLayout className="song-page">
      {/* 自定义背景 - 覆盖PageLayout的默认背景 */}
      <div
        className="bg song-bg"
        style={{ backgroundImage: `url(${apiroot3}/maichart/${param}/image)` }}
      ></div>

      <Tippy
        singleton={source}
        animation="fade"
        placement="top-start"
        interactive={true}
      />
      <SongDetailsContainer id={param} tippy={target} />
      <div className="hr-solid"></div>
      <ScoreList songid={param} />
      <div className="hr-solid"></div>
      <CommentSender songid={param} />
      <CommentList songid={param} />
    </PageLayout>
  );
}

// ======================== Song Details Container ========================
interface SongDetailsContainerProps {
  id: string;
  tippy: ReturnType<typeof useSingleton>[1];
}

function SongDetailsContainer({ id, tippy }: SongDetailsContainerProps) {
  return (
    <div className="song-details-main-container">
      <SongInfo id={id} tippy={tippy} />
    </div>
  );
}

// ======================== Song Info ========================
interface SongSummary {
  id: string;
  title: string;
  artist: string;
  uploader: string;
  designer: string;
  levels: (string | null)[];
  tags: string[];
  publicTags: string[];
  hash: string;
  timestamp: string;
}

function SongInfo({ id, tippy }: { id: string; tippy: ReturnType<typeof useSingleton>[1] }) {
  const loc = useLoc();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tagButtonRef = useRef<any>(null);
  const [isLoadMajdata, setIsLoadMajdata] = useState(false);
  const { data, error, isLoading } = useSWR<SongSummary>(
    apiroot3 + '/maichart/' + id + '/summary',
    fetcher
  );

  if (error) {
    return <div>failed to load</div>;
  }
  if (isLoading) {
    return <div className="loading"></div>;
  }
  if (data === undefined) {
    return <div>failed to load</div>;
  }

  const OnDownloadClick = (params: { id: string; title: string }) => async () => {
    await downloadSong({ id: params.id, title: params.title, toast: toast });
  };

  const shareSong = (props: { id: string }) => async () => {
    await navigator.clipboard.writeText('https://majdata.net/song?id=' + props.id);
    toast.success(loc('ClipboardSuccess'));
  };

  const o = data;

  return (
    <div className="song-info-section">
      <section className="gap-8 grid grid-cols-1 lg:grid-cols-[320px_1fr] mb-10 hero-section">
        <div className="flex justify-center items-start">
          <div className="w-48 md:w-64 h-48 md:h-64 hero-cover">
            <CoverPic id={o.id} />
          </div>
        </div>

        <div className="flex flex-col justify-between gap-3">
          <div
            style={{
              marginTop: '20px',
              lineHeight: '5.5',
              textAlign: 'center',
            }}
          >
            <Tippy
              content={loc('SearchForTitle') || '点击搜索该歌曲'}
              singleton={tippy}
            >
              <h1
                className="drop-shadow-md font-black text-4xl md:text-5xl text-center tracking-tight clickable-title"
                id={o.id}
                onClick={() => {
                  if (o.title && o.title !== '' && o.title !== null) {
                    localStorage.setItem('search', o.title);
                    window.location.href = '/';
                  }
                }}
              >
                {o.title}
              </h1>
            </Tippy>

            <Tippy
              content={loc('SearchForArtist') || '点击搜索该艺术家'}
              singleton={tippy}
            >
              <div className="font-medium text-white/80 text-xl md:text-2xl text-center">
                <span
                  className="song-artist-modern clickable-artist"
                  onClick={() => {
                    if (o.artist && o.artist !== '' && o.artist !== null) {
                      localStorage.setItem('search', o.artist);
                      window.location.href = '/';
                    }
                  }}
                >
                  Artist: {o.artist === '' || o.artist == null ? '-' : o.artist}
                </span>
              </div>
            </Tippy>
          </div>

          <div className="difficulty-display-container">
            <h3 className="difficulty-display-title">All Difficulties</h3>
            <SongDifficultyLevels
              levels={o.levels}
              songid={o.id}
              isPlayer={true}
            />
          </div>
        </div>
      </section>

      <div className="lg:items-start gap-8 grid grid-cols-1 lg:grid-cols-[320px_1fr] content-grid">
        <aside className="flex flex-col gap-4 song-info-sidebar">
          {/* 移动端：设计师和标签水平排列 */}
          <div className="sidebar-top-row">
            <Tippy content={o.uploader + '@' + o.designer} singleton={tippy}>
              <div className="p-5 rounded-2xl glass-panel sidebar-designer-panel">
                <a href={'/space?id=' + o.uploader} className="designer-link">
                  <img
                    className="designer-avatar"
                    src={apiroot3 + '/account/Icon?username=' + o.uploader}
                    alt={o.uploader}
                  />
                  <div className="designer-info">
                    <span className="designer-username">{o.uploader}</span>
                    <span className="designer-name">{o.designer}</span>
                  </div>
                </a>
              </div>
            </Tippy>

            <div className="p-5 rounded-2xl glass-panel sidebar-tags-panel">
              <h3 className="mb-3 font-bold text-white text-sm uppercase tracking-wider">
                {loc('Tags') || '标签'}
              </h3>
              <div className="meta-tags-container">
                {(o.tags || o.publicTags) &&
                (o.tags.length > 0 || o.publicTags.length > 0) ? (
                  <>
                    {o.tags.map((tag, index) => (
                      <Tippy content={loc('SearchForTag')} key={index}>
                        <span
                          className="tag-chip tag-private"
                          onClick={() => {
                            localStorage.setItem('search', tag);
                            window.location.href = '/';
                          }}
                        >
                          {tag}
                        </span>
                      </Tippy>
                    ))}
                    {o.publicTags?.map((tag, index) => (
                      <Tippy content={loc('SearchForTag')} key={index}>
                        <span
                          className="tag-chip tag-public"
                          onClick={() => {
                            localStorage.setItem('search', 'tag:' + tag);
                            window.location.href = '/';
                          }}
                        >
                          {tag}
                        </span>
                      </Tippy>
                    ))}
                  </>
                ) : (
                  <span className="no-tags-text">
                    {loc('NoTags') || '暂无标签'}
                  </span>
                )}
                <TagManageTagLauncher
                  onClick={() => {
                    tagButtonRef.current?.toggleWindow();
                  }}
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2 p-5 rounded-2xl glass-panel">
            <button
              className="shadow-lg border border-white/20 rounded-xl w-full h-11 font-bold text-base transition-all btn-glass"
              onClick={OnDownloadClick({ id: o.id, title: o.title })}
              title={loc('Download')}
            >
              <span className="inline-flex justify-center items-center gap-2 w-full">
                <svg
                  className="action-icon"
                  xmlns="http://www.w3.org/2000/svg"
                  height="20"
                  viewBox="0 -960 960 960"
                  width="20"
                >
                  <path d="M480-320 280-520l56-58 104 104v-326h80v326l104-104 56 58-200 200ZM240-160q-33 0-56.5-23.5T160-240v-120h80v120h480v-120h80v120q0 33-23.5 56.5T720-160H240Z" />
                </svg>
                <span>{loc('Download') || '下载'}</span>
              </span>
            </button>
            <button
              className="shadow-lg border border-white/20 rounded-xl w-full h-11 font-bold text-base transition-all btn-glass"
              onClick={shareSong({ id: o.id })}
              title={loc('Share')}
            >
              <span className="inline-flex justify-center items-center gap-2 w-full">
                <svg
                  className="action-icon"
                  xmlns="http://www.w3.org/2000/svg"
                  height="20"
                  viewBox="0 -960 960 960"
                  width="20"
                >
                  <path d="M720-80q-50 0-85-35t-35-85q0-7 1-14.5t3-13.5L322-392q-17 15-38 23.5t-44 8.5q-50 0-85-35t-35-85q0-50 35-85t85-35q23 0 44 8.5t38 23.5l282-164q-2-6-3-13.5t-1-14.5q0-50 35-85t85-35q50 0 85 35t35 85q0 50-35 85t-85 35q-23 0-44-8.5T638-672L356-508q2 6 3 13.5t1 14.5q0 7-1 14.5t-3 13.5l282 164q17-15 38-23.5t44-8.5q50 0 85 35t35 85q0 50-35 85t-85 35Zm0-640q17 0 28.5-11.5T760-760q0-17-11.5-28.5T720-800q-17 0-28.5 11.5T680-760q0 17 11.5 28.5T720-720ZM240-440q17 0 28.5-11.5T280-480q0-17-11.5-28.5T240-520q-17 0-28.5 11.5T200-480q0 17 11.5 28.5T240-440Zm480 280q17 0 28.5-11.5T760-200q0-17-11.5-28.5T720-240q-17 0-28.5 11.5T680-200q0 17 11.5 28.5T720-160Zm0-600ZM240-480Zm480 280Z" />
                </svg>
                <span>{loc('Share') || '分享'}</span>
              </span>
            </button>
            <div style={{ display: 'none' }}>
              <TagManageWidget ref={tagButtonRef} songid={o.id} />
            </div>
          </div>

          {/* ID/HASH/点赞面板 */}
          <div className="relative flex flex-col p-5 rounded-2xl overflow-hidden glass-panel sidebar-info-panel">
            <div className="gap-y-3 grid grid-cols-[80px_1fr] text-sm">
              <span className="text-white/40">ID</span>
              <code
                className="bg-black/20 px-2 py-0.5 rounded w-fit font-mono text-white/80 text-xs text-center break-all"
                style={{ cursor: 'pointer' }}
                title="点击复制"
                onClick={() => {
                  navigator.clipboard.writeText(o.id);
                  toast.success(loc('ClipboardSuccess'));
                }}
              >
                {o.id}
              </code>

              <span className="text-white/40">HASH</span>
              <code
                className="bg-black/20 px-2 py-0.5 rounded w-fit font-mono text-white/80 text-xs text-center break-all"
                style={{ cursor: 'pointer' }}
                title="点击复制"
                onClick={() => {
                  navigator.clipboard.writeText(o.hash);
                  toast.success(loc('ClipboardSuccess'));
                }}
              >
                {o.hash}
              </code>

              <span className="text-white/40 text-xs">
                {loc('UploadTime') || '上传时间'}
              </span>
              <span className="pl-1.75 w-fit text-white/80 text-xs text-center">
                {new Date(o.timestamp).toLocaleString()}
              </span>
            </div>

            <div className="my-3 border-white/10 border-t"></div>

            <LikeSender songid={o.id} />
          </div>
        </aside>

        <main className="flex flex-col gap-8">
          {isLoadMajdata ? (
            <MajdataView id={o.id} />
          ) : (
            <button
              className="shadow-lg border border-white/20 rounded-xl font-bold text-base transition-all btn-glass majViewPort"
              onClick={() => setIsLoadMajdata(true)}
            >
              <span className="inline-flex justify-center items-center gap-2 w-full">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  height="120px"
                  viewBox="0 -960 960 960"
                  width="120px"
                  fill="#e3e3e3"
                >
                  <path d="m380-300 280-180-280-180v360ZM480-80q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q134 0 227-93t93-227q0-134-93-227t-227-93q-134 0-227 93t-93 227q0 134 93 227t227 93Zm0-320Z" />
                </svg>
              </span>
            </button>
          )}
        </main>
      </div>
    </div>
  );
}

// ======================== Majdata View ========================
function MajdataView({ id }: { id: string }) {
  const { data, error, isLoading } = useSWR<SongSummary>(
    apiroot3 + '/maichart/' + id + '/summary',
    fetcher
  );

  if (error) {
    return <div>failed to load</div>;
  }
  if (isLoading) {
    return <div className="loading"></div>;
  }
  if (data === undefined) {
    return <div>failed to load</div>;
  }

  const o = data;
  // 找到最后一个非空的level，从后往前遍历
  let firstNonEmptyIndex = -1;
  for (let i = o.levels.length - 1; i >= 0; i--) {
    if (o.levels[i] !== '' && o.levels[i] !== null) {
      firstNonEmptyIndex = i;
      break;
    }
  }

  return (
    <div className="majdata-container">
      <Majdata songid={o.id} apiroot={apiroot3} level={firstNonEmptyIndex} />
    </div>
  );
}
