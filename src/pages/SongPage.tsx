import { useTranslation } from 'react-i18next';
import PageLoading from '@/components/ui/PageLoading';
import { Activity, Suspense, lazy, useCallback, useMemo, useState, useRef } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { endpoints } from '@/config/api';
import { toast } from 'react-toastify';
import {
  PageLayout,
  TagManageWidget,
  SongDifficultyLevels,
  CommentSection,
  CommentSortMenu,
  ChartVotePanel,
  ScoreRanking,
  CollectionModal,
} from '@/components';
import { downloadSong } from '@/utils/download';
import { stripTmpTags } from '@/utils';
import { parseTmpRichText } from '@/utils/richTextUtils';
import { getDefaultChartLevel, parseRequestedLevel } from '@/utils/radar';
import ChartRadar from '@/components/song/ChartRadar';
import { ChartMarkContext, type ChartMark, type ChartMarkTarget } from '@/components/song/chartMarks';
import UserAvatar from '@/components/user/UserAvatar';
import UnderlineTabs from '@/components/ui/UnderlineTabs';
import { LuMessageCircle, LuPlay, LuTrophy } from 'react-icons/lu';
import { PhotoProvider, PhotoView } from 'react-photo-view';
import { PiBookmarkSimple, PiCopySimple, PiDownloadSimple, PiLinkSimple, PiTagSimple } from 'react-icons/pi';
import { getLocale, useLanguage } from '@/i18n';
import '@/styles/components/song-detail.css';
import type { CommentSort, ChartInteractSummary, ChartLeaderboardResponse, SongSummary, TagManageWidgetRef } from '@/types';
import useSWR from 'swr';
import { apiFetcher } from '@/utils/apiClient';
import { compactNumber } from '@/utils/interaction';
import { formatDuration } from '@/utils/simai';
import { useChartMeta } from '@/hooks/useChartMeta';
import { useChartMediaUrl } from '@/hooks/useChartMediaUrl';

// 网页版谱面预览带着 PixiJS，只在点开预览时加载
const MajView = lazy(() => import('@/components/song/MajView'));

export default function SongPage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const param = searchParams.get('id');
  const focusedComment = searchParams.get('comment') ?? undefined;
  // 和标签编辑窗口用同一个 SWR 键：保存标签后窗口更新缓存，这里跟着刷新，不用重载页面
  const { data: songData, error, isLoading } = useSWR<SongSummary>(param ? endpoints.maichart.summary(param) : null, apiFetcher, {
    revalidateOnFocus: false,
    shouldRetryOnError: false,
  });

  if (!param || isLoading) {
    return (
      <PageLoading />
    );
  }

  if (error || !songData) {
    return (
      <PageLayout centered>
        <div className="mx-auto px-4 py-10 max-w-xl text-center">
          <h1 className="m-0 font-semibold text-white! text-xl! text-center!">{t("song/SongPage.SongNotFound")}</h1>
          <Link to="/" className="inline-flex items-center bg-blue-500 hover:bg-blue-400 mt-6 px-5 rounded-xl h-11 font-semibold text-white text-sm no-underline transition-colors">
            {t("song/SongPage.BackToHome")}
          </Link>
        </div>
      </PageLayout>
    );
  }

  const title = stripTmpTags(songData.title) || songData.id;
  const artist = songData.artist?.trim();
  const designer = songData.designer?.trim();

  const titleParts = [title, artist].filter(Boolean).join(' - ');
  const descParts = [
    artist ? `Artist: ${artist}` : '',
    designer ? `Chart by ${designer}` : '',
  ].filter(Boolean);
  descParts.push('Majdata.Net');

  const metaTitle = `${titleParts} | Majdata.Net`;
  const metaDescription = descParts.join(' · ');
  const metaImage = new URL(endpoints.maichart.image(param), window.location.origin).toString();

  return (
    <>
      <Helmet>
        <title>{metaTitle}</title>
        <meta name="description" content={metaDescription} />
        <meta property="og:title" content={metaTitle} />
        <meta property="og:description" content={metaDescription} />
        <meta property="og:image" content={metaImage} />
        <meta property="og:url" content={window.location.href} />
        <meta name="twitter:title" content={metaTitle} />
        <meta name="twitter:description" content={metaDescription} />
        <meta name="twitter:image" content={metaImage} />
      </Helmet>
      <PageLayout useAmbientBackground={false} className="song-detail">
        <SongInfo key={param} data={songData} focusId={focusedComment} />
      </PageLayout>
    </>
  );
}

