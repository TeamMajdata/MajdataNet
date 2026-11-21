import { useTranslation } from 'react-i18next';
import PageLoading from '@/components/ui/PageLoading';
import { Activity, useEffect, useState, useRef } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { endpoints } from '@/config/api';
import { toast } from 'react-toastify';
import {
  PageLayout,
  Majdata,
  TagManageWidget,
  SongDifficultyLevels,
  CommentSection,
  ChartVotePanel,
  ScoreRanking,
  CollectionModal,
} from '@/components';
import { downloadSong } from '@/utils/download';
import { stripTmpTags } from '@/utils';
import { parseTmpRichText } from '@/utils/richTextUtils';
import { getDefaultChartLevel, parseRequestedLevel } from '@/utils/radar';
import ChartRadar from '@/components/song/ChartRadar';
import UserAvatar from '@/components/user/UserAvatar';
import UnderlineTabs from '@/components/ui/UnderlineTabs';
import { PhotoProvider, PhotoView } from 'react-photo-view';
import { PiBookmarkSimple, PiCopySimple, PiDownloadSimple, PiLinkSimple, PiPlayFill, PiTagSimple } from 'react-icons/pi';
import { getLocale, useLanguage } from '@/i18n';
import '@/styles/components/song-detail.css';
import type { ChartInteractSummary, SongSummary, TagManageWidgetRef } from '@/types';
import useSWR from 'swr';
import { apiFetcher } from '@/utils/apiClient';
import { compactNumber } from '@/utils/interaction';
import { formatDuration } from '@/utils/simai';
import { useChartMeta } from '@/hooks/useChartMeta';

export default function SongPage() {
  const { t } = useTranslation();
  const [checkedParam, setCheckedParam] = useState<string | null>(null);
  const [songData, setSongData] = useState<SongSummary | null>(null);
  const [searchParams] = useSearchParams();
  const param = searchParams.get('id');
  const focusedComment = searchParams.get('comment') ?? undefined;

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

  if (!param || isChecking) {
    return (
      <PageLoading />
    );
  }

  if (!songData) {
    return (
      <PageLayout>
        <div className="flex justify-center items-center min-h-[60vh]">
          <div className="text-white text-2xl">{t("song/SongPage.SongNotFound")}</div>
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
  { id: 'preview', label: 'song/SongPage.Preview' },
  { id: 'scores', label: 'song/ScoreRanking.RankingList' },
  { id: 'comments', label: 'song/SongComments.Comments' },
] as const;
type SongTab = typeof songTabs[number]['id'];

function ChartPreview({ song, chartLevel }: { song: SongSummary; chartLevel?: number }) {
  const { t } = useTranslation();
  const [playing, setPlaying] = useState(false);

  return (
    <div className="song-stage">
      {playing ? (
        <Majdata songid={song.id} chartRoot={endpoints.maichart.prefix('')} level={'lv' + chartLevel} />
      ) : (
        <button type="button" className="song-preview" onClick={() => setPlaying(true)} disabled={chartLevel === undefined}>
          <img src={endpoints.maichart.fullImage(song.id)} alt="" fetchPriority="high" />
          <span className="song-play-action"><span><PiPlayFill /></span>{t('song/SongPage.PreviewChart')}</span>
        </button>
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
  const searchLink = (text: string) => '/?search=' + encodeURIComponent(text);
  const uploadTime = new Date(song.timestamp);
  const cover = endpoints.maichart.image(song.id);
  // 和侧栏投票面板同一个请求（SWR 会合并），这里只取播放次数
  const { bpm, duration } = useChartMeta(song.id, chartLevel);
  const { data: interact } = useSWR<ChartInteractSummary>(endpoints.maichart.interactsum(song.id), apiFetcher, { revalidateOnFocus: false });

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
          <div className="song-levels" data-radar-level={chartLevel}>
            <h2 className="song-label">{t('song/SongPage.Difficulty')}</h2>
            <SongDifficultyLevels levels={song.levels} songid={song.id} isPlayer={activeTab === 'preview'} selected={chartLevel} onSelect={selectLevel} />
          </div>
        </header>

        <div className="song-workspace">
          <UnderlineTabs
            tabs={songTabs.map(({ id, label }) => ({ key: id, label: t(label) }))}
            active={activeTab}
            onSelect={selectTab}
            idPrefix="song"
            label={t('song/SongPage.ChartDetails')}
          />
          <section id="song-panel-preview" role="tabpanel" aria-labelledby="song-tab-preview" hidden={activeTab !== 'preview'}>
            {activeTab === 'preview' && <ChartPreview song={song} chartLevel={chartLevel} />}
          </section>
          <section id="song-panel-scores" role="tabpanel" aria-labelledby="song-tab-scores" hidden={activeTab !== 'scores'}>
            <Activity mode={activeTab === 'scores' ? 'visible' : 'hidden'}><ScoreRanking songid={song.id} chartLevel={chartLevel} levels={song.levels} /></Activity>
          </section>
          <section id="song-panel-comments" role="tabpanel" aria-labelledby="song-tab-comments" hidden={activeTab !== 'comments'}>
            <Activity mode={activeTab === 'comments' ? 'visible' : 'hidden'}><CommentSection chartId={song.id} uploader={song.uploader} focusId={focusId} /></Activity>
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
          <dl className="song-file song-side-section">
            {([['ID', song.id], ['HASH', song.hash]] as const).map(([key, value]) => (
              <div key={key}><dt>{key}</dt><dd><button type="button" aria-label={t('song/SongPage.CopyValue', { field: key })} onClick={() => void copy(value)}><code>{value}</code><PiCopySimple /></button></dd></div>
            ))}
          </dl>
        </aside>
      </div>
      <div hidden><TagManageWidget ref={tagWidget} songid={song.id} /></div>
      <CollectionModal isOpen={collecting} onClose={() => setCollecting(false)} chartId={song.id} songHash={song.hash} />
    </>
  );
}
