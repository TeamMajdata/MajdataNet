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
import { Link, useSearchParams } from 'react-router-dom';
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
import { buildTimeline, positionAt, timeAtPosition } from '@/utils/simaiTimeline';
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
/** 播放器的倍速档位（和 MajView 控制条里的一致） */
const PLAYBACK_RATES = [0.5, 0.75, 1, 1.25, 1.5, 2];

/** 快捷键说明窗里的一行 */
const SHORTCUTS = [
  { keys: 'Space', labelKey: 'editor/EditorPage.ShortcutPlay' },
  { keys: 'Ctrl + Space', labelKey: 'editor/EditorPage.ShortcutToggle' },
  { keys: 'Shift + Space', labelKey: 'editor/EditorPage.ShortcutTypeSpace' },
  { keys: 'Ctrl + ← / →', labelKey: 'editor/EditorPage.ShortcutNote' },
  { keys: 'Ctrl + Click', labelKey: 'editor/EditorPage.ShortcutClick' },
  { keys: 'Ctrl + S', labelKey: 'editor/EditorPage.ShortcutSave' },
  { keys: 'Ctrl + O', labelKey: 'editor/EditorPage.ShortcutOpen' },
  { keys: 'Ctrl（按住）', labelKey: 'editor/EditorPage.ShortcutHoldCtrl' },
  { keys: 'Shift（按住）', labelKey: 'editor/EditorPage.ShortcutHoldShift' },
] as const;

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
  const { folder, error, busy, open, createNew, openOnline, download } = useChartFolder();
  /** `?id=` 是站内谱面 Id：从谱面页「在 Edit 中打开」过来，进入只读预览 */
  const [params] = useSearchParams();
  const onlineId = params.get('id');
  const readOnly = Boolean(onlineId);
  const levelParam = params.get('level');
  /** 目标难度（0-based）；URL 里没有就是 null，不要当成 0（EASY） */
  const requestedLevel = levelParam === null ? null : Number(levelParam);
  const [maidata, setMaidata] = useState('');
  const [origin, setOrigin] = useState('');
  /** First 输入框正在输入中的文本：null 时直接显示文件里的 `&first` */
  const [firstDraft, setFirstDraft] = useState<string | null>(null);
  const firstValue = getFirst(maidata);
  const [active, setActive] = useState(4);
  const [openMenu, setOpenMenu] = useState<MenuId>(null);
  const [bpmOpen, setBpmOpen] = useState(false);
  const [time, setTime] = useState(0);
  const [saving, setSaving] = useState(false);
  const [hasSelection, setHasSelection] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [chartInfoOpen, setChartInfoOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [followCursor, setFollowCursor] = useState(false);
  const [judgeArea, setJudgeArea] = useState(false);
  const [hideNotes, setHideNotes] = useState(false);
  const [speed, setSpeed] = useState(1);
  /** 按住修饰键的临时效果：Ctrl 显示判定区、Shift 隐藏音符 */
  const [holdCtrl, setHoldCtrl] = useState(false);
  const [holdShift, setHoldShift] = useState(false);
  const [settingsHost, setSettingsHost] = useState<HTMLDivElement | null>(null);
  const [timelineHost, setTimelineHost] = useState<HTMLDivElement | null>(null);
  const [playing, setPlaying] = useState(false);
  /** 当前文本编译不过的原因：显示在编辑器底部 */
  const [chartError, setChartError] = useState<string | null>(null);
  const [command, setCommand] = useState<{ type: 'playPause' | 'stop' | 'playOrRewind'; key: number } | null>(null);
  const latestRef = useRef({ maidata: '', active: 4 });
  const lastSecondRef = useRef(-1);
  const editorRef = useRef<SimaiEditor | null>(null);
  /** handleTime 在帧回调里跑，拿不到最新的 timeline / followCursor，只能走 ref */
  const timelineRef = useRef<ReturnType<typeof buildTimeline>>(null);
  const followCursorRef = useRef(false);
  /** 上一次已经挪过光标的音符位置（行:列），用来去重 */
  const followKeyRef = useRef<string | null>(null);
  const [followPos, setFollowPos] = useState<{ line: number; column: number } | null>(null);

  // 打开文件夹 / 在线谱面：整份文本作为新的真源，并跳到有内容的难度
  useEffect(() => {
    if (!folder) return;
    setMaidata(folder.maidata);
    setOrigin(folder.maidata);
    const filled = filledDifficulties(folder.maidata);
    const first = filled.findIndex(Boolean);
    // 从谱面页带过来的难度优先（那页已经选好了难度）
    const wanted = requestedLevel !== null && Number.isInteger(requestedLevel) && requestedLevel >= 0 && requestedLevel < LEVEL_COUNT && filled[requestedLevel]
      ? requestedLevel
      : null;
    setActive(wanted ?? (first === -1 ? 4 : first));
    lastSecondRef.current = -1;
    setTime(0);
  }, [folder, requestedLevel]);

  /** 带 `?id=` 进来：拉线上谱面文本，只读预览 */
  useEffect(() => {
    if (!onlineId) return;
    void openOnline(onlineId);
  }, [onlineId, openOnline]);

  // 编辑器只在挂载时取一次初值，之后自己持有每个难度的 model
  const initialTexts = useMemo(
    () => Array.from({ length: LEVEL_COUNT }, (_, level) => getDifficultyText(folder?.maidata ?? '', level)),
    [folder],
  );

  /** 打开别的谱面 / 切换难度后丢掉输入草稿，First 框重新跟随文件里的值 */
  useEffect(() => { setFirstDraft(null); }, [folder, active]);

  /** 打开文件夹后：如果本地草稿比文件新，问一下要不要恢复（在线只读谱面没有草稿） */
  useEffect(() => {
    if (!folder || readOnly) return;
    let cancelled = false;
    void readDraft(folder.name).then((draft) => {
      if (cancelled || !shouldOfferRestore(draft, folder)) return;
      if (window.confirm(t('editor/EditorPage.RestoreDraft'))) {
        setMaidata(draft!.maidata);
        setActive(draft!.active);
      }
    });
    return () => { cancelled = true; };
  }, [folder, readOnly, t]);

  // 自动保存：停止编辑 5s 后落一次，另外每 30s 兜底；都不改变「已保存/未保存」。只读时不写
  useEffect(() => { latestRef.current = { maidata, active }; }, [maidata, active]);
  useEffect(() => {
    if (!folder || readOnly) return;
    const debounce = setTimeout(() => { void writeDraft(folder.name, maidata, active); }, 5000);
    return () => clearTimeout(debounce);
  }, [folder, maidata, active, readOnly]);
  useEffect(() => {
    if (!folder || readOnly) return;
    const timer = setInterval(() => {
      void writeDraft(folder.name, latestRef.current.maidata, latestRef.current.active);
    }, 30000);
    return () => clearInterval(timer);
  }, [folder, readOnly]);

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
  /** 哪些难度的页签是空的（文字压暗）；跟着编辑内容实时变 */
  const emptyLevels = useMemo(() => filledDifficulties(maidata).map((value) => !value), [maidata]);

  const handleEditorChange = useCallback((level: number, text: string) => {
    setMaidata((prev) => setDifficultyText(prev, level, text));
  }, []);

  const handleTime = useCallback((value: number) => {
    // 时钟只按整秒刷新，避免每帧重渲染整页
    const second = Math.floor(value);
    if (second !== lastSecondRef.current) {
      lastSecondRef.current = second;
      setTime(value);
    }
    // 跟随光标不能按秒走：每个音符变化就更新一次，否则会明显滞后
    if (!followCursorRef.current) return;
    const position = positionAt(timelineRef.current, value);
    if (!position) return;
    const key = `${position.line}:${position.column}`;
    if (key === followKeyRef.current) return;
    followKeyRef.current = key;
    setFollowPos(position);
  }, []);

  /** 播放时间 → 文本行；谱面一改就得重算 */
  const timeline = useMemo(
    () => buildTimeline(getDifficultyText(maidata, active), getFirst(maidata)),
    [maidata, active],
  );

  useEffect(() => { timelineRef.current = timeline; }, [timeline]);
  useEffect(() => {
    followCursorRef.current = followCursor;
    followKeyRef.current = null;
  }, [followCursor]);

  // 按住 Ctrl / Shift 的临时效果，checkbox 也要跟着显示成勾上
  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if (event.key === 'Control') setHoldCtrl(true);
      else if (event.key === 'Shift') setHoldShift(true);
    };
    const up = (event: KeyboardEvent) => {
      if (event.key === 'Control') setHoldCtrl(false);
      else if (event.key === 'Shift') setHoldShift(false);
    };
    const reset = () => { setHoldCtrl(false); setHoldShift(false); };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', reset);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', reset);
    };
  }, []);

  /** 把文本光标精确放到某个音符的位置上（行 + 列），并滚过去 */
  const moveCaret = useCallback((editor: SimaiEditor, line: number, column: number) => {
    const model = editor.getModel();
    if (!model) return;
    const safeLine = Math.min(Math.max(line, 1), model.getLineCount());
    const maxColumn = model.getLineMaxColumn(safeLine);
    const safeColumn = Math.min(Math.max(column, 1), maxColumn);
    editor.setSelection({
      startLineNumber: safeLine,
      startColumn: safeColumn,
      endLineNumber: safeLine,
      endColumn: safeColumn,
    });
    editor.revealLineInCenterIfOutsideViewport(safeLine);
  }, []);

  // 文本跟随只做一件事：播放时把文本光标挪到当前音符上（跟着音符走，不是跟着秒走）
  useEffect(() => {
    if (!followCursor || !playing || !followPos) return;
    const editor = editorRef.current;
    if (!editor) return;
    moveCaret(editor, followPos.line, followPos.column);
  }, [followPos, followCursor, playing, moveCaret]);

  const [seekTo, setSeekTo] = useState<{ seconds: number; key: number } | null>(null);
  /** 文本光标的位置：时间轴顶部的小三角跟着它走 */
  const [caretPos, setCaretPos] = useState({ line: 1, column: 1 });
  const caretTime = useMemo(
    () => timeAtPosition(timeline, caretPos.line, caretPos.column),
    [timeline, caretPos],
  );

  // 光标移动只记录位置，不自动 seek
  const handleCursorLine = useCallback((line: number, column: number) => {
    setCaretPos({ line, column });
  }, []);

  /** Ctrl / Cmd + 点击文本：时间跳到光标位置 */
  const handleCtrlClickLine = useCallback((line: number, column: number) => {
    const seconds = timeAtPosition(timeline, line, column);
    if (seconds === null) return;
    setSeekTo({ seconds, key: Date.now() });
  }, [timeline]);

  /** 拖动时间轴结束后把焦点还给文本编辑器 */
  const focusEditor = useCallback(() => {
    editorRef.current?.focus();
  }, []);

  /** 拖动时间轴：把文本光标挪到对应音符上 */
  const handleTimelineScrub = useCallback((seconds: number) => {
    const editor = editorRef.current;
    if (!editor) return;
    const position = positionAt(timeline, seconds);
    if (!position) return;
    moveCaret(editor, position.line, position.column);
  }, [timeline, moveCaret]);

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

  /**
   * 还有没保存的改动时，关标签页 / 刷新前先拦一下。
   * 浏览器只允许弹出它自己的通用文案，不能自定义。
   */
  useEffect(() => {
    if (!anyDirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      // 旧版浏览器要靠 returnValue 才会弹确认框
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [anyDirty]);

  const save = useCallback(async () => {
    if (!folder || readOnly) return;
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
  }, [folder, maidata, download, readOnly]);

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
  /**
   * 页面级快捷键（和控件焦点无关，整页生效）：
   * 空格 = 播放 / 回起点；Ctrl+空格 = 播放/暂停；Shift+空格 = 正常输入空格；
   * Ctrl+左右 = 按音符移动文本光标并跳到那一刻。
   */
  useEffect(() => {
    const isTyping = (target: EventTarget | null) => {
      const node = target as HTMLElement | null;
      if (!node) return false;
      // Monaco 的输入目标是 div.native-edit-context，不算输入框：编辑器里空格照样播放
      return node.tagName === 'INPUT' || node.tagName === 'TEXTAREA' || node.tagName === 'SELECT' || node.isContentEditable === true;
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (isTyping(event.target)) return;

      if (event.code === 'Space') {
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault();
          setCommand({ type: 'playPause', key: Date.now() });
          return;
        }
        if (event.shiftKey) return; // 交给编辑器输入空格
        if (event.defaultPrevented) return;
        event.preventDefault();
        setCommand({ type: 'playOrRewind', key: Date.now() });
        return;
      }

      if ((event.ctrlKey || event.metaKey) && !event.altKey && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) {
        const editor = editorRef.current;
        const model = editor?.getModel();
        if (!editor || !model) return;
        event.preventDefault();
        const position = editor.getPosition();
        const offset = position ? model.getOffsetAt(position) : 0;
        const text = model.getValue();
        let target: number;
        if (event.key === 'ArrowRight') {
          const next = text.indexOf(',', offset);
          target = next === -1 ? text.length : next + 1;
        } else {
          // 光标刚跳完时正停在逗号后面，要从更前面找，否则原地不动
          const previous = offset >= 2 ? text.lastIndexOf(',', offset - 2) : -1;
          target = previous === -1 ? 0 : previous + 1;
        }
        const nextPosition = model.getPositionAt(target);
        editor.setPosition(nextPosition);
        editor.revealPositionInCenterIfOutsideViewport(nextPosition);
        handleCtrlClickLine(nextPosition.lineNumber, nextPosition.column);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleCtrlClickLine]);

  /** 打开 / 新建前先确认未保存的改动 */
  /** 有未保存改动时先弹「保存 / 不保存 / 取消」，选完再执行动作 */
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  const requestAction = useCallback((action: () => void) => {
    if (!anyDirty) {
      action();
      return;
    }
    setPendingAction(() => action);
  }, [anyDirty]);

  const handleOpen = useCallback(() => requestAction(() => { void open(); }), [requestAction, open]);

  const handleCreateNew = useCallback(() => requestAction(() => { void createNew(); }), [requestAction, createNew]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
      // 只在可编辑时响应：在线谱面是只读的，Ctrl+S / Ctrl+O 都不该有动作
      if (readOnly) return;
      const key = event.key.toLowerCase();
      if (key === 's') {
        event.preventDefault();
        void save();
      } else if (key === 'o') {
        event.preventDefault();
        handleOpen();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [save, handleOpen, readOnly]);

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
          <Link to="/" className="editor-brand">Majdata Edit</Link>

          {readOnly ? (
            <>
              <Link to={`/song?id=${encodeURIComponent(onlineId ?? '')}`} className="editor-top-item">
                ← {t('editor/EditorPage.BackToSong')}
              </Link>
              <button type="button" className="editor-top-item" onClick={() => setBpmOpen(true)}>{t('editor/EditorPage.MenuBpmTap')}</button>
              <button type="button" className="editor-top-item" onClick={() => setShortcutsOpen(true)}>{t('editor/EditorPage.MenuShortcuts')}</button>
            </>
          ) : (
            <>
          <div className="editor-menu-wrap">
            <button type="button" className={`editor-top-item${openMenu === 'file' ? ' is-open' : ''}`} onClick={toggleMenu('file')}>
              {t('editor/EditorPage.MenuFile')}
            </button>
            {openMenu === 'file' && (
              <div className="editor-menu" onPointerDown={(event) => event.stopPropagation()}>
                <button type="button" onClick={() => { setOpenMenu(null); handleCreateNew(); }} disabled={busy}>
                  <LuFilePlus aria-hidden="true" />{t('editor/EditorPage.New')}
                </button>
                <button type="button" onClick={() => { setOpenMenu(null); handleOpen(); }} disabled={busy}>
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

          <button
            type="button"
            className="editor-top-item"
            onClick={() => setSettingsOpen(true)}
            disabled={!folder}
          >{t('editor/EditorPage.MenuSettings')}</button>
          <button type="button" className="editor-top-item" onClick={() => setBpmOpen(true)}>{t('editor/EditorPage.MenuBpmTap')}</button>
          <button type="button" className="editor-top-item" onClick={() => setShortcutsOpen(true)}>{t('editor/EditorPage.MenuShortcuts')}</button>
            </>
          )}

          <span className="editor-spacer" />

          {readOnly ? (
            <span className="editor-readonly-badge">{t('editor/EditorPage.OnlineReadOnly')}</span>
          ) : folder && (
            <span className={`editor-save${anyDirty ? ' is-dirty' : ' is-saved'}`}>
              <i aria-hidden="true" />
              {anyDirty ? t('editor/EditorPage.Unsaved') : t('editor/EditorPage.Saved')}
            </span>
          )}
        </header>

        {!folder ? (
          <div className="editor-empty">
            <h1>{t('editor/EditorPage.Title')}</h1>
            {readOnly ? (
              <>
                <p>{busy ? t('editor/EditorPage.OpeningOnline') : t('editor/EditorPage.OnlineReadOnly')}</p>
                {error && <p className="editor-error" role="alert">{error}</p>}
                <Link to={`/song?id=${encodeURIComponent(onlineId ?? '')}`} className="editor-open-button">
                  ← {t('editor/EditorPage.BackToSong')}
                </Link>
              </>
            ) : (
              <>
                <p>{t('editor/EditorPage.EmptyHint')}</p>
                <button type="button" className="editor-open-button" onClick={handleOpen} disabled={busy}>
                  <LuFolderOpen aria-hidden="true" />
                  {busy ? t('editor/EditorPage.Opening') : t('editor/EditorPage.OpenFolderButton')}
                </button>
                {error && <p className="editor-error" role="alert">{error}</p>}
              </>
            )}
          </div>
        ) : (
          <main className="editor-main">
            <section className="editor-stage">
              {/* 空难度也挂播放器：能听音乐、看视频、看波形（测 BPM 用） */}
              {maidata && (
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
                  showTimeline
                  timelineHost={timelineHost}
                  caretTime={caretTime}
                  onTimelineScrub={handleTimelineScrub}
                  onTimelineScrubEnd={focusEditor}
                  preloadVideo
                  allowEmptyChart
                  judgeArea={judgeArea || holdCtrl}
                  hideNotes={hideNotes || holdShift}
                  rate={speed}
                  onTextError={setChartError}
                />
              )}
              {maidata && !hasChart && (
                <p className="editor-stage-hint">{t('editor/EditorPage.EmptyDifficulty')}</p>
              )}
              {/* 已经打开着谱面时再打开别的会失败在空状态外面，这里补一条浮在判定盘上的提示 */}
              {error && <p className="editor-error editor-error-overlay" role="alert">{error}</p>}
            </section>

            <section className="editor-side">
              <DifficultyTabs
                active={active}
                dirty={dirty.perLevel}
                empty={emptyLevels}
                onSelect={setActive}
              />

              <div className="editor-controls">
                <div className="editor-clock">
                  <b>{formatClock(time)}</b>
                  <small>{folder.name}</small>
                </div>

                <label className="editor-field">
                  <span>{t('editor/EditorPage.Level')}</span>
                  <input
                    disabled={readOnly}
                    value={getLevel(maidata, active)}
                    onChange={(event) => setMaidata((prev) => setLevel(prev, active, event.target.value))}
                  />
                </label>

                <label className="editor-field">
                  <span>{t('editor/EditorPage.Designer')}</span>
                  <input
                    disabled={readOnly}
                    value={getDesigner(maidata, active)}
                    onChange={(event) => setMaidata((prev) => setDesigner(prev, active, event.target.value))}
                  />
                </label>

                <label className="editor-field">
                  <span>{t('editor/EditorPage.First')}</span>
                  <input
                    disabled={readOnly}
                    type="number"
                    step="0.01"
                    // 受控：打开谱面 / 切难度后要显示文件里的真实值，不能停在挂载时的旧值
                    value={firstDraft ?? String(firstValue)}
                    // 滚轮/输入都要立刻生效，不能等失焦；但清空输入框时不要当成 0 写回去
                    onChange={(event) => {
                      const text = event.target.value;
                      setFirstDraft(text);
                      const value = Number(text);
                      if (text.trim() !== '' && Number.isFinite(value)) {
                        setMaidata((prev) => setFirst(prev, value));
                      }
                    }}
                    // 失焦就交回真值：非法或空输入直接恢复成文件里的 First
                    onBlur={() => setFirstDraft(null)}
                  />
                </label>

                {/* 倍速放在所有 checkbox 上面 */}
                <label className="editor-field">
                  <span>{t('editor/EditorPage.PlaybackRate')}</span>
                  <select
                    value={speed}
                    onChange={(event) => setSpeed(Number(event.target.value))}
                  >
                    {PLAYBACK_RATES.map((value) => (
                      <option key={value} value={value}>{`${value}×`}</option>
                    ))}
                  </select>
                </label>

                <label className="editor-toggle">
                  <input
                    type="checkbox"
                    checked={followCursor}
                    onChange={(event) => setFollowCursor(event.target.checked)}
                  />
                  {t('editor/EditorPage.FollowCursor')}
                </label>

                <label className="editor-toggle">
                  <input
                    type="checkbox"
                    checked={judgeArea || holdCtrl}
                    onChange={(event) => setJudgeArea(event.target.checked)}
                  />
                  {t('editor/EditorPage.ShowJudgeArea')}
                </label>

                <label className="editor-toggle">
                  <input
                    type="checkbox"
                    checked={hideNotes || holdShift}
                    onChange={(event) => setHideNotes(event.target.checked)}
                  />
                  {t('editor/EditorPage.HideNotes')}
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
                  readOnly={readOnly}
                  onChange={handleEditorChange}
                  onReady={(editor) => { editorRef.current = editor; }}
                  onSelectionChange={setHasSelection}
                  onCursorLineChange={handleCursorLine}
                  onCtrlClickLine={handleCtrlClickLine}
                />
                {/* 文本编译不过时的提示：贴在编辑器底部，不挡预览 */}
                {chartError && (
                  <p className="editor-chart-error" role="alert">
                    {t('editor/EditorPage.ChartError')} {chartError}
                  </p>
                )}
              </div>

              {/* 波形时间轴挂在这里（MajView 用 portal 送过来） */}
              <div className="editor-timeline" ref={setTimelineHost} />
            </section>
          </main>
        )}

        {bpmOpen && <BpmTapWindow onClose={() => setBpmOpen(false)} />}
        {shortcutsOpen && (
          <EditorWindow
            title={t('editor/EditorPage.MenuShortcuts')}
            width={460}
            onClose={() => setShortcutsOpen(false)}
          >
            <div className="editor-shortcuts">
              {SHORTCUTS.map(({ keys, labelKey }) => (
                <div key={labelKey} className="editor-shortcut-row">
                  <kbd>{keys}</kbd>
                  <span>{t(labelKey)}</span>
                </div>
              ))}
            </div>
          </EditorWindow>
        )}
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

        {pendingAction && (
          <div
            className="editor-confirm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="editor-confirm-title"
            onKeyDown={(event) => { if (event.key === 'Escape') setPendingAction(null); }}
          >
            <div className="editor-confirm-box">
              <h2 id="editor-confirm-title">{t('editor/EditorPage.UnsavedTitle')}</h2>
              <p>{t('editor/EditorPage.UnsavedBody')}</p>
              <div className="editor-confirm-actions">
                <button
                  type="button"
                  onClick={async () => {
                    const action = pendingAction;
                    setPendingAction(null);
                    await save();
                    action();
                  }}
                >
                  {t('editor/EditorPage.Save')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const action = pendingAction;
                    setPendingAction(null);
                    action();
                  }}
                >
                  {t('editor/EditorPage.DontSave')}
                </button>
                <button type="button" className="is-primary" onClick={() => setPendingAction(null)} autoFocus>
                  {t('editor/EditorPage.Cancel')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