const ACTION_BUTTON_CLASS = 'flex justify-center items-center gap-1.5 bg-white/[0.06] hover:bg-white/10 px-3.5 border border-white/10 hover:border-white/20 rounded-xl h-9 font-medium text-white/85 hover:text-white text-sm whitespace-nowrap transition-colors cursor-pointer';

const TAG_CLASS = 'inline-flex items-center bg-white/[0.06] hover:bg-white/10 px-2.5 border border-white/10 hover:border-white/20 rounded-full h-7 text-white/80 hover:text-white text-xs no-underline transition-colors';

const songTabs = [
  { id: 'preview', label: 'song/SongPage.Preview', icon: LuPlay },
  { id: 'scores', label: 'song/ScoreRanking.RankingList', icon: LuTrophy },
  { id: 'comments', label: 'song/SongComments.Comments', icon: LuMessageCircle },
] as const;
type SongTab = typeof songTabs[number]['id'];

// 打开页面就显示播放器（停在开头）；没有可预览的难度时只显示封面
type MarkRange = { length: number; maxCombo: number } | null;

function ChartPreview({ song, chartLevel, active, jump, onMarkRange }: {
  song: SongSummary;
  chartLevel?: number;
  active: boolean;
  jump: (ChartMark & { key: number }) | null;
  onMarkRange: (range: MarkRange) => void;
}) {
  const cover = useChartMediaUrl(endpoints.maichart.fullImage(song.id));
  const coverSrc = cover.src ?? endpoints.maichart.image(song.id);
  const coverImage = (
    <div className="song-preview">
      <img src={coverSrc} onError={cover.onError} alt="" crossOrigin={cover.src ? 'anonymous' : undefined} fetchPriority="high" />
    </div>
  );

  return (
    <div className="song-stage">
      {chartLevel === undefined || cover.recovering ? coverImage : (
        <Suspense fallback={coverImage}>
          <MajView songId={song.id} level={chartLevel} cover={coverSrc} onCoverError={cover.onError}
            active={active} jump={jump} onMarkRange={onMarkRange} />
        </Suspense>
      )}
    </div>
  );
}

