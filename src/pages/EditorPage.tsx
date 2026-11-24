/**
 * 谱面编辑器。
 *
 * 左侧是 MajView 预览（直接吃内存里的谱面文本，边改边看），右侧是难度页签 + 谱面元信息 + Monaco。
 * 谱面文本只有一个真源 `maidata`：编辑器改的是当前难度的 `&inote_N`，保存时整份写回。
 *
 * 设计依据见 docs/analysis/editor-interaction-spec.md。
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  LuFilePlus, LuFlipHorizontal, LuFlipVertical, LuFolderOpen, LuInfo, LuPause, LuPlay,
  LuRefreshCw, LuRotateCcw, LuRotateCw, LuSave, LuSearch, LuSquare,
} from 'react-icons/lu';
import type { IconType } from 'react-icons';
import MajView from '@/components/song/MajView';
import DifficultyTabs from '@/components/editor/DifficultyTabs';
import SimaiCodeEditor from '@/components/editor/SimaiCodeEditor';
import BpmTapWindow from '@/components/editor/BpmTapWindow';
import ChartInfoWindow from '@/components/editor/ChartInfoWindow';
import EditorWindow from '@/components/editor/EditorWindow';
import { useChartFolder } from '@/hooks/useChartFolder';
import type { SimaiEditor } from '@/components/song/monacoSimai';
import { clearDraft, readDraft, shouldOfferRestore, writeDraft } from '@/utils/autosave';
import { buildTimeline, lineAt, timeAtLine } from '@/utils/simaiTimeline';
import { transformFumen, type MirrorKind } from '@/utils/simaiMirror';
import {
  filledDifficulties,
  getDesigner,
  getDifficultyText,
  getField,
  getFirst,
  getLevel,
  setDesigner,
  setDifficultyText,
  setFirst,
  setLevel,
} from '@/utils/maidataEdit';
import '@/styles/components/editor.css';

/** 没在播放 / 没有 bg 时用 MajdataView 的默认底图 */
const DEFAULT_COVER = '/majview/skin/Default_Background.png';

const LEVEL_COUNT = 7;

/** 编辑菜单里的变换；顺序和快捷键沿用 MajdataEdit-Neo。labelKey 保持字面量类型，t() 才认。 */
const TRANSFORMS = [
  { kind: 'lr', labelKey: 'editor/EditorPage.MirrorHorizontal', Icon: LuFlipHorizontal },
  { kind: 'ud', labelKey: 'editor/EditorPage.MirrorVertical', Icon: LuFlipVertical },
  { kind: '180', labelKey: 'editor/EditorPage.Mirror180', Icon: LuRefreshCw },
  { kind: 'cw45', labelKey: 'editor/EditorPage.RotateCw', Icon: LuRotateCw },
  { kind: 'ccw45', labelKey: 'editor/EditorPage.RotateCcw', Icon: LuRotateCcw },
] as const satisfies readonly { kind: MirrorKind; labelKey: string; Icon: IconType }[];

type MenuId = 'file' | 'edit' | null;

