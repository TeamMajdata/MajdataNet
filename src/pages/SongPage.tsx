import { useEffect, useState, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { endpoints } from '@/config/api';
import { toast } from 'react-toastify';
import { setLanguage } from '@/utils/i18n';
import { useLoc } from '@/hooks';
import {
  PageLayout,
  Majdata,
  Tooltip,
  TagManageWidget,
  TagManageTagLauncher,
  SongDifficultyLevels,
  CommentSender,
  CommentList,
  LikeSender,
  ScoreRanking,
  CollectionModal,
  LoadingSpinner,
} from '@/components';
import { Download, Share, Bookmark, Play, ArrowLeft } from 'lucide-react';
import { downloadSong } from '@/utils/download';
import { parseTmpRichText } from '@/utils/richTextUtils';
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
          <div className="text-ink text-2xl">{loc('SongNotFound', '歌曲不存在')}</div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <SongDetailsContainer id={param} data={songData} />
      <div className="bg-line mt-10 h-px"></div>
      <ScoreRanking songid={param} />
      <div className="bg-line mt-10 h-px"></div>
      <CommentSender songid={param} />
      <CommentList songid={param} />
    </PageLayout>
  );
}

function SongDetailsContainer({ id, data }: SongDetailsContainerProps & { data: SongSummary }) {
  return (
    <div className="rounded-xl">
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
    <div className="p-6 md:p-10">
      {/* ===== Hero：大封面 + 超大标题 ===== */}
      <section className="gap-10 grid grid-cols-1 lg:grid-cols-[280px_1fr] items-start">
        <div className="justify-self-center lg:justify-self-start">
          {/* 返回上一页（对齐封面左上角） */}
          <button
            onClick={() => window.history.back()}
            className="flex items-center gap-2 mb-4 text-ink-2 hover:text-primary text-sm font-medium cursor-pointer bg-none border-none transition-colors duration-150"
            aria-label={loc('Back', '返回')}
          >
            <ArrowLeft size={18} />
            {loc('Back', '返回')}
          </button>
          <div className="relative overflow-hidden aspect-square w-56 md:w-72">
            <img
              className="absolute inset-0 w-full h-full object-cover"
              src={endpoints.maichart.image(o.id)}
              alt={o.title}
              loading="lazy"
              decoding="async"
            />
          </div>
        </div>

        <div className="flex flex-col gap-7">
          <div>
            <Tooltip content={loc('SearchForTitle') || '点击搜索该歌曲'}>
              <h1
                className="inline-block hover:text-primary font-black text-ink text-4xl md:text-6xl tracking-tight leading-none transition-colors duration-200 cursor-pointer"
                id={o.id}
                onClick={() => {
                  if (o.title && o.title !== '' && o.title !== null) {
                    localStorage.setItem('search', o.title);
                    window.location.href = '/';
                  }
                }}
              >
                {parseTmpRichText(o.title)}
              </h1>
            </Tooltip>
            <Tooltip content={loc('SearchForArtist') || '点击搜索该艺术家'}>
              <p className="mt-4 m-0 text-ink-2 text-xl md:text-2xl">
                <span
                  className="inline-block hover:text-primary hover:bg-primary-soft px-2 py-0.5 rounded-md transition-colors duration-200 cursor-pointer"
                  onClick={() => {
                    if (o.artist && o.artist !== '' && o.artist !== null) {
                      localStorage.setItem('search', o.artist);
                      window.location.href = '/';
                    }
                  }}
                >
                  {o.artist === '' || o.artist == null ? '-' : o.artist}
                </span>
              </p>
            </Tooltip>
            <p className="mt-2 m-0 text-sm text-ink-3">
              <Link to={'/space?id=' + o.uploader} className="text-primary hover:text-primary-hover no-underline transition-colors">
                {o.uploader}
              </Link>
              {o.designer ? ` · ${o.designer}` : ''}
            </p>
          </div>

          {/* 难度 */}
          <div>
            <h3 className="m-0 mb-3 font-bold text-ink text-sm uppercase tracking-[0.05em]">
              All Difficulties
            </h3>
            <SongDifficultyLevels levels={o.levels} songid={o.id} isPlayer={true} />
          </div>

          {/* 操作按钮：下载（主）/ 分享 / 收藏（次） */}
          <div className="flex flex-wrap gap-3">
            <button
              className="flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover rounded-lg h-12 px-6 font-semibold text-white transition-colors duration-200 cursor-pointer"
              onClick={OnDownloadClick({ id: o.id, title: o.title })}
              title={loc('Download')}
            >
              <Download size={20} />
              <span>{loc('Download') || '下载'}</span>
            </button>
            <button
              className="flex items-center justify-center gap-2 bg-surface border border-line hover:border-primary/40 hover:text-primary rounded-lg h-12 px-6 font-semibold text-ink-2 transition-colors duration-200 cursor-pointer"
              onClick={shareSong()}
              title={loc('Share')}
            >
              <Share size={20} />
              <span>{loc('Share') || '分享'}</span>
            </button>
            <button
              className="flex items-center justify-center gap-2 bg-surface border border-line hover:border-primary/40 hover:text-primary rounded-lg h-12 px-6 font-semibold text-ink-2 transition-colors duration-200 cursor-pointer"
              onClick={() => setIsCollectionModalOpen(true)}
              title={loc('Collection') || '收藏'}
            >
              <Bookmark size={20} />
              <span>{loc('Collection') || '收藏'}</span>
            </button>
          </div>
        </div>
      </section>

      {/* ===== 信息区：左栏（上传者 / 标签 / ID / 点赞）+ 播放器 ===== */}
      <div className="lg:items-start gap-10 grid grid-cols-1 lg:grid-cols-[280px_1fr] mt-16">
        <aside className="flex flex-col gap-8">
          {/* 上传者 */}
          <div>
            <h3 className="m-0 mb-3 font-bold text-ink text-sm uppercase tracking-wider">
              {loc('Uploader') || '上传者'}
            </h3>
            <Link to={'/space?id=' + o.uploader} className="group flex items-center gap-3.5 no-underline">
              <img
                className="border border-line rounded-full w-10 h-10 object-cover shrink-0"
                src={endpoints.account.icon(o.uploader)}
                alt={o.uploader}
              />
              <div className="flex flex-col">
                <span className="font-semibold text-ink group-hover:text-primary transition-colors">{o.uploader}</span>
                <span className="text-xs text-ink-3">{o.designer}</span>
              </div>
            </Link>
          </div>

          {/* 标签 */}
          <div>
            <h3 className="m-0 mb-3 font-bold text-ink text-sm uppercase tracking-wider">
              {loc('Tags') || '标签'}
            </h3>
            <div className="flex flex-wrap gap-2">
              {(o.tags || o.publicTags) &&
                (o.tags.length > 0 || o.publicTags.length > 0) ? (
                <>
                  {o.tags.map((tag, index) => (
                    <Tooltip content={loc('SearchForTag')} key={index}>
                      <span
                        className="inline-flex items-center bg-amber-50 hover:bg-amber-100 px-3 py-1 border border-amber-200 hover:border-amber-300 rounded-full font-medium text-amber-700 text-xs transition-colors hover:-translate-y-0.5 duration-300 cursor-pointer"
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
                        className="inline-flex items-center bg-green-50 hover:bg-green-100 px-3 py-1 border border-green-200 hover:border-green-300 rounded-full font-medium text-green-700 text-xs transition-colors hover:-translate-y-0.5 duration-300 cursor-pointer"
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
                <span className="text-ink-3 text-sm italic">
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

          {/* ID / HASH / 上传时间 */}
          <div>
            <div className="gap-y-3 grid grid-cols-[80px_1fr] text-sm">
              <span className="text-ink-3">ID</span>
              <code
                className="bg-surface-2 px-2 py-0.5 rounded w-fit font-mono text-ink-2 text-xs text-center break-all"
                style={{ cursor: 'pointer' }}
                title="点击复制"
                onClick={() => {
                  navigator.clipboard.writeText(o.id);
                  toast.success(loc('ClipboardSuccess'));
                }}
              >
                {o.id}
              </code>

              <span className="text-ink-3">HASH</span>
              <code
                className="bg-surface-2 px-2 py-0.5 rounded w-fit font-mono text-ink-2 text-xs text-center break-all"
                style={{ cursor: 'pointer' }}
                title="点击复制"
                onClick={() => {
                  navigator.clipboard.writeText(o.hash);
                  toast.success(loc('ClipboardSuccess'));
                }}
              >
                {o.hash}
              </code>

              <span className="text-ink-3 text-xs">
                {loc('UploadTime') || '上传时间'}
              </span>
              <span className="pl-1.75 w-fit text-ink-2 text-xs text-center">
                {new Date(o.timestamp).toLocaleString()}
              </span>
            </div>
          </div>

          {/* 点赞 */}
          <div>
            <LikeSender songid={o.id} />
          </div>
        </aside>

        <main className="flex flex-col">
          {isLoadMajdata ? (
            <MajdataView id={o.id} data={o} />
          ) : (
            <button
              className="flex items-center justify-center bg-surface border border-line hover:border-primary/40 rounded-lg w-full aspect-video transition-colors duration-200 cursor-pointer"
              onClick={() => setIsLoadMajdata(true)}
              title={loc('PlayPreview') || '预览'}
            >
              <span className="inline-flex flex-col items-center gap-3 text-ink-2">
                <Play size={40} />
                <span className="text-sm font-medium">{loc('PlayPreview', '预览')}</span>
              </span>
            </button>
          )}
        </main>
      </div>

      {/* 隐藏的标签管理 */}
      <div style={{ display: 'none' }}>
        <TagManageWidget ref={tagButtonRef} songid={o.id} />
      </div>

      <CollectionModal
        isOpen={isCollectionModalOpen}
        onClose={() => setIsCollectionModalOpen(false)}
        songHash={o.hash}
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
      <Majdata songid={o.id} chartRoot={endpoints.maichart.prefix('')} level={'lv' + firstNonEmptyIndex} />
    </div>
  );
}