function SongInfo({ data: song, focusId }: { data: SongSummary; focusId?: string }) {
  const { t } = useTranslation();
  const language = useLanguage();
  const [params, setParams] = useSearchParams();
  const chartLevel = parseRequestedLevel(params.get('level'), song.levels) ?? getDefaultChartLevel(song.levels);
  const tagWidget = useRef<TagManageWidgetRef>(null);
  const location = useLocation();
  const requestedTab = params.get('tab');
  const activeTab: SongTab = songTabs.find(tab => tab.id === requestedTab)?.id
    ?? (focusId || location.hash === '#comments' ? 'comments' : 'preview');
  const [collecting, setCollecting] = useState(false);
  // 评论排序：菜单放在页签栏右边，评论区按它加载
  const [commentSort, setCommentSort] = useState<CommentSort>('best');
  // 评论里的时间 / combo：播放器报告当前谱面的范围，点了切到预览页签并跳过去
  const [markRange, setMarkRange] = useState<MarkRange>(null);
  const [jump, setJump] = useState<(ChartMark & { key: number }) | null>(null);
  const previewRef = useRef<HTMLElement>(null);
  const searchLink = (text: string) => '/search?search=' + encodeURIComponent(text);
  const uploadTime = new Date(song.timestamp);
  const cover = endpoints.maichart.image(song.id);
  // 和侧栏投票面板同一个请求（SWR 会合并），这里只取播放次数
  const { bpm, duration } = useChartMeta(song.id, chartLevel);
  // 页签上的数字：当前难度的上榜人数、评论数（都和面板里的请求共用 SWR 缓存）
  const { data: leaderboard } = useSWR<ChartLeaderboardResponse>(endpoints.maiscore.chartLeaderboard(song.id), apiFetcher);
  const { data: interact } = useSWR<ChartInteractSummary>(endpoints.maichart.interactsum(song.id), apiFetcher, { revalidateOnFocus: false });
  const tabCounts: Partial<Record<SongTab, number>> = {
    scores: leaderboard && chartLevel !== undefined ? leaderboard.scores?.[chartLevel]?.length ?? 0 : undefined,
    comments: interact?.comments,
  };

  async function copy(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(t('song/SongPage.ClipboardSuccess'));
    } catch {
      toast.error(t('song/SongPage.CopyFailed'));
    }
  }

  function selectLevel(level: number) {
    const next = new URLSearchParams(params);
    next.set('level', String(level));
    if (location.hash === '#comments') next.set('tab', activeTab);
    setParams(next, { replace: true, preventScrollReset: true });
  }

  const jumpTo = useCallback((mark: ChartMark) => {
    setJump({ ...mark, key: Date.now() });
    const next = new URLSearchParams(params);
    next.set('tab', 'preview');
    setParams(next, { preventScrollReset: true });
    requestAnimationFrame(() => previewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
  }, [params, setParams]);
  const markTarget = useMemo<ChartMarkTarget | null>(
    () => markRange && { ...markRange, jump: jumpTo },
    [markRange, jumpTo],
  );

  function selectTab(tab: SongTab) {
    if (activeTab === tab) return;
    const next = new URLSearchParams(params);
    next.set('tab', tab);
    setParams(next, { preventScrollReset: true });
  }

  return (
    <>
      <div className="song-backdrop" aria-hidden="true" style={{ backgroundImage: 'url(' + cover + ')' }} />
      <div className="song-page mx-auto py-5 sm:py-8 w-full max-w-320 min-w-0">
        <header className="song-header" aria-labelledby="song-title">
          <PhotoProvider bannerVisible={false}>
            <PhotoView src={endpoints.maichart.fullImage(song.id)}>
              <button type="button" className="song-cover" title={t('song/SongPage.ViewCover')} aria-label={t('song/SongPage.ViewCover')}>
                <img src={cover} alt="" />
              </button>
            </PhotoView>
          </PhotoProvider>
          <div className="song-identity">
            <h1 id="song-title"><Link to={searchLink(song.title)} title={t('song/SongPage.SearchForTitle')}>{parseTmpRichText(song.title) || song.id}</Link></h1>
            {song.artist && <Link className="song-artist" to={searchLink(song.artist)} title={t('song/SongPage.SearchForArtist')}>{song.artist}</Link>}
          </div>
          {/* 和个人空间“编辑资料”一样的次要按钮，放在页头标题右边；窄屏时排到标题下面 */}
          <div className="song-header-actions">
            {([
              [PiDownloadSimple, t('song/SongPage.Download'), () => void downloadSong({ id: song.id, title: song.title, toast })],
              [PiBookmarkSimple, t('song/SongPage.Collection'), () => setCollecting(true)],
              [PiLinkSimple, t('song/SongPage.Share'), () => void copy(window.location.href)],
            ] as const).map(([Icon, label, onClick]) => (
              <button key={label} type="button" onClick={onClick} className={ACTION_BUTTON_CLASS}>
                <Icon aria-hidden="true" className="w-4 h-4 shrink-0" />{label}
              </button>
            ))}
          </div>
          <div className="song-levels" data-radar-level={chartLevel} role="group" aria-label={t('song/SongPage.Difficulty')}>
            <SongDifficultyLevels levels={song.levels} selected={chartLevel} onSelect={selectLevel} />
          </div>
        </header>

        <div className="song-workspace">
          <UnderlineTabs
            tabs={songTabs.map(({ id, label, icon }) => ({ key: id, label: t(label), icon, count: tabCounts[id] }))}
            active={activeTab}
            onSelect={selectTab}
            idPrefix="song"
            label={t('song/SongPage.ChartDetails')}
            trailing={activeTab === 'comments' && !focusId && <CommentSortMenu compact value={commentSort} onChange={setCommentSort} />}
          />
          {/* 播放器一直挂着：切到别的页签不用重新加载，评论里的时间 / combo 也要靠它判断范围 */}
          <section ref={previewRef} id="song-panel-preview" role="tabpanel" aria-labelledby="song-tab-preview" hidden={activeTab !== 'preview'}>
            <ChartPreview song={song} chartLevel={chartLevel} active={activeTab === 'preview'} jump={jump} onMarkRange={setMarkRange} />
          </section>
          <section id="song-panel-scores" role="tabpanel" aria-labelledby="song-tab-scores" hidden={activeTab !== 'scores'}>
            <Activity mode={activeTab === 'scores' ? 'visible' : 'hidden'}><ScoreRanking songid={song.id} chartLevel={chartLevel} /></Activity>
          </section>
          <section id="song-panel-comments" role="tabpanel" aria-labelledby="song-tab-comments" hidden={activeTab !== 'comments'}>
            <Activity mode={activeTab === 'comments' ? 'visible' : 'hidden'}><ChartMarkContext value={markTarget}><CommentSection chartId={song.id} uploader={song.uploader} focusId={focusId} sort={commentSort} /></ChartMarkContext></Activity>
          </section>
        </div>
        <aside className="song-sidebar" aria-label={t('song/SongPage.ChartDetails')}>
          <h2 className="song-label">{t('song/SongPage.ChartDetails')}</h2>
          <dl className="song-credits">
            {song.designer && <div><dt>{t('song/SongPage.Designer')}</dt><dd>{song.designer}</dd></div>}
            {song.uploader && <div><dt>{t('song/SongComments.Uploader')}</dt><dd>
              <Link to={'/space?id=' + encodeURIComponent(song.uploader)}>
                <UserAvatar username={song.uploader} alt="" className="size-5 shrink-0 rounded-full" />{song.uploader}
              </Link>
            </dd></div>}
            {Number.isFinite(uploadTime.getTime()) && <div><dt>{t('song/SongPage.UploadTime')}</dt><dd>
              <time dateTime={uploadTime.toISOString()} title={uploadTime.toLocaleString(getLocale(language))}>{uploadTime.toLocaleDateString(getLocale(language))}</time>
            </dd></div>}
            {bpm && <div><dt>BPM</dt><dd className="tabular-nums">{bpm.min === bpm.max ? bpm.min : `${bpm.min}–${bpm.max}`}</dd></div>}
            {duration !== undefined && <div><dt>{t('song/SongPage.Duration')}</dt><dd className="tabular-nums">{formatDuration(duration)}</dd></div>}
            {interact && <div><dt>{t('song/SongInteraction.Plays')}</dt><dd className="tabular-nums">{compactNumber(interact.plays, language)}</dd></div>}
          </dl>
          <ChartVotePanel songid={song.id} />
          {/* 标签：作者标签和玩家标签都是可点的小标签，右边“管理”打开编辑窗口 */}
          <section className="gap-2.5 grid song-side-section" aria-labelledby="song-tags-title">
            <div className="flex justify-between items-center gap-3">
              <h3 id="song-tags-title" className="song-label">{t('song/SongPage.Tags')}</h3>
              <button type="button" onClick={() => tagWidget.current?.openWindow()} className="inline-flex items-center gap-1 text-white/55 hover:text-white text-xs transition-colors cursor-pointer">
                <PiTagSimple aria-hidden="true" className="w-3.5 h-3.5" />{t('song/SongPage.ManageTags')}
              </button>
            </div>
            {song.tags?.length || song.publicTags?.length ? (
              <div className="flex flex-wrap gap-1.5">
                {song.tags?.map(tag => <Link key={tag} to={searchLink(tag)} title={t('song/SongPage.SearchForTag')} className={TAG_CLASS}>{tag}</Link>)}
                {song.publicTags?.map(tag => <Link key={tag} to={searchLink('tag:' + tag)} title={t('song/SongPage.SearchForTag')} className={`${TAG_CLASS} text-teal-200/90!`}>{tag}</Link>)}
              </div>
            ) : (
              <p className="m-0 text-white/40! text-xs">{t('song/SongPage.NoTags')}</p>
            )}
          </section>
          <ChartRadar id={song.id} hash={song.hash} chartLevel={chartLevel} />
          {/* ID / HASH：一行一个，值过长时省略，整行点击复制，复制图标对齐在右边 */}
          <dl className="gap-1 grid m-0 song-side-section">
            {([['ID', song.id], ['HASH', song.hash]] as const).map(([key, value]) => (
              <div key={key} className="min-w-0">
                <dt className="sr-only">{key}</dt>
                <dd className="m-0 min-w-0">
                  <button type="button" title={value} aria-label={t('song/SongPage.CopyValue', { field: key })} onClick={() => void copy(value)}
                    className="group flex items-center gap-3 hover:bg-white/[0.06] -mx-2 px-2 rounded-lg w-[calc(100%+1rem)] h-8 text-left cursor-copy">
                    <span aria-hidden="true" className="w-9 font-medium text-[0.7rem] text-white/45 shrink-0">{key}</span>
                    <code className="flex-1 min-w-0 font-mono text-white/75 group-hover:text-white text-xs truncate">{value}</code>
                    <PiCopySimple aria-hidden="true" className="w-3.5 h-3.5 text-white/40 group-hover:text-white shrink-0" />
                  </button>
                </dd>
              </div>
            ))}
          </dl>
        </aside>
      </div>
      <TagManageWidget ref={tagWidget} songid={song.id} />
      <CollectionModal isOpen={collecting} onClose={() => setCollecting(false)} chartId={song.id} songHash={song.hash} />
    </>
  );
}