function formatClock(seconds: number) {
  const total = Math.max(0, Math.floor(seconds));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

export default function EditorPage() {
  const { t } = useTranslation();
  const { folder, setFolder, error, busy, open, download } = useChartFolder();
  const [maidata, setMaidata] = useState('');
  const [origin, setOrigin] = useState('');
  const [active, setActive] = useState(4);
  const [openMenu, setOpenMenu] = useState<MenuId>(null);
  const [bpmOpen, setBpmOpen] = useState(false);
  const [time, setTime] = useState(0);
  const [saving, setSaving] = useState(false);
  const [hasSelection, setHasSelection] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [chartInfoOpen, setChartInfoOpen] = useState(false);
  const [followCursor, setFollowCursor] = useState(false);
  const [settingsHost, setSettingsHost] = useState<HTMLDivElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [command, setCommand] = useState<{ type: 'playPause' | 'stop'; key: number } | null>(null);
  const latestRef = useRef({ maidata: '', active: 4 });
  const lastSecondRef = useRef(-1);
  const editorRef = useRef<SimaiEditor | null>(null);

  // 打开文件夹：整份文本作为新的真源，并跳到第一个有内容的难度
  useEffect(() => {
    if (!folder) return;
    setMaidata(folder.maidata);
    setOrigin(folder.maidata);
    const filled = filledDifficulties(folder.maidata);
    const first = filled.findIndex(Boolean);
    setActive(first === -1 ? 4 : first);
    lastSecondRef.current = -1;
    setTime(0);
  }, [folder]);

  // 编辑器只在挂载时取一次初值，之后自己持有每个难度的 model
  const initialTexts = useMemo(
    () => Array.from({ length: LEVEL_COUNT }, (_, level) => getDifficultyText(folder?.maidata ?? '', level)),
    [folder],
  );

  /** 打开文件夹后：如果本地草稿比文件新，问一下要不要恢复 */
  useEffect(() => {
    if (!folder) return;
    let cancelled = false;
    void readDraft(folder.name).then((draft) => {
      if (cancelled || !shouldOfferRestore(draft, folder)) return;
      if (window.confirm(t('editor/EditorPage.RestoreDraft'))) {
        setMaidata(draft!.maidata);
        setActive(draft!.active);
      }
    });
    return () => { cancelled = true; };
  }, [folder, t]);

  // 自动保存：停止编辑 5s 后落一次，另外每 30s 兜底；都不改变「已保存/未保存」
  useEffect(() => { latestRef.current = { maidata, active }; }, [maidata, active]);
  useEffect(() => {
    if (!folder) return;
    const debounce = setTimeout(() => { void writeDraft(folder.name, maidata, active); }, 5000);
    return () => clearTimeout(debounce);
  }, [folder, maidata, active]);
  useEffect(() => {
    if (!folder) return;
    const timer = setInterval(() => {
      void writeDraft(folder.name, latestRef.current.maidata, latestRef.current.active);
    }, 30000);
    return () => clearInterval(timer);
  }, [folder]);

  const dirty = useMemo(() => {
    const perLevel = Array.from({ length: LEVEL_COUNT }, (_, level) =>
      getDifficultyText(maidata, level) !== getDifficultyText(origin, level)
      || getLevel(maidata, level) !== getLevel(origin, level)
      || getDesigner(maidata, level) !== getDesigner(origin, level));
    const globalChanged = ['title', 'artist', 'first']
      .some((key) => getField(maidata, key) !== getField(origin, key));
    return { perLevel, global: globalChanged };
  }, [maidata, origin]);
  const anyDirty = dirty.perLevel.some(Boolean) || dirty.global;

  const handleEditorChange = useCallback((level: number, text: string) => {
    setMaidata((prev) => setDifficultyText(prev, level, text));
  }, []);

  const handleTime = useCallback((value: number) => {
    const second = Math.floor(value);
    if (second === lastSecondRef.current) return;
    lastSecondRef.current = second;
    setTime(value);
  }, []);

  /** 播放时间 → 文本行；谱面一改就得重算 */
  const timeline = useMemo(
    () => buildTimeline(getDifficultyText(maidata, active), getFirst(maidata)),
    [maidata, active],
  );

  // 文本跟随：播放时把编辑器滚到当前格子的那一行
  useEffect(() => {
    if (!followCursor) return;
    const editor = editorRef.current;
    if (!editor) return;
    const line = lineAt(timeline, time);
    if (line === null) return;
    editor.revealLineInCenterIfOutsideViewport(line);
  }, [time, followCursor, timeline]);

  const [seekTo, setSeekTo] = useState<{ seconds: number; key: number } | null>(null);

  /** 反向：光标换行时让播放器跳到那一刻（和上游一样，只在开文本跟随时生效） */
  const handleCursorLine = useCallback((line: number) => {
    if (!followCursor) return;
    const seconds = timeAtLine(timeline, line);
    if (seconds === null) return;
    setSeekTo({ seconds, key: Date.now() });
  }, [followCursor, timeline]);

  /** 变换只作用于选区；没有选区就什么都不做（决策 1） */
  const applyTransform = useCallback((kind: MirrorKind) => {
    const editor = editorRef.current;
    const selection = editor?.getSelection();
    if (!editor || !selection || selection.isEmpty()) return;
    const model = editor.getModel();
    if (!model) return;
    const source = model.getValueInRange(selection);
    editor.executeEdits('simai-transform', [{
      range: selection,
      text: transformFumen(source, kind),
      forceMoveMarkers: true,
    }]);
    editor.focus();
  }, []);

  const save = useCallback(async () => {
    if (!folder) return;
    setSaving(true);
    try {
      if (folder.save) await folder.save(maidata);
      else download(maidata);
      setOrigin(maidata);
      // 已经落到文件了，草稿没有存在意义
      void clearDraft(folder.name);
    } finally {
      setSaving(false);
    }
  }, [folder, maidata, download]);

  // 点菜单外面收起
  useEffect(() => {
    if (!openMenu) return;
    const close = () => setOpenMenu(null);
    window.addEventListener('pointerdown', close);
    return () => window.removeEventListener('pointerdown', close);
  }, [openMenu]);

  /**
   * Ctrl/Cmd+S 保存、Ctrl/Cmd+O 打开文件夹。
   * 不绑在 Monaco 上是因为这两个是页面级动作，而且要拦掉浏览器的「保存网页」。
   */
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
      const key = event.key.toLowerCase();
      if (key === 's') {
        event.preventDefault();
        void save();
      } else if (key === 'o') {
        event.preventDefault();
        void open();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [save, open]);

  /** 新建：先有未保存改动就问一下；新建的谱面没有落地文件，保存会退化成下载 */
  const createNew = useCallback(() => {
    if (anyDirty && !window.confirm(t('editor/EditorPage.DiscardChanges'))) return;
    const blank = [
      '&title=',
      '&artist=',
      '&first=0',
      ...Array.from({ length: LEVEL_COUNT }, (_, level) => `&inote_${level + 1}=`),
      '',
    ].join('\n');
    setFolder({
      name: t('editor/EditorPage.Untitled'),
      maidata: blank,
      modifiedAt: Date.now(),
      save: null,
    });
  }, [anyDirty, setFolder, t]);

  const openFindReplace = useCallback(() => {
    editorRef.current?.getAction('actions.find')?.run();
    editorRef.current?.focus();
  }, []);

  /** 编辑器只有两个播放控制键，命令通过 command 发给播放器 */
  const sendCommand = useCallback((type: 'playPause' | 'stop') => {
    setCommand({ type, key: Date.now() });
  }, []);

  const title = getField(maidata, 'title') ?? folder?.name ?? '';
  const artist = getField(maidata, 'artist') ?? '';
  const cover = folder?.coverUrl ?? DEFAULT_COVER;
  /** 当前难度还没有谱面：按规格显示默认底图，不当成错误 */
  const hasChart = getDifficultyText(maidata, active).trim().length > 0;

  const toggleMenu = (menu: Exclude<MenuId, null>) => (event: React.MouseEvent) => {
    event.stopPropagation();
    setOpenMenu((current) => (current === menu ? null : menu));
  };

  return (
    <>
      <Helmet>
        <title>{folder ? `${title} · ${t('editor/EditorPage.Title')} | Majdata.Net` : `${t('editor/EditorPage.Title')} | Majdata.Net`}</title>
      </Helmet>

      <div className="editor-app">
        <header className="editor-menubar">
          <Link to="/" className="editor-brand">Majdata.Net</Link>

          <div className="editor-menu-wrap">
            <button type="button" className={`editor-top-item${openMenu === 'file' ? ' is-open' : ''}`} onClick={toggleMenu('file')}>
              {t('editor/EditorPage.MenuFile')}
            </button>
            {openMenu === 'file' && (
              <div className="editor-menu" onPointerDown={(event) => event.stopPropagation()}>
                <button type="button" onClick={() => { setOpenMenu(null); createNew(); }} disabled={busy}>
                  <LuFilePlus aria-hidden="true" />{t('editor/EditorPage.New')}
                </button>
                <button type="button" onClick={() => { setOpenMenu(null); void open(); }} disabled={busy}>
                  <LuFolderOpen aria-hidden="true" />{t('editor/EditorPage.OpenFolder')}
                </button>
                <button type="button" onClick={() => { setOpenMenu(null); void save(); }} disabled={!folder || saving}>
                  <LuSave aria-hidden="true" />{t('editor/EditorPage.Save')}
                </button>
              </div>
            )}
          </div>

          <div className="editor-menu-wrap">
            <button type="button" className={`editor-top-item${openMenu === 'edit' ? ' is-open' : ''}`} onClick={toggleMenu('edit')}>
              {t('editor/EditorPage.MenuEdit')}
            </button>
            {openMenu === 'edit' && (
              <div className="editor-menu" onPointerDown={(event) => event.stopPropagation()}>
                {TRANSFORMS.map(({ kind, labelKey, Icon }) => (
                  <button
                    key={kind}
                    type="button"
                    disabled={!hasSelection}
                    title={hasSelection ? t(labelKey) : t('editor/EditorPage.SelectRangeFirst')}
                    onClick={() => { setOpenMenu(null); applyTransform(kind); }}
                  >
                    <Icon aria-hidden="true" />{t(labelKey)}
                  </button>
                ))}
                <div className="editor-menu-sep" />
                <button
                  type="button"
                  disabled={!folder}
                  onClick={() => { setOpenMenu(null); setChartInfoOpen(true); }}
                >
                  <LuInfo aria-hidden="true" />{t('editor/EditorPage.ChartInfo')}
                </button>
                <div className="editor-menu-sep" />
                <button
                  type="button"
                  disabled={!folder}
                  onClick={() => { setOpenMenu(null); openFindReplace(); }}
                >
                  <LuSearch aria-hidden="true" />{t('editor/EditorPage.FindReplace')}
                </button>
              </div>
            )}
          </div>

          <button type="button" className="editor-top-item" onClick={() => setSettingsOpen(true)}>{t('editor/EditorPage.MenuSettings')}</button>
          <button type="button" className="editor-top-item" onClick={() => setBpmOpen(true)}>{t('editor/EditorPage.MenuBpmTap')}</button>

          <span className="editor-spacer" />

          {folder && (
            <span className={`editor-save${anyDirty ? ' is-dirty' : ' is-saved'}`}>
              <i aria-hidden="true" />
              {anyDirty ? t('editor/EditorPage.Unsaved') : t('editor/EditorPage.Saved')}
            </span>
          )}
        </header>

        {!folder ? (
          <div className="editor-empty">
            <h1>{t('editor/EditorPage.Title')}</h1>
            <p>{t('editor/EditorPage.EmptyHint')}</p>
            <button type="button" className="editor-open-button" onClick={() => void open()} disabled={busy}>
              <LuFolderOpen aria-hidden="true" />
              {busy ? t('editor/EditorPage.Opening') : t('editor/EditorPage.OpenFolderButton')}
            </button>
            {error && <p className="editor-error" role="alert">{error}</p>}
          </div>
        ) : (
          <main className="editor-main">
            <section className="editor-stage">
              {/* 文本还没就位时先不挂播放器，否则首帧会带着空谱面进错误态 */}
              {maidata && (hasChart ? (
                <MajView
                  key={folder.name}
                  chartText={maidata}
                  trackUrl={folder.trackUrl ?? ''}
                  videoUrl={folder.videoUrl}
                  title={title}
                  artist={artist}
                  level={active}
                  cover={cover}
                  onTime={handleTime}
                  settingsOpen={settingsOpen}
                  onSettingsOpenChange={setSettingsOpen}
                  settingsHost={settingsHost}
                  seekTo={seekTo}
                  command={command}
                  onPlayingChange={setPlaying}
                  showControls={false}
                />
              ) : (
                <div
                  className="editor-stage-idle"
                  style={{ backgroundImage: `url('${cover}')` }}
                >
                  <span>{t('editor/EditorPage.EmptyDifficulty')}</span>
                </div>
              ))}
            </section>

            <section className="editor-side">
              <DifficultyTabs active={active} dirty={dirty.perLevel} onSelect={setActive} />

              <div className="editor-controls">
                <div className="editor-clock">
                  <b>{formatClock(time)}</b>
                  <small>{folder.name}</small>
                </div>

                <label className="editor-field">
                  <span>{t('editor/EditorPage.Level')}</span>
                  <input
                    value={getLevel(maidata, active)}
                    onChange={(event) => setMaidata((prev) => setLevel(prev, active, event.target.value))}
                    placeholder="14+"
                  />
                </label>

                <label className="editor-field">
                  <span>{t('editor/EditorPage.Designer')}</span>
                  <input
                    value={getDesigner(maidata, active)}
                    onChange={(event) => setMaidata((prev) => setDesigner(prev, active, event.target.value))}
                    placeholder="designer"
                  />
                </label>

                <label className="editor-field">
                  <span>{t('editor/EditorPage.First')}</span>
                  <input
                    key={`${folder.name}-${active}`}
                    type="number"
                    step="0.01"
                    defaultValue={getFirst(maidata)}
                    onBlur={(event) => {
                      const value = Number(event.target.value);
                      if (Number.isFinite(value)) setMaidata((prev) => setFirst(prev, value));
                    }}
                  />
                </label>

                <label className="editor-toggle">
                  <input
                    type="checkbox"
                    checked={followCursor}
                    onChange={(event) => setFollowCursor(event.target.checked)}
                  />
                  {t('editor/EditorPage.FollowCursor')}
                </label>

                {/* 只有原版两个播放控制键：■ 停止、▶/⏸ 播放暂停 */}
                <div className="editor-playback">
                  <button
                    type="button"
                    onClick={() => sendCommand('stop')}
                    aria-label={t('song/MajView.Stop')}
                    title={t('song/MajView.Stop')}
                  >
                    <LuSquare aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => sendCommand('playPause')}
                    aria-label={playing ? t('song/MajView.Pause') : t('song/MajView.Play')}
                    title={playing ? t('song/MajView.Pause') : t('song/MajView.Play')}
                  >
                    {playing ? <LuPause aria-hidden="true" /> : <LuPlay aria-hidden="true" />}
                  </button>
                </div>
              </div>

              <div className="editor-editor">
                <SimaiCodeEditor
                  key={folder.name}
                  initialTexts={initialTexts}
                  active={active}
                  onChange={handleEditorChange}
                  onReady={(editor) => { editorRef.current = editor; }}
                  onSelectionChange={setHasSelection}
                  onCursorLineChange={handleCursorLine}
                />
              </div>
            </section>
          </main>
        )}

        {bpmOpen && <BpmTapWindow onClose={() => setBpmOpen(false)} />}
        {settingsOpen && (
          <EditorWindow
            title={t('song/MajView.Settings')}
            width={340}
            onClose={() => setSettingsOpen(false)}
          >
            {/* MajView 把设置面板 portal 到这里，所以它也是居中可拖动的浮窗 */}
            <div ref={setSettingsHost} />
          </EditorWindow>
        )}
        {chartInfoOpen && folder && (
          <ChartInfoWindow maidata={maidata} onApply={setMaidata} onClose={() => setChartInfoOpen(false)} />
        )}
      </div>
    </>
  );
}
