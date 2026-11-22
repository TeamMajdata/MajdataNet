import { useTranslation } from 'react-i18next';
import PageLoading from '@/components/ui/PageLoading';
import { Activity, Suspense, lazy, useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
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
  ChartVoteBadge,
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
import SectionLoading from '@/components/ui/SectionLoading';
import { LuFileCode, LuInfo, LuMessageSquare, LuPlay, LuTrophy } from 'react-icons/lu';
import { PhotoProvider, PhotoView } from 'react-photo-view';
import 'react-photo-view/dist/react-photo-view.css';
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
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { preloadMajView } from '@/majview/preload';

// 网页版谱面预览带着 PixiJS，只在点开预览时加载
const MajView = lazy(() => import('@/components/song/MajView'));
// 谱面文件页签带着 Monaco（约 700 KB gzip），同样只在打开页签时加载
const ChartFile = lazy(() => import('@/components/song/ChartFile'));

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

  // 谱面预览的代码块、谱面文本和皮肤：拿到 id 就开始取，和 summary 并行，不等页面渲染完
  useEffect(() => {
    if (param) preloadMajView(param);
  }, [param]);

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

/** 和 song-detail.css 里手机布局的断点一致 */
const MOBILE_QUERY = '(max-width: 48rem)';

const PREVIEW_TAB = { id: 'preview', label: 'song/SongPage.Preview', icon: LuPlay } as const;
const OVERVIEW_TAB = { id: 'overview', label: 'song/SongPage.Overview', icon: LuInfo } as const;
const COMMENTS_TAB = { id: 'comments', label: 'song/SongComments.Comments', icon: LuMessageSquare } as const;
const CHART_TAB = { id: 'chart', label: 'song/ChartFile.Title', icon: LuFileCode } as const;
const SCORES_TAB = { id: 'scores', label: 'song/ScoreRanking.RankingList', icon: LuTrophy } as const;
const desktopTabs = [PREVIEW_TAB, SCORES_TAB, CHART_TAB];
const mobileTabs = [OVERVIEW_TAB, COMMENTS_TAB, SCORES_TAB, CHART_TAB];
type SongTab = typeof PREVIEW_TAB['id'] | typeof OVERVIEW_TAB['id'] | typeof COMMENTS_TAB['id'] | typeof CHART_TAB['id'] | typeof SCORES_TAB['id'];

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
  const requestedTab = params.get('tab');
  // 手机上（和视频网站一样）播放器一直在最上面，不是页签；侧栏的谱面资料变成“概览”页签（默认），评论也是页签。
  // 电脑上评论一直在播放器下面、资料在侧栏；手机专用的页签在电脑上落到预览，?tab=preview 在手机上落到概览
  const isMobile = useMediaQuery(MOBILE_QUERY);
  const tabs = isMobile ? mobileTabs : desktopTabs;
  const activeTab: SongTab = tabs.find(tab => tab.id === requestedTab)?.id ?? tabs[0].id;
  const [collecting, setCollecting] = useState(false);
  // 评论排序：菜单放在评论区标题右边，评论区按它加载
  const [commentSort, setCommentSort] = useState<CommentSort>('best');
  // 评论里的时间 / combo：播放器报告当前谱面的范围，点了切到预览页签、把播放器滚到眼前并跳过去
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
    setParams(next, { replace: true, preventScrollReset: true });
  }

  const jumpTo = useCallback((mark: ChartMark) => {
    setJump({ ...mark, key: Date.now() });
    // 手机上播放器不在页签里，留在评论页签就行
    if (!isMobile) {
      const next = new URLSearchParams(params);
      next.set('tab', 'preview');
      setParams(next, { preventScrollReset: true });
    }
    requestAnimationFrame(() => previewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
  }, [params, setParams, isMobile]);
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
            {/* 手机上点赞点踩放在下载左边（电脑上在侧栏），和旁边的按钮一样高、一样的边框 */}
            {isMobile && <ChartVoteBadge songid={song.id} size="md" />}
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
            tabs={tabs.map(({ id, label, icon }) => ({ key: id, label: t(label), icon, count: tabCounts[id] }))}
            active={activeTab}
            onSelect={selectTab}
            idPrefix="song"
            label={t('song/SongPage.ChartDetails')}
          />
          {/* 播放器一直挂着：切到别的页签不用重新加载，评论里的时间 / combo 也要靠它判断范围 */}
          {/* 手机上（song-detail.css）这一块不受页签控制，一直显示在页面最上面 */}
          <section ref={previewRef} id="song-panel-preview" className="song-preview-panel"
            role={isMobile ? undefined : 'tabpanel'} aria-labelledby={isMobile ? undefined : 'song-tab-preview'} hidden={!isMobile && activeTab !== 'preview'}>
            <ChartPreview song={song} chartLevel={chartLevel} active={isMobile || activeTab === 'preview'} jump={jump} onMarkRange={setMarkRange} />
          </section>
          <section id="song-panel-chart" role="tabpanel" aria-labelledby="song-tab-chart" hidden={activeTab !== 'chart'}>
            {/* 只读查看器不需要后台保活：切走就卸载，回来时从缓存的谱面文本重建 */}
            {activeTab === 'chart' && (
              <Suspense fallback={<SectionLoading />}>
                <ChartFile songId={song.id} level={chartLevel} />
              </Suspense>
            )}
          </section>
          <section id="song-panel-scores" role="tabpanel" aria-labelledby="song-tab-scores" hidden={activeTab !== 'scores'}>
            <Activity mode={activeTab === 'scores' ? 'visible' : 'hidden'}><ScoreRanking songid={song.id} chartLevel={chartLevel} /></Activity>
          </section>
          {/* 电脑上评论一直放在播放器下面：点评论里的时间戳跳到谱面那一刻时，播放器和评论能同时看到。
              手机上是一个页签（播放器钉在上面，同样能同时看到） */}
          <div className="song-comments" {...(isMobile ? { id: 'song-panel-comments', role: 'tabpanel', 'aria-labelledby': 'song-tab-comments', hidden: activeTab !== 'comments' } : {})}>
            {/* 读屏器用评论区里自带的标题，这里的文字只给眼睛看 */}
            <div className="flex justify-between items-center gap-3 mb-3">
              <p className="song-label" aria-hidden="true">
                {t('song/SongComments.Comments')}
                {interact?.comments !== undefined && <span className="ml-1.5 font-normal text-white/45 tabular-nums">{interact.comments}</span>}
              </p>
              {!focusId && <CommentSortMenu compact value={commentSort} onChange={setCommentSort} />}
            </div>
            <ChartMarkContext value={markTarget}><CommentSection chartId={song.id} uploader={song.uploader} focusId={focusId} sort={commentSort} /></ChartMarkContext>
          </div>
        </div>
        <aside className="song-sidebar" aria-label={t('song/SongPage.ChartDetails')}
          {...(isMobile ? { id: 'song-panel-overview', role: 'tabpanel', 'aria-labelledby': 'song-tab-overview', hidden: activeTab !== 'overview' } : {})}>
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
          {/* ID / HASH：紧接在谱面资料（播放次数）下面，一行一个，值过长时省略，整行点击复制，复制图标对齐在右边 */}
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
          {!isMobile && <ChartVotePanel songid={song.id} />}
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
        </aside>
      </div>
      <TagManageWidget ref={tagWidget} songid={song.id} />
      <CollectionModal isOpen={collecting} onClose={() => setCollecting(false)} chartId={song.id} songHash={song.hash} />
    </>
  );
}
