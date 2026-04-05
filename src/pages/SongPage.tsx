/**
 * 歌曲详情页 - 完整迁移
 * 迁移自 legacy/src/app/song/page.jsx
 */

import { useEffect, useState, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { endpoints } from '@/config/api';
import { toast } from 'react-toastify';
import { setLanguage } from '@/utils/i18n';
import { useLoc } from '@/hooks';
import {
  PageLayout,
  CoverPic,
  Majdata,
  Tooltip,
  TagManageWidget,
  TagManageTagLauncher,
  SongDifficultyLevels,
  CommentSender,
  CommentList,
  LikeSender,
  ScoreList,
  CollectionModal,
  LoadingSpinner,
} from '@/components';
import { downloadSong } from '@/utils/download';
import type { SongDetailsContainerProps, SongSummary } from '@/types';

export default function SongPage() {
  const loc = useLoc();
  const [ready, setReady] = useState(false);
  const [checkedParam, setCheckedParam] = useState<string | null>(null);
  const [songData, setSongData] = useState<SongSummary | null>(null);
  const [searchParams] = useSearchParams();
  const param = searchParams.get('id');

  useEffect(() => {
    setLanguage(localStorage.getItem('language') || navigator.language).then(() => {
      setReady(true);
    });
  }, []);

  useEffect(() => {
    if (!param) return;

    fetch(endpoints.maichart.summary(param!), {
      mode: 'cors',
      credentials: 'include'
    })
      .then(async (res) => {
        setCheckedParam(param);
        if (res.ok) {
          const data = await res.json();
          setSongData(data);
        } else {
          setSongData(null);
        }
      })
      .catch(() => {
        setCheckedParam(param);
        setSongData(null);
      });
  }, [param]);

  const isChecking = param !== checkedParam;

  if (!ready || !param || isChecking) {
    return (
      <div className="flex justify-center items-center h-screen">
        <LoadingSpinner size={50} />
      </div>
    );
  }

  if (!songData) {
    return (
      <PageLayout>
        <div className="flex justify-center items-center min-h-[60vh]">
          <div className="text-white text-2xl">{loc('SongNotFound', '歌曲不存在')}</div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div
        className="-z-10 fixed inset-0 bg-cover bg-top-left blur-[20px] brightness-30"
        style={{ backgroundImage: `url(${endpoints.maichart.image(param!)})` }}
      />

      <SongDetailsContainer id={param} data={songData} />
      <div className="bg-linear-to-r from-transparent via-white/20 to-transparent mt-10 h-px"></div>
      <ScoreList songid={param} />
      <div className="bg-linear-to-r from-transparent via-white/20 to-transparent mt-10 h-px"></div>
      <CommentSender songid={param} />
      <CommentList songid={param} />
    </PageLayout>
  );
}

function SongDetailsContainer({ id, data }: SongDetailsContainerProps & { data: SongSummary }) {
  return (
    <div className="bg-white/12 shadow-[0_20px_50px_rgb(0_0_0/0.35),inset_0_1px_0_rgb(255_255_255/0.25)] hover:shadow-[0_22px_60px_rgb(0_0_0/0.35),inset_0_1px_0_rgb(255_255_255/0.28)] backdrop-blur-xl backdrop-saturate-160 rounded-xl transition-all">
      <SongInfo id={id} data={data} />
    </div>
  );
}


function SongInfo({ data }: { id: string; data: SongSummary }) {
  const loc = useLoc();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tagButtonRef = useRef<any>(null);
  const [isLoadMajdata, setIsLoadMajdata] = useState(false);
  const [isCollectionModalOpen, setIsCollectionModalOpen] = useState(false);

  const o = data;

  const OnDownloadClick = (params: { id: string; title: string }) => async () => {
    await downloadSong({ id: params.id, title: params.title, toast: toast });
  };

  const shareSong = () => async () => {
    await navigator.clipboard.writeText(window.location.href);
    toast.success(loc('ClipboardSuccess'));
  };

  return (
    <div className="bg-transparent p-6">
      <section className="gap-8 grid grid-cols-1 lg:grid-cols-[320px_1fr] mb-10">
        <div className="flex justify-center items-start">
          <div className="shadow-[0_25px_50px_rgb(0_0_0/0.45)] w-48 md:w-64 h-48 md:h-64 hover:scale-105 transition-transform duration-300">
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
            <Tooltip content={loc('SearchForTitle') || '点击搜索该歌曲'}>
              <h1
                className="inline-block hover:shadow-lg hover:text-shadow drop-shadow-md px-5 py-2.5 rounded-lg font-black hover:text-white text-4xl md:text-5xl text-center tracking-tight transition-all hover:-translate-y-0.5 duration-300 cursor-pointer hover:transform"
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
            </Tooltip>

            <Tooltip content={loc('SearchForArtist') || '点击搜索该艺术家'}>
              <div className="font-medium text-white/80 text-xl md:text-2xl text-center">
                <span
                  className="inline-block hover:bg-white/10 hover:shadow-md px-3 py-1 rounded-md hover:text-white transition-all hover:-translate-y-0.5 duration-300 cursor-pointer"
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
            </Tooltip>
          </div>

          <div className="flex flex-col items-start gap-3">
            <h3 className="m-0 font-bold text-white text-sm uppercase tracking-[0.05em]">All Difficulties</h3>
            <SongDifficultyLevels
              levels={o.levels}
              songid={o.id}
              isPlayer={true}
            />
          </div>
        </div>
      </section>

      <div className="lg:items-start gap-8 grid grid-cols-1 lg:grid-cols-[320px_1fr]">
        <aside className="flex flex-col gap-4">
          {/* 移动端：设计师和标签水平排列 */}
          <div className="flex md:flex-row flex-col lg:flex-col gap-4 md:gap-4 lg:gap-4">
            <Tooltip content={o.uploader + '@' + o.designer}>
              <Link to={'/space?id=' + o.uploader} className="inline-flex flex-1 items-center gap-3.5 bg-white/10 hover:bg-white/15 shadow-[0_4px_12px_rgb(0_0_0/0.2),inset_0_1px_0_rgb(255_255_255/0.1)] hover:shadow-[0_6px_16px_rgb(0_0_0/0.3),inset_0_1px_0_rgb(255_255_255/0.15)] backdrop-blur-lg px-3 py-1.5 border border-white/20 hover:border-white/30 rounded-xl text-white/85 hover:text-white no-underline transition-all hover:-translate-y-0.5 duration-300">
                <img
                  className="shadow-sm border-2 border-white/25 rounded-full w-9 min-w-9 h-9 min-h-9 aspect-square transition-all duration-300 shrink-0"
                  src={endpoints.account.icon(o.uploader)}
                  alt={o.uploader}
                />
                <div className="flex flex-col items-start gap-1">
                  <span className="font-semibold text-white/95 text-base leading-[1.3]">{o.uploader}</span>
                  <span className="font-normal text-white/65 text-sm leading-[1.3]">{o.designer}</span>
                </div>
              </Link>
            </Tooltip>

            <div className="flex-1 bg-white/8 shadow-[0_4px_15px_rgb(0_0_0/0.2),0_2px_8px_rgb(0_0_0/0.1)] backdrop-blur-[10px] p-5 border border-white/10 rounded-2xl transition-all duration-300">
              <h3 className="mb-3 font-bold text-white text-sm uppercase tracking-wider">
                {loc('Tags') || '标签'}
              </h3>
              <div className="flex flex-wrap flex-1 gap-2">
                {(o.tags || o.publicTags) &&
                  (o.tags.length > 0 || o.publicTags.length > 0) ? (
                  <>
                    {o.tags.map((tag, index) => (
                      <Tooltip content={loc('SearchForTag')} key={index}>
                        <span
                          className="inline-flex items-center bg-[linear-gradient(135deg,rgb(139_69_19/0.3),rgb(101_67_33/0.2))] hover:bg-[linear-gradient(135deg,rgb(139_69_19/0.5),rgb(101_67_33/0.4))] hover:shadow-[0_4px_12px_rgb(139_69_19/0.3)] px-3 py-1 border border-[rgb(139_69_19/0.4)] hover:border-[rgb(139_69_19/0.7)] rounded-full font-medium text-[rgb(255_215_0/0.9)] hover:text-[#ffd700] text-xs transition-all hover:-translate-y-0.5 duration-300 cursor-pointer"
                          onClick={() => {
                            localStorage.setItem('search', tag);
                            window.location.href = '/';
                          }}
                        >
                          {tag}
                        </span>
                      </Tooltip>
                    ))}
                    {o.publicTags?.map((tag, index) => (
                      <Tooltip content={loc('SearchForTag')} key={index}>
                        <span
                          className="inline-flex items-center bg-[linear-gradient(135deg,rgb(34_197_94/0.3),rgb(22_163_74/0.2))] hover:bg-[linear-gradient(135deg,rgb(34_197_94/0.5),rgb(22_163_74/0.4))] hover:shadow-[0_4px_12px_rgb(34_197_94/0.3)] px-3 py-1 border border-[rgb(34_197_94/0.4)] hover:border-[rgb(34_197_94/0.7)] rounded-full font-medium text-[rgb(74_222_128/0.9)] hover:text-[#4ade80] text-xs transition-all hover:-translate-y-0.5 duration-300 cursor-pointer"
                          onClick={() => {
                            localStorage.setItem('search', 'tag:' + tag);
                            window.location.href = '/';
                          }}
                        >
                          {tag}
                        </span>
                      </Tooltip>
                    ))}
                  </>
                ) : (
                  <span className="text-white/40 text-sm italic">
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

          <div className="flex flex-col gap-2 bg-white/8 shadow-[0_4px_15px_rgb(0_0_0/0.2),0_2px_8px_rgb(0_0_0/0.1)] backdrop-blur-[10px] p-5 border border-white/10 rounded-2xl transition-all duration-300">
            <button
              className="bg-white/10 hover:bg-white/20 shadow-lg backdrop-blur-md border border-white/20 rounded-xl w-full h-11 font-bold text-white text-base transition-all"
              onClick={OnDownloadClick({ id: o.id, title: o.title })}
              title={loc('Download')}
            >
              <span className="inline-flex justify-center items-center gap-2 w-full">
                <svg
                  className="fill-current transition-transform duration-300 ease-in-out"
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
              className="bg-white/10 hover:bg-white/20 shadow-lg backdrop-blur-md border border-white/20 rounded-xl w-full h-11 font-bold text-white text-base transition-all"
              onClick={shareSong()}
              title={loc('Share')}
            >
              <span className="inline-flex justify-center items-center gap-2 w-full">
                <svg
                  className="fill-current transition-transform duration-300 ease-in-out"
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
            <button
              className="bg-white/10 hover:bg-white/20 shadow-lg backdrop-blur-md border border-white/20 rounded-xl w-full h-11 font-bold text-white text-base transition-all"
              onClick={() => setIsCollectionModalOpen(true)}
              title={loc('Collection') || '收藏'}
            >
              <span className="inline-flex justify-center items-center gap-2 w-full">
                <svg
                  className="fill-current transition-transform duration-300 ease-in-out"
                  xmlns="http://www.w3.org/2000/svg"
                  height="20"
                  viewBox="0 -960 960 960"
                  width="20"
                >
                  <path d="M200-120v-640q0-33 23.5-56.5T280-840h400q33 0 56.5 23.5T760-760v640L480-240 200-120Zm80-122 200-86 200 86v-518H280v518Zm0-518h400-400Z" />
                </svg>
                <span>{loc('Collection') || '收藏'}</span>
              </span>
            </button>
            <div style={{ display: 'none' }}>
              <TagManageWidget ref={tagButtonRef} songid={o.id} />
            </div>
          </div>

          {/* ID/HASH/点赞面板 */}
          <div className="relative flex flex-col bg-white/8 shadow-[0_4px_15px_rgb(0_0_0/0.2),0_2px_8px_rgb(0_0_0/0.1)] backdrop-blur-[10px] p-5 border border-white/10 rounded-2xl overflow-hidden transition-all duration-300">
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
            <MajdataView id={o.id} data={o} />
          ) : (
            <button
              className="bg-white/10 hover:bg-white/20 shadow-lg backdrop-blur-md p-2.5 border border-white/20 rounded-xl w-full aspect-square font-bold text-base transition-all"
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
      <CollectionModal
        isOpen={isCollectionModalOpen}
        onClose={() => setIsCollectionModalOpen(false)}
        songId={o.id}
      />
    </div>
  );
}

// ======================== Majdata View ========================
function MajdataView({ data }: { id: string; data: SongSummary }) {
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
    <div className="w-full">
      <Majdata songid={o.id} apiroot={endpoints.maichart.prefix('')} level={'lv' + firstNonEmptyIndex} />
    </div>
  );
}
