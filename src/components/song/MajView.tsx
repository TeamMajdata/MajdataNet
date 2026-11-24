/**
 * 网页版谱面预览（MajView）：PixiJS 画谱面，Web Audio 放音乐和打击音，替代原来的 Unity WebGL 播放器。
 * 引擎在 src/majview/，皮肤和音效在 public/majview/skin/。这个组件只负责加载、播放控制和界面。
 *
 * 打开页面时只加载谱面并停在开头；第一次点播放才下载音乐，免得每次打开谱面页都下载整首歌。
 *
 * 设置里的“显示性能信息”会在判定盘左上角叠一层诊断信息（FPS、渲染耗时、谱面时间与
 * DSP / 视频时间的差），默认关闭。
 */
import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { LuMaximize, LuMinus, LuPause, LuPlay, LuPlus, LuRotateCcw, LuSettings2 } from 'react-icons/lu';
import { Board } from '@/majview/renderer.js';
import { Transport, adoptDecoded } from '@/majview/audio.js';
import { useMediaSession } from './useMediaSession';
import { compileChart, readMaidata } from '@/majview/simai.js';
import { analyzeChart } from '@/majview/analyzer.js';
import MajViewAnalyzer from './MajViewAnalyzer';
import { buildWaveform } from '@/majview/visualizer.js';
import MajViewVisualizer, { type SpectrumAnalysis, type VisualizerHandle } from './MajViewVisualizer';
import { AURORA_DEFAULTS, downsample } from '@/majview/spectrum.js';
import { chartStart, scoreTimeline } from '@/majview/timeline.js';
import { DOUBLE_TAP_MS, DOUBLE_TAP_SLOP_PX, ARROW_SEEK_SEC, ARROW_STEP_SEC, BRIGHT_DRAG_PX, KEY_FAST_RATE, LONG_PRESS_MS, SCRUB_SLOP_PX, TAP_SLOP_PX, VERTICAL_SLOP_PX, VOLUME_DRAG_PX, seekTarget } from '@/majview/gestures.js';
import { createPerf, perfForced } from '@/majview/perf.js';
import { loadChartText } from '@/majview/chartCache';
import { clamp } from '@/majview/geometry.js';
import type { ChartMark } from './chartMarks';
import { loadSettings, saveSettings, type ViewSettings } from '@/majview/settings';
import SortMenu from '@/components/ui/SortMenu';
import MajViewSettings from './MajViewSettings';
import '@/styles/components/majview.css';

const SKIN_BASE = '/majview/skin/';
/** MajdataView 的默认底图（带判定区文字），「显示判定区」时用它盖掉谱面自带的 bg/pv */
const DEFAULT_BACKGROUND = `${SKIN_BASE}Default_Background.png`;
const RATES = [0.5, 0.75, 1, 1.25, 1.5, 2];

/** 加载各阶段的 performance 标记，便于在控制台/Performance 面板里核对耗时 */
function mark(name: string) {
  try {
    performance.mark(name);
  } catch {
    /* 老浏览器忽略 */
  }
}

type Chart = ReturnType<typeof compileChart>;
/** loading：加载谱面；ready：可以播放；buffering：第一次播放，正在下载音乐；error：失败 */
type Status = 'loading' | 'ready' | 'buffering' | 'error';

/** 一根手指/鼠标在判定盘上的手势状态：点按、长按 2 倍速、拖动（进度 / 音量 / 亮度）都从 pointerdown 开始区分 */
type GestureMode = 'seek' | 'volume' | 'brightness';
type BoardGesture = {
  id: number;
  pointerType: string;
  /** 起点（视口坐标） */
  x: number;
  y: number;
  /** 判定盘的位置和尺寸，竖屏手势按它算左右半边 */
  left: number;
  width: number;
  moved: boolean;
  mode: GestureMode | null;
  longPressed: boolean;
  spedUp: boolean;
  /** 拖动开始时的时间：目标时间相对它算，不跟着画面走 */
  startTime: number;
  target: number;
  /** 拖动进度前是否在播放：拖动期间先暂停，松手后接着放 */
  wasPlaying: boolean;
  /** 音量 / 亮度拖动的起点值 */
  startVolume: number;
  startCover: number;
};

/** iOS 17+：让 Web Audio 按“媒体播放”处理，静音键打开时也能出声 */
function preferPlaybackSession() {
  const session = (navigator as Navigator & { audioSession?: { type: string } }).audioSession;
  if (session) {
    try { session.type = 'playback'; } catch { /* 不支持就算了 */ }
  }
}

// iPhone 的 Safari 只允许视频全屏，不支持时不显示全屏按钮
const CAN_FULLSCREEN = typeof document !== 'undefined' && document.fullscreenEnabled === true
  && typeof HTMLElement.prototype.requestFullscreen === 'function';

function formatClock(seconds: number) {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** 还没下载音乐时，用谱面最后一个音符结束的时间当总长 */
function chartDuration(chart: Chart) {
  return chart.notes.reduce((end: number, n: { end: number; firework?: boolean }) => Math.max(end, n.end + (n.firework ? 1.4 : 0.76)), 0);
}

/**
 * 空难度也要能听音乐、看视频、看波形（测 BPM 用），所以给一个没有音符的空谱面。
 * clockTimes / chartStart / chartDuration 都已经能处理空 notes。
 */
const EMPTY_CHART: Chart = { notes: [], warnings: [], firstBpm: 120, last: 0, commaTimings: [] };

/** 允许空难度时，难度字段为空就直接用空谱面，不当成错误 */
function compileForView(text: string, level: number, allowEmpty: boolean): Chart {
  const fields = readMaidata(text) as Record<string, string>;
  if (allowEmpty && !(fields[`inote_${level + 1}`] ?? '').trim()) return EMPTY_CHART;
  return compileChart(fields, level);
}

export default function MajView({ chartUrl, chartText, trackUrl, videoUrl, title, artist, level, cover, onCoverError, active = true, jump, onMarkRange, onTime, settingsOpen: settingsOpenProp, onSettingsOpenChange, controlsHost, settingsHost, seekTo, command, onPlayingChange, showControls = true, showTimeline = false, timelineHost, showAnalyzer = false, caretTime = null, onTimelineScrub, onTimelineScrubEnd, preloadVideo = false, onTextError, allowEmptyChart = false, judgeArea = false, hideNotes = false, rate: rateProp }: {
  /** maidata.txt 的地址。谱面页传接口地址，本地编辑器传 blob URL */
  chartUrl?: string;
  /**
   * 直接给谱面文本（编辑器的实时预览）。给了就不再请求 chartUrl，
   * 之后的每次变化只重编译并热换谱面，不重载音频、不跳播放位置。
   */
  chartText?: string;
  /** 音乐（mp3）的地址 */
  trackUrl: string;
  /** 背景 PV 的地址；没有就不挂视频 */
  videoUrl?: string;
  /** 曲名、曲师：显示在系统的媒体控件里（锁屏、控制中心、通知栏） */
  title: string;
  artist?: string;
  level: number;
  cover: string;
  onCoverError?: () => void;
  /** 页签切走时为 false：播放器保留（不用重新加载），但停止播放 */
  active?: boolean;
  /** 评论里点了时间 / combo；key 每次点击都不同，同一个位置也能再跳 */
  jump?: (ChartMark & { key: number }) | null;
  /** 告诉页面当前谱面的范围，用来判断评论里的时间 / combo 是否有效 */
  onMarkRange?: (range: { length: number; maxCombo: number } | null) => void;
  /** 每帧上报播放时间（秒）；编辑器用它在中栏显示时间 */
  onTime?: (time: number) => void;
  /** 设置面板的开关（受控）。不传则由播放器自己的按钮管 */
  settingsOpen?: boolean;
  onSettingsOpenChange?: (open: boolean) => void;
  /** 把播放控制条挂到这个节点里（编辑器用）；不传就画在播放器内部 */
  controlsHost?: HTMLElement | null;
  /** 把设置面板挂到这个节点里（编辑器用），同理 */
  settingsHost?: HTMLElement | null;
  /** 编辑器里光标换行 → 跳到那一刻（绝对秒）；key 每次不同才能重复跳同一个位置 */
  seekTo?: { seconds: number; key: number } | null;
  /** 外部播放控制：播放/暂停、停止。key 每次不同才触发一次 */
  command?: { type: 'playPause' | 'stop'; key: number } | null;
  /** 播放状态变化时回调，编辑器用自己的两个按钮显示 ▶ / ⏸ */
  onPlayingChange?: (playing: boolean) => void;
  /** 是否渲染播放器自带的控制条（进度条 + 按钮那一条；编辑器不要） */
  showControls?: boolean;
  /** 是否渲染波形时间轴（编辑器要保留） */
  showTimeline?: boolean;
  /** 把时间轴挂到这个节点里（编辑器用） */
  timelineHost?: HTMLElement | null;
  /** 是否渲染音符密度柱状图（目前哪里都不显示） */
  showAnalyzer?: boolean;
  /** 文本光标时间（秒），时间轴顶部的小三角跟着它走 */
  caretTime?: number | null;
  /** 拖动时间轴时上报目标时间，页面据此移动文本光标 */
  onTimelineScrub?: (seconds: number) => void;
  /** 拖动结束（松开 / 取消），页面据此把焦点还给文本编辑器 */
  onTimelineScrubEnd?: () => void;
  /** 谱面一载入就开始下载背景 PV（编辑器要；song 页仍然点播放才拉） */
  preloadVideo?: boolean;
  /** 文本编译不过时的原因（null 表示恢复正常）；给了就由页面自己显示 */
  onTextError?: (message: string | null) => void;
  /** 难度为空时也给一个空谱面（编辑器要：空难度也要能放音乐、看波形） */
  allowEmptyChart?: boolean;
  /** 显示判定区：强制用带判定区文字的默认背景，并隐藏视频 */
  judgeArea?: boolean;
  /** 隐藏所有音符 */
  hideNotes?: boolean;
  /** 播放倍速（受控）；不传则由播放器自己的按钮管 */
  rate?: number;
}) {
  const { t } = useTranslation();
  const rootRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<HTMLDivElement>(null);
  const boardHostRef = useRef<HTMLDivElement>(null);
  const comboRef = useRef<HTMLDivElement>(null);
  const comboValueRef = useRef<HTMLElement>(null);
  const counterRef = useRef<HTMLDivElement>(null);
  const summaryRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  // 背景压暗层：拖动调亮度时直接写样式，不等 React 重渲染
  const shadeRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLInputElement>(null);
  // 进度条上方的时间轴：每帧由 frame() 推时间进去
  const visualizerRef = useRef<VisualizerHandle>(null);
  const clockRef = useRef<HTMLSpanElement>(null);

  const boardRef = useRef<Board | null>(null);
  const spectrumWorkerRef = useRef<Worker | null>(null);
  // 换谱面时旧 Worker 的结果要丢掉
  const spectrumIdRef = useRef(0);
  const contextRef = useRef<AudioContext | null>(null);
  /** 当前 AudioContext 是否真正跑起来过（第一次点播放之前它本来就是暂停的，不算卡死） */
  const contextRanRef = useRef(false);
  /** 跑过的 AudioContext 之后页面进过后台：iOS 回来后它可能还报 running，但时钟再也不走，下次点播放一律换新的 */
  const backgroundedRef = useRef(false);
  const chartRef = useRef<Chart | null>(null);
  /** 编辑器给的实时谱面文本；用 ref 是为了不在每次输入时重跑整个加载流程 */
  const chartTextRef = useRef(chartText);
  chartTextRef.current = chartText;
  /** 每帧上报时间给页面；走 ref 免得 frame() 的依赖里多一项 */
  const onTimeRef = useRef(onTime);
  onTimeRef.current = onTime;
  /** 谱面分析开关：prepareTrack 里要用，但不想因此重跑整个加载流程 */
  const showAnalysisRef = useRef(showTimeline || showAnalyzer);
  showAnalysisRef.current = showTimeline || showAnalyzer;
  const transportRef = useRef<Transport | null>(null);
  // 后台准备音乐的进度：打开页面就开始下载解码，点播放时多半已经好了
  const trackRef = useRef<{ chart: Chart; controller: AbortController; promise: Promise<Transport | null> } | null>(null);
  // 还没有音乐时（或下载中）拖动时间轴的位置
  const previewTimeRef = useRef(0);
  const [settings, setSettings] = useState(loadSettings);
  const settingsRef = useRef(settings);
  // First 偏移（秒）：谱面整体平移，渲染时把媒体时间往回挪这么多
  const firstOffsetRef = useRef(settings.FirstOffset / 1000);
  firstOffsetRef.current = settings.FirstOffset / 1000;
  const [settingsOpenState, setSettingsOpenState] = useState(false);
  /** 时间轴缩放：中线两侧各显示多少秒 */
  const [timelineZoom, setTimelineZoom] = useState(4);
  const zoomTimeline = useCallback((delta: number) => {
    setTimelineZoom((value) => Math.min(10, Math.max(0.1, Math.round((value + delta) * 10) / 10)));
  }, []);
  // 外部（编辑器的菜单栏）想控制设置面板时传 settingsOpen，不传就是播放器自己管
  const settingsOpen = settingsOpenProp ?? settingsOpenState;
  const setSettingsOpen = (next: boolean | ((open: boolean) => boolean)) => {
    const value = typeof next === 'function' ? next(settingsOpen) : next;
    if (settingsOpenProp === undefined) setSettingsOpenState(value);
    onSettingsOpenChange?.(value);
  };
  const rafRef = useRef(0);

  // 性能信息：设置里的开关（默认关闭），?perf=1 可以强制打开
  const perfOn = settings.Perf || perfForced();
  const perf = useMemo(() => (perfOn ? createPerf(`majview ${title}#${level}`) : null), [perfOn, title, level]);
  const perfRef = useRef<HTMLDivElement>(null);
  const perfPaintRef = useRef(0);
  const perfFirstFrameRef = useRef(false);

  // 判定盘手势：同一时间只跟踪一根手指，定时器保存长按
  const gestureRef = useRef<BoardGesture | null>(null);
  const longPressRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTapRef = useRef<{ at: number; x: number; y: number } | null>(null);
  // 拖动进度时，时间读数右边多显示一个 ±
  const seekDeltaRef = useRef<HTMLSpanElement>(null);
  const seekHintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // 音量 / 亮度拖动时显示当前值（屏幕中心胶囊）
  const valueHintRef = useRef<HTMLDivElement>(null);
  const valueHintLabelRef = useRef<HTMLSpanElement>(null);
  const valueHintValueRef = useRef<HTMLElement>(null);
  const valueHintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // 长按快放：倍速显示在控制条的倍速按钮上
  const [fastForward, setFastForward] = useState(false);
  // 全屏时控制条自动隐藏：动一下鼠标 / 点一下画面才出来
  const [controlsShown, setControlsShown] = useState(true);
  const controlsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // 诊断用：控制条当前是否显示
  const controlsShownRef = useRef(true);
  controlsShownRef.current = controlsShown;
  // 鼠标单击播放/暂停要等一小会儿，确认不是双击（双击是切全屏）
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const arrowHoldRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const arrowFastRef = useRef(false);

  const [boardReady, setBoardReady] = useState(false);
  const [chart, setChart] = useState<Chart | null>(null);
  const [status, setStatus] = useState<Status>('loading');
  // 错误只记原因，文案在渲染时翻译
  const [error, setError] = useState<{ track?: boolean; detail?: string }>({});
  /** 加一就会重新走一遍完整加载：首次编译失败后靠它把状态救回来 */
  const [reloadKey, setReloadKey] = useState(0);
  /** 编辑时文本编译不过：画面继续显示上一版，但要把错误提示出来 */
  const [textError, setTextError] = useState<string | null>(null);
  /** 本轮播放的起点（空格第二下跳回来） */
  const [playStart, setPlayStart] = useState<number | null>(null);
  const playStartRef = useRef<number | null>(null);
  /** 判定区 / 隐藏音符：由页面控制（页面还负责按住 Ctrl / Shift 的临时效果） */
  const showJudge = judgeArea;
  const notesHidden = hideNotes;

  // 把「当前文本编译不过的原因」报给页面（编辑器把它显示在编辑器底部）
  const onTextErrorRef = useRef(onTextError);
  onTextErrorRef.current = onTextError;
  useEffect(() => {
    onTextErrorRef.current?.(textError);
  }, [textError]);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  // 波形包络：音乐解码好之后算一次，进度条上方的时间轴拿它当背景
  const [waveform, setWaveform] = useState<{ data: Float32Array; duration: number } | null>(null);
  // 波形颜色：Worker 里算出来的 Aurora 三段分频结果，没到之前波形是纯绿的
  const [spectrum, setSpectrum] = useState<SpectrumAnalysis | null>(null);
  // 开头 clock 在 0 之前时，进度条从第一下 clock 开始，显示的时间和总长也把这段算进去
  const [begin, setBegin] = useState(0);
  const beginRef = useRef(0);
  const [rate, setRate] = useState(1);
  const [videoVisible, setVideoVisible] = useState(false);
  // 背景 PV 在第一次点播放前不挂 src：否则打开页面就把整段视频下下来了
  const [videoArmed, setVideoArmed] = useState(false);
  /** 编辑器里谱面一就绪就挂 src 预加载；song 页仍然点播放才拉 */
  const attachVideo = videoArmed || preloadVideo;
  // 手势回调在两次渲染之间触发，读 ref 才能拿到当前总长和倍速
  const durationRef = useRef(0);
  const rateRef = useRef(1);
  durationRef.current = duration;
  rateRef.current = rate;

  const currentTime = () => transportRef.current?.time ?? previewTimeRef.current;

  /**
   * 视频跟着谱面时间走。
   * 差得多（seek、掉帧）直接改 currentTime；差几十毫秒时用播放速率慢慢追，
   * 不然会一直挂在阈值边缘（拖动后实测会残留 ~90ms）。
   */
  const syncVideo = useCallback((force = false) => {
    const video = videoRef.current;
    if (!video || video.readyState < 1 || !Number.isFinite(video.duration)) return;
    const transport = transportRef.current;
    const time = transport?.time ?? previewTimeRef.current;
    const rate = transport?.rate ?? 1;
    const target = Math.max(0, Math.min(time, video.duration));
    const drift = video.currentTime - target; // 正数：视频跑在谱面之前
    const abs = Math.abs(drift);
    if ((force && abs > 0.015) || abs > 0.15) {
      video.currentTime = target;
      video.playbackRate = rate;
    } else if (abs > 0.02) {
      // 每帧 ±3%，90ms 的偏差大约三秒内追平，看不出来
      video.playbackRate = drift > 0 ? rate * 0.97 : rate * 1.03;
    } else if (video.playbackRate !== rate) {
      video.playbackRate = rate;
    }
    if (transport?.playing && time >= 0 && time < video.duration) {
      if (video.paused) video.play().catch(() => {});
    } else if (!video.paused) video.pause();
  }, []);

  const frame = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    const board = boardRef.current;
    if (!board || !chartRef.current) return;
    if (!perfFirstFrameRef.current) {
      perfFirstFrameRef.current = true;
      mark('majview:first-frame');
    }
    const transport = transportRef.current;
    const time = transport?.time ?? previewTimeRef.current;
    onTimeRef.current?.(time);
    if (perf) perf.markFrame();
    if (transport?.playing && time >= transport.duration) {
      transport.pause();
      setPlaying(false);
    }
    const renderStart = perf ? performance.now() : 0;
    // 谱面整体平移：媒体时间往回挪，音符和打击音一起晚/早 First 偏移那么多
    board.render(time - firstOffsetRef.current);
    if (perf) {
      const video = videoRef.current;
      perf.markRender(performance.now() - renderStart, {
        notes: board.stats?.notes,
        sprites: board.stats?.sprites,
        time,
        dsp: transport?.dspTime,
        video: video?.classList.contains('visible') ? video.currentTime : undefined,
        audio: transport?.stats,
        playing: Boolean(transport?.playing),
        rate: rateRef.current,
      });
    }
    if (timelineRef.current) timelineRef.current.value = String(time);
    // 时间轴：中线固定在中间，窗口里的谱面和波形每帧跟着这个时间重画
    visualizerRef.current?.render(time);
    // 时间文字一秒才变一次，没变就不碰 DOM
    const clock = formatClock(time - beginRef.current);
    if (clockRef.current && clockRef.current.textContent !== clock) clockRef.current.textContent = clock;
    // 诊断覆盖层：5Hz 刷新，不跟着每帧写 DOM
    if (perf && perfRef.current && performance.now() - perfPaintRef.current > 200) {
      perfPaintRef.current = performance.now();
      perf.paint(perfRef.current);
      // 背景视频是否在掉帧：和 rAF 掉帧是两回事，分开看
      const quality = videoRef.current?.getVideoPlaybackQuality?.();
      if (quality) perf.setScene({ video: `${quality.droppedVideoFrames}/${quality.totalVideoFrames} dropped` });
    }
    syncVideo();
    if (transport?.playing) rafRef.current = requestAnimationFrame(frame);
  }, [syncVideo, perf]);

  const dropTransport = useCallback(() => {
    trackRef.current?.controller.abort();
    trackRef.current = null;
    transportRef.current?.dispose();
    transportRef.current = null;
  }, []);

  // 渲染器只创建一次
  useEffect(() => {
    const host = boardHostRef.current;
    if (!host) return;
    let disposed = false;
    let created: Board | null = null;
    Board.create(host, 'webgl', SKIN_BASE, { combo: comboRef.current, comboValue: comboValueRef.current, counter: counterRef.current, summary: summaryRef.current })
      .then((board) => {
        if (disposed) {
          board.destroy();
          return;
        }
        created = board;
        boardRef.current = board;
        setBoardReady(true);
        mark('majview:board-ready');
      })
      .catch((err: Error) => {
        if (disposed) return;
        setError({ detail: err.message });
        setStatus('error');
      });
    return () => {
      disposed = true;
      cancelAnimationFrame(rafRef.current);
      dropTransport();
      created?.destroy();
      boardRef.current = null;
      void contextRef.current?.close();
      contextRef.current = null;
      contextRanRef.current = false;
    };
  }, [dropTransport]);

  // iOS 切后台再回来：AudioContext 可能停在 interrupted / suspended，也可能照样报 running 但时钟一动不动
  // （只看 state 判断不出来）。所以：
  // - 进后台时记下来，下次点播放一律换一个新的 AudioContext（togglePlay）；
  // - 回到页面时如果还在“播放”，看半秒时钟有没有走，没走就先切回暂停，界面不会卡在播放状态
  useEffect(() => {
    let timer: number | undefined;
    const onVisibility = () => {
      window.clearTimeout(timer);
      if (document.visibilityState === 'hidden') {
        if (contextRanRef.current) backgroundedRef.current = true;
        return;
      }
      const transport = transportRef.current;
      const context = contextRef.current;
      if (!transport?.playing || !context) return;
      const before = context.currentTime;
      timer = window.setTimeout(() => {
        if (transportRef.current !== transport || !transport.playing) return;
        if (context.state === 'running' && context.currentTime - before > 0.1) return;
        transport.pause();
        setPlaying(false);
        syncVideo(true);
        frame();
      }, 500);
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [frame, syncVideo]);

  // 系统回收了画布的 WebGL（切后台久了、内存紧张）：Pixi 恢复后重画一帧，暂停时画面才不会停在空白
  useEffect(() => {
    const host = boardHostRef.current;
    if (!host) return;
    const redraw = () => frame();
    host.addEventListener('webglcontextrestored', redraw, true);
    return () => host.removeEventListener('webglcontextrestored', redraw, true);
  }, [frame]);

  /** 频谱颜色：整曲 FFT 约 300ms，放 Worker 里算，主线程只做 2:1 降采样 */
  const analyzeTrack = useCallback((transport: Transport) => {
    const id = spectrumIdRef.current + 1;
    spectrumIdRef.current = id;
    spectrumWorkerRef.current?.terminate();
    const worker = new Worker(new URL('../../majview/spectrum.worker.js', import.meta.url), { type: 'module' });
    spectrumWorkerRef.current = worker;
    worker.onmessage = (event: MessageEvent<SpectrumAnalysis>) => {
      worker.terminate();
      if (spectrumIdRef.current === id) setSpectrum(event.data);
    };
    worker.onerror = (event) => {
      // 失败了就算了，波形退回绿色，但别让错误静默消失
      console.warn('[majview] spectrum worker failed', event.message ?? event);
      worker.terminate();
    };
    // 降到 24kHz 再分析（Nyquist 12kHz 覆盖 Aurora 的蓝色段），降采样顺带当抗混叠低通
    const samples = downsample(transport.song.getChannelData(0), AURORA_DEFAULTS.decimate);
    worker.postMessage(
      { samples, rate: transport.song.sampleRate / AURORA_DEFAULTS.decimate },
      [samples.buffer],
    );
  }, []);

  // 卸载时把频谱 Worker 停掉
  useEffect(() => () => {
    spectrumWorkerRef.current?.terminate();
    spectrumWorkerRef.current = null;
  }, []);

  /** 下载并解码音乐、准备音效；同一个谱面只做一次。失败时返回 null，下次点播放再试 */
  const prepareTrack = useCallback((target: Chart) => {
    if (trackRef.current?.chart === target) return trackRef.current.promise;
    trackRef.current?.controller.abort();
    // 还没有用户操作时创建的 AudioContext 处于暂停状态，但已经可以解码；点播放时再 resume
    contextRef.current ??= new AudioContext({ latencyHint: 'interactive' });
    const context = contextRef.current;
    const controller = new AbortController();
    const promise = Transport.load(context, trackUrl, target, settingsRef.current, controller.signal, SKIN_BASE)
      .then((transport) => {
        if (controller.signal.aborted || target !== chartRef.current) {
          transport.dispose();
          return null;
        }
        transport.setFirstOffset(firstOffsetRef.current);
        transport.move(previewTimeRef.current);
        transportRef.current = transport;
        setDuration(transport.duration);
        // 波形只要音乐的包络，和播放状态无关：解码完就在主线程空闲前算好（约 10–20ms）
        // 波形包络和频谱颜色都是给时间轴用的；不显示分析就不必算
        if (showAnalysisRef.current) {
          const data = buildWaveform(transport.song);
          if (data) setWaveform({ data, duration: transport.song.duration });
          // 颜色另算：Worker 里跑 FFT，结果晚一点到，到了波形自己会变色
          analyzeTrack(transport);
        }
        mark('majview:track-ready');
        return transport;
      })
      .catch(() => {
        if (trackRef.current?.controller === controller) trackRef.current = null;
        return null;
      });
    trackRef.current = { chart: target, controller, promise };
    return promise;
  }, [trackUrl, analyzeTrack]);

  /** 谱面出来后再等浏览器空闲才准备音乐：先保证画面，别让 2MB 音频和皮肤/谱面抢带宽 */
  const scheduleTrack = useCallback((target: Chart) => {
    const run = () => {
      if (chartRef.current === target) void prepareTrack(target);
    };
    if (typeof window.requestIdleCallback === 'function') window.requestIdleCallback(run, { timeout: 2500 });
    else setTimeout(run, 400);
  }, [prepareTrack]);

  // 换谱面或难度时重新加载：谱面不等渲染器，拿到就开始在后台准备音乐
  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;
    cancelAnimationFrame(rafRef.current);
    dropTransport();
    chartRef.current = null;
    previewTimeRef.current = 0;
    // 上一条谱面的手势不要带到新谱面
    if (longPressRef.current !== null) clearTimeout(longPressRef.current);
    longPressRef.current = null;
    gestureRef.current = null;
    lastTapRef.current = null;
    if (seekDeltaRef.current) seekDeltaRef.current.hidden = true;
    if (valueHintRef.current) valueHintRef.current.hidden = true;
    setFastForward(false);
    setChart(null);
    setWaveform(null);
    setSpectrum(null);
    // 上一条谱面的频谱结果作废（Worker 可能还在跑）
    spectrumIdRef.current += 1;
    setPlaying(false);
    setRate(1);
    setStatus('loading');
    setError({});
    setTextError(null);
    playStartRef.current = null;
    setPlayStart(null);

    async function load() {
      try {
        mark('majview:chart-request');
        const text = chartTextRef.current ?? (chartUrl ? await loadChartText(chartUrl, signal) : '');
        if (signal.aborted) return;
        mark('majview:chart-response');
        const compiled = compileForView(text, level, allowEmptyChart);
        if (signal.aborted) return;
        mark('majview:chart-compiled');
        chartRef.current = compiled;
        previewTimeRef.current = chartStart(compiled);
        beginRef.current = previewTimeRef.current;
        setBegin(previewTimeRef.current);
        setChart(compiled);
        setDuration(chartDuration(compiled));
        // 音乐晚一点再准备：先让画面出来，别和谱面、皮肤抢带宽（点播放时会立刻准备）
        scheduleTrack(compiled);
      } catch (err) {
        if (signal.aborted) return;
        setError({ detail: (err as Error).message });
        setTextError((err as Error).message);
        setStatus('error');
      }
    }
    void load();
    return () => controller.abort();
  }, [chartUrl, level, dropTransport, prepareTrack, scheduleTrack, reloadKey, allowEmptyChart]);

  /**
   * 编辑器里每敲一下都要更新画面：只重编译并热换谱面。
   * 不重载音频、不回到开头、不动播放位置；编译失败（半句话）就保留上一版。
   */
  const hotChartRef = useRef(chartText);
  useEffect(() => {
    if (chartText === undefined || hotChartRef.current === chartText) return;
    hotChartRef.current = chartText;
    /**
     * 还没有成功编译过一版（第一版就编译失败，比如编辑器里刚敲了半句话）：
     * 这里必须能把状态救回来，否则 chartRef 一直是 null，
     * 后面再怎么改文本都会被下面的 return 挡住、永远停在错误态。
     */
    if (!chartRef.current) {
      try {
        compileForView(chartText, level, allowEmptyChart);
      } catch (err) {
        setTextError((err as Error).message);
        return; // 还是半句话，继续等下一次输入
      }
      setTextError(null);
      setReloadKey((value) => value + 1);
      return;
    }
    let compiled: Chart;
    try {
      compiled = compileForView(chartText, level, allowEmptyChart);
      setTextError(null);
    } catch (err) {
      // 画面保留上一版，但要让用户知道现在这份文本编译不过
      setTextError((err as Error).message);
      return;
    }
    chartRef.current = compiled;
    setChart(compiled);
    // 没有音频时总长由谱面决定；有音频时以 Transport 的时长为准，不要改小
    if (!transportRef.current) setDuration(chartDuration(compiled));
  }, [chartText, level, allowEmptyChart]);

  // 和渲染器里的 combo 计数用同一份时间表：第 n 个元素结束时 combo 变成 n
  const scores = useMemo(() => chart ? scoreTimeline(chart.notes) as { time: number }[] : [], [chart]);

  // 进度条上方的谱面密度：按 Seek 条的范围切 64 根柱，和 MajdataPlay 的 ChartAnalyzer 一致
  const analyzer = useMemo(
    () => (showAnalyzer && chart && duration > begin ? analyzeChart(chart.notes, duration - begin, begin) : null),
    [showAnalyzer, chart, duration, begin],
  );

  useEffect(() => {
    onMarkRange?.(chart ? { length: duration - begin, maxCombo: scores.length } : null);
  }, [chart, duration, begin, scores, onMarkRange]);
  useEffect(() => () => onMarkRange?.(null), [onMarkRange]);

  const handledJump = useRef<number | null>(null);
  useEffect(() => {
    if (!jump || !chart || handledJump.current === jump.key) return;
    let time: number;
    if (jump.kind === 'time') time = beginRef.current + jump.value;
    else {
      const entry = scores[jump.value - 1];
      if (!entry) return;
      // 稍微过一点，画面上 combo 正好显示成这个数；谱面时间要换回媒体时间
      time = entry.time + firstOffsetRef.current + 0.001;
    }
    handledJump.current = jump.key;
    previewTimeRef.current = time;
    transportRef.current?.move(time);
    syncVideo(true);
    frame();
  }, [jump, chart, scores, syncVideo, frame]);

  useEffect(() => {
    const transport = transportRef.current;
    if (active || !transport?.playing) return;
    transport.pause();
    setPlaying(false);
    syncVideo(true);
  }, [active, syncVideo]);

  // preload="none" 不会自己开始下载：挂上 src 后必须主动 load() 一次，
  // 否则 readyState 一直是 0，syncVideo() 永远等不到可播放的视频
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !attachVideo) return;
    video.load();
    // 预加载模式只下载、不试播（播放时 syncVideo 会接管）
    if (preloadVideo) return;
    const started = video.play();
    if (started) started.catch(() => { /* 还没解码完也没关系，syncVideo 会接着播 */ });
  }, [attachVideo, videoUrl, preloadVideo]);

  // 谱面和渲染器都好了才画出来
  useEffect(() => {
    if (!boardReady || !chart) return;
    boardRef.current?.setChart(chart, settingsRef.current);
    setStatus('ready');
    frame();
  }, [boardReady, chart, frame]);

  // 诊断：渲染器建好后打开逐帧计时，并把采集器挂到 window 方便外部读取
  useEffect(() => {
    if (!perf) return;
    boardRef.current?.setProfiling(boardReady);
  }, [perf, boardReady]);
  // 诊断：记录渲染后端 / GPU / 画布尺寸，用来区分“代码问题”和“机器/浏览器问题”
  useEffect(() => {
    if (!perf || !boardReady) return;
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const board = boardRef.current as any;
    const canvas = board?.app?.canvas as HTMLCanvasElement | undefined;
    const gl = (canvas?.getContext('webgl2') ?? canvas?.getContext('webgl')) as WebGLRenderingContext | null;
    const debug = gl?.getExtension('WEBGL_debug_renderer_info');
    perf.setScene({
      renderer: board?.app?.renderer?.name ?? null,
      gpu: debug && gl ? String(gl.getParameter(debug.UNMASKED_RENDERER_WEBGL)) : null,
      dpr: window.devicePixelRatio,
      canvas: canvas ? `${canvas.width}x${canvas.height}` : null,
      cores: navigator.hardwareConcurrency,
      memory: (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? null,
    });
    /* eslint-enable @typescript-eslint/no-explicit-any */
  }, [perf, boardReady]);
  useEffect(() => {
    if (!perf) return;
    const target = globalThis as { __majviewPerf?: unknown };
    target.__majviewPerf = perf;
    return () => {
      delete target.__majviewPerf;
    };
  }, [perf]);
  // 诊断：暴露 transport / board，便于在控制台里核对“画面时间”和音频 DSP 时间的关系
  useEffect(() => {
    if (!perf) return;
    const target = globalThis as {
      __majviewDebug?: {
        transport: Transport | null;
        board: Board | null;
        chart: Chart | null;
        firstOffset: number;
        controlsShown: boolean;
      };
    };
    target.__majviewDebug = {
      get transport() { return transportRef.current; },
      get board() { return boardRef.current; },
      get chart() { return chartRef.current; },
      get firstOffset() { return firstOffsetRef.current; },
      get controlsShown() { return controlsShownRef.current; },
    };
    return () => {
      delete target.__majviewDebug;
    };
  }, [perf]);

  // 系统媒体控件：锁屏 / 控制中心 / 通知栏的播放、暂停、拖动、快进快退都接到这里。时间按界面上显示的算（减掉 begin）
  const media = useMediaSession({
    title,
    artist,
    artwork: cover,
    playing,
    duration: Math.max(0, duration - beginRef.current),
    rate,
    getTime: () => (transportRef.current?.time ?? previewTimeRef.current) - beginRef.current,
    onPlay: () => { if (!transportRef.current?.playing) void togglePlay(); },
    onPause: () => { if (transportRef.current?.playing) void togglePlay(); },
    onSeek: (time) => seek(beginRef.current + time),
  });

  const togglePlay = async () => {
    const current = transportRef.current;
    if (current?.playing) {
      current.pause();
      setPlaying(false);
      syncVideo(true);
      frame();
      return;
    }
    const target = chartRef.current;
    if (status === 'buffering' || !target) return;
    // 在点击里创建 / 恢复 AudioContext，iOS 才允许出声
    preferPlaybackSession();
    // 系统媒体控件靠一段静音 <audio> 激活，它的第一次播放也要在点击里
    media.prime();
    let context = contextRef.current;
    // iOS 切到后台再回来，跑过的 AudioContext 会卡住：resume() 一直不返回，或者报 running 但时钟不走，
    // 播放、暂停、拖动都像没反应。这时在这次点击里换一个新的，解码好的音频直接带过去
    if (context && contextRanRef.current && (context.state !== 'running' || backgroundedRef.current)) {
      const at = transportRef.current?.time;
      if (at !== undefined) previewTimeRef.current = at;
      dropTransport();
      const fresh = new AudioContext({ latencyHint: 'interactive' });
      adoptDecoded(context, fresh);
      void context.close().catch(() => {});
      context = fresh;
      contextRanRef.current = false;
    }
    backgroundedRef.current = false;
    context ??= new AudioContext({ latencyHint: 'interactive' });
    contextRef.current = context;
    const resumed = context.resume();
    // 真正要点播放了，才去拉背景 PV
    setVideoArmed(true);
    const video = videoRef.current;
    if (video?.getAttribute('src') && !video.error) video.play().then(() => video.pause()).catch(() => {});
    let transport = transportRef.current;
    if (!transport) {
      // 后台还没准备完（或者上次失败了）：等它好，期间显示“正在加载音乐”
      setError({});
      setStatus('buffering');
      transport = await prepareTrack(target);
      if (target !== chartRef.current) return;
      if (!transport) {
        // 保持可以播放，提示用户再点一次重试
        setError({ track: true });
        setStatus('ready');
        return;
      }
      setStatus('ready');
    }
    // resume() 在 iOS 上偶尔永远不返回，最多等一秒，别让播放按钮卡死
    await Promise.race([resumed.catch(() => {}), new Promise((done) => setTimeout(done, 1000))]);
    if (context.state === 'running') contextRanRef.current = true;
    if (transport !== transportRef.current) return;
    if (transport.time >= transport.duration) transport.move(transport.begin);
    transport.start();
    setPlaying(true);
    syncVideo(true);
    frame();
  };

  const seek = (value: number) => {
    previewTimeRef.current = value;
    transportRef.current?.move(value);
    syncVideo(true);
    frame();
    media.syncPosition();
  };

  /**
   * 编辑器里光标换了行 → 直接跳到那一刻。
   * seek 每次渲染都会重建，用 ref 拿最新的，避免把它塞进依赖里。
   */
  const seekRef = useRef(seek);
  seekRef.current = seek;
  const handledSeekTo = useRef<number | null>(null);
  useEffect(() => {
    if (!seekTo || handledSeekTo.current === seekTo.key) return;
    if (!chartRef.current) return;
    handledSeekTo.current = seekTo.key;
    seekRef.current(Math.max(beginRef.current, seekTo.seconds));
  }, [seekTo]);

  /** 停止：先暂停再回开头（编辑器自己的 ■ 按钮用） */
  const stopAndRewind = () => {
    transportRef.current?.pause();
    setPlaying(false);
    seek(begin);
  };

  // 编辑器的 ▶ / ■ 通过 command 发进来；同样用 ref 拿最新的函数
  const togglePlayRef = useRef(togglePlay);
  togglePlayRef.current = togglePlay;
  const stopRef = useRef(stopAndRewind);
  stopRef.current = stopAndRewind;
  const handledCommand = useRef<number | null>(null);
  useEffect(() => {
    if (!command || handledCommand.current === command.key) return;
    handledCommand.current = command.key;
    if (command.type === 'playPause') void togglePlayRef.current();
    else stopRef.current();
  }, [command]);

  // 把播放状态报给页面，页面据此切换 ▶ / ⏸
  useEffect(() => {
    onPlayingChange?.(playing);
  }, [playing, onPlayingChange]);

  const changeRate = (value: number) => {
    setRate(value);
    const transport = transportRef.current;
    if (transport) transport.move(transport.time, value);
    syncVideo(true);
    frame();
  };

  // 编辑器里的倍速下拉框（受控）：外部传入的值变化时套用一次
  const changeRateRef = useRef(changeRate);
  changeRateRef.current = changeRate;
  const appliedRateRef = useRef<number | null>(null);
  useEffect(() => {
    if (rateProp == null || appliedRateRef.current === rateProp) return;
    appliedRateRef.current = rateProp;
    changeRateRef.current(rateProp);
  }, [rateProp]);

  const changeSettings = (patch: Partial<ViewSettings>) => {
    const previous = settingsRef.current;
    const next = { ...previous, ...patch };
    settingsRef.current = next;
    setSettings(next);
    saveSettings(next);
    transportRef.current?.setSettings(next);
    transportRef.current?.setFirstOffset(next.FirstOffset / 1000);
    const board = boardRef.current;
    const chart = chartRef.current;
    if (board && chart) {
      // 流速变了要重新算每个音符出现的时间；其他设置下一帧直接生效
      if (next.NoteSpeed !== previous.NoteSpeed || next.TouchSpeed !== previous.TouchSpeed) board.setChart(chart, next);
      else board.settings = next;
    }
    frame();
  };

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await rootRef.current?.requestFullscreen();
    } catch { /* 有的浏览器不支持全屏 */ }
  };

  // 还没下载音乐时，选的速度在第一次播放时生效
  useEffect(() => {
    const transport = transportRef.current;
    if (transport && transport.rate !== rate) transport.move(transport.time, rate);
  }, [rate, status]);

  // 手指离开判定盘时不一定会收到 pointerup（页面滚动、来电等），卸载时把定时器清掉
  useEffect(() => () => {
    if (longPressRef.current !== null) clearTimeout(longPressRef.current);
    if (controlsTimerRef.current !== null) clearTimeout(controlsTimerRef.current);
    if (clickTimerRef.current !== null) clearTimeout(clickTimerRef.current);
    if (valueHintTimerRef.current !== null) clearTimeout(valueHintTimerRef.current);
    if (seekHintTimerRef.current !== null) clearTimeout(seekHintTimerRef.current);
  }, []);

  // iOS 上长按偶尔还是会走进文本选择或上下文菜单，除了 CSS 再兜一层底
  useEffect(() => {
    // 挂在整个播放器上（不只是判定盘）：手势经常从判定盘边上的物量、连击、时间文字开始；输入框除外
    const root = rootRef.current;
    if (!root) return;
    const prevent = (e: Event) => {
      // selectstart 的 target 可能是文字节点，取它的父元素
      const target = e.target instanceof Element ? e.target : (e.target as Node | null)?.parentElement;
      if (target?.closest('input, textarea')) return;
      e.preventDefault();
    };
    const events = ['selectstart', 'contextmenu', 'dragstart'];
    for (const name of events) root.addEventListener(name, prevent);
    return () => {
      for (const name of events) root.removeEventListener(name, prevent);
    };
  }, []);

  const gesturesEnabled = settings.Gestures;
  const canControl = status === 'ready' || status === 'buffering';

  const hideSeekHint = () => {
    if (seekDeltaRef.current) seekDeltaRef.current.hidden = true;
  };

  /** 时间类操作：时间本身在控制条上跟着走，这里只在它右边补一个 ± 偏移 */
  const showSeekHint = (target: number, start: number, autoHide = false) => {
    const el = seekDeltaRef.current;
    if (!el) return;
    el.hidden = false;
    if (seekHintTimerRef.current !== null) clearTimeout(seekHintTimerRef.current);
    // 键盘点按没有“松手”这一刻，用定时器自己收起来
    seekHintTimerRef.current = autoHide
      ? setTimeout(() => { seekHintTimerRef.current = null; hideSeekHint(); }, 900)
      : null;
    const delta = target - start;
    el.textContent = `${delta >= 0 ? '+' : '-'}${formatClock(Math.abs(delta))}`;
  };

  /** 拖动音量 / 亮度时显示的胶囊 */
  const showValueHint = (label: string, percent: number, autoHide = false) => {
    const hint = valueHintRef.current;
    if (!hint) return;
    hint.hidden = false;
    if (valueHintTimerRef.current !== null) clearTimeout(valueHintTimerRef.current);
    // 键盘调音量没有“松手”这一刻，用定时器自己收起来
    valueHintTimerRef.current = autoHide
      ? setTimeout(() => { valueHintTimerRef.current = null; hideValueHint(); }, 900)
      : null;
    if (valueHintLabelRef.current) valueHintLabelRef.current.textContent = label;
    if (valueHintValueRef.current) valueHintValueRef.current.textContent = `${Math.round(percent)}%`;
  };

  const hideValueHint = () => {
    if (valueHintRef.current) valueHintRef.current.hidden = true;
  };

  const clearLongPress = () => {
    if (longPressRef.current !== null) clearTimeout(longPressRef.current);
    longPressRef.current = null;
  };

  // 长按的 2 倍速不写进设置，松手就恢复成原来选的倍速
  const restoreSpeed = () => {
    const transport = transportRef.current;
    if (transport) transport.move(transport.time, rateRef.current);
    setFastForward(false);
  };

  /** 开始快放；暂停时没什么可加速的，返回 false */
  const startFastForward = () => {
    const transport = transportRef.current;
    if (!transport?.playing) return false;
    transport.move(transport.time, KEY_FAST_RATE);
    setFastForward(true);
    return true;
  };

  /** 拖动过程中只改内存里的设置：不写 localStorage、不触发 React 重渲染，松手时才落盘 */
  const applyLive = (patch: Partial<ViewSettings>) => {
    const next = { ...settingsRef.current, ...patch };
    settingsRef.current = next;
    // 音量当场生效（改增益），亮度当场改压暗层的透明度
    transportRef.current?.setSettings(next);
    if (patch.BGCover != null && shadeRef.current) shadeRef.current.style.opacity = String(next.BGCover / 10);
    if (boardRef.current) boardRef.current.settings = next;
    frame();
  };

  /** 键盘跳转：先弹一下提示再动，暂停步进时能看清走到哪了 */
  const seekBy = (delta: number) => {
    const from = currentTime();
    const target = Math.max(beginRef.current, Math.min(durationRef.current || from, from + delta));
    showSeekHint(target, from, true);
    seek(target);
  };

  /** 全屏时控制条自动隐藏：动一下鼠标 / 点一下画面就重新出现，2.5 秒后收起 */
  const pokeControls = useCallback(() => {
    if (!document.fullscreenElement) return;
    setControlsShown(true);
    if (controlsTimerRef.current !== null) clearTimeout(controlsTimerRef.current);
    controlsTimerRef.current = setTimeout(() => {
      controlsTimerRef.current = null;
      setControlsShown(false);
    }, 2500);
  }, []);

  /** 鼠标动一下 / 点一下叫出控制条；触屏不在这里处理（单击判定盘切换显示，按控制条上的按钮会重新计时） */
  const pokeByMouse = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'touch') pokeControls();
  };

  /** 全屏时触屏单击：控制条在就收起，不在就叫出来（之后照样 2.5 秒自动收起） */
  const toggleControls = () => {
    if (!controlsShownRef.current) {
      pokeControls();
      return;
    }
    if (controlsTimerRef.current !== null) {
      clearTimeout(controlsTimerRef.current);
      controlsTimerRef.current = null;
    }
    setControlsShown(false);
  };

  /** 键盘上下键：总音量 ±0.1 */
  const volumeStep = (delta: number) => {
    const next = Math.round(clamp(settingsRef.current.Master + delta, 0, 2) * 10) / 10;
    changeSettings({ Master: next });
    showValueHint(t('song/MajView.SettingMaster'), next * 100, true);
  };

  /**
   * 空格的动作：没在播 → 从当前位置开始播，并记下这个起点；
   * 正在播 → 不暂停，而是跳回起点并停下（时间轴底部用红三角标出起点）。
   */
  const playOrRewind = () => {
    const transport = transportRef.current;
    if (transport?.playing) {
      transport.pause();
      setPlaying(false);
      const start = playStartRef.current;
      if (start !== null) seek(start);
      return;
    }
    playStartRef.current = transportRef.current?.time ?? previewTimeRef.current;
    setPlayStart(playStartRef.current);
    return togglePlay();
  };

  // 键盘和定时器里用到的操作放到 ref，避免事件监听器每次渲染都重新绑定
  const actionsRef = useRef({ togglePlay, playOrRewind, seekBy, restoreSpeed, startFastForward, volumeStep, pokeControls });
  actionsRef.current = { togglePlay, playOrRewind, seekBy, restoreSpeed, startFastForward, volumeStep, pokeControls };

  // 全屏时控制条自动隐藏：动一下鼠标 / 点一下画面就重新出现
  useEffect(() => {
    const onFullscreenChange = () => {
      if (controlsTimerRef.current !== null) {
        clearTimeout(controlsTimerRef.current);
        controlsTimerRef.current = null;
      }
      setControlsShown(true);
      if (document.fullscreenElement) pokeControls();
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, [pokeControls]);

  const handlePointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!gesturesEnabled || !canControl || gestureRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const gesture: BoardGesture = {
      id: e.pointerId,
      pointerType: e.pointerType,
      x: e.clientX,
      y: e.clientY,
      left: rect.left,
      width: rect.width,
      moved: false,
      mode: null,
      longPressed: false,
      spedUp: false,
      startTime: currentTime(),
      target: 0,
      wasPlaying: false,
      startVolume: settingsRef.current.Master,
      startCover: settingsRef.current.BGCover,
    };
    gestureRef.current = gesture;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch { /* 指针已经抬起时部分浏览器会抛错 */ }
    // 长按快放只给触摸：鼠标长按要留给系统的选择 / 右键行为
    if (e.pointerType !== 'touch') return;
    clearLongPress();
    longPressRef.current = setTimeout(() => {
      longPressRef.current = null;
      if (gestureRef.current !== gesture || gesture.moved) return;
      gesture.longPressed = true;
      // 暂停时按住不加速，但这一下仍然算长按，松手不会被当成点按
      if (startFastForward()) gesture.spedUp = true;
    }, LONG_PRESS_MS);
  };

  const handlePointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const gesture = gestureRef.current;
    if (!gesture || e.pointerId !== gesture.id) return;
    const dx = e.clientX - gesture.x;
    const dy = e.clientY - gesture.y;
    // 已经在快放：手指挪动不再切换成拖动
    if (gesture.longPressed) return;
    if (!gesture.mode) {
      if (Math.hypot(dx, dy) <= TAP_SLOP_PX) return;
      gesture.moved = true;
      clearLongPress();
      if (Math.abs(dx) >= SCRUB_SLOP_PX && Math.abs(dx) > Math.abs(dy)) {
        gesture.mode = 'seek';
        // 拖动时先暂停：音频一边播一边被反复 seek 会一直卡
        gesture.wasPlaying = Boolean(transportRef.current?.playing);
        if (gesture.wasPlaying) {
          transportRef.current?.pause();
          setPlaying(false);
        }
      } else if (Math.abs(dy) >= VERTICAL_SLOP_PX) {
        // 竖向：判定盘右半边调音量，左半边调亮度
        gesture.mode = gesture.x - gesture.left < gesture.width / 2 ? 'brightness' : 'volume';
      } else return;
    }
    if (gesture.mode === 'seek') {
      gesture.target = seekTarget(gesture.startTime, dx, gesture.width, beginRef.current, durationRef.current);
      // 立刻跟手：画面、进度条、背景 PV 都跟着手指走
      previewTimeRef.current = gesture.target;
      transportRef.current?.move(gesture.target);
      syncVideo();
      frame();
      showSeekHint(gesture.target, gesture.startTime);
      return;
    }
    if (gesture.mode === 'volume') {
      // 往上拖变大；1.0 是原始音量，所以百分比按 value×100 显示（最大 200%）
      const value = clamp(gesture.startVolume - dy / VOLUME_DRAG_PX, 0, 2);
      applyLive({ Master: Math.round(value * 10) / 10 });
      showValueHint(t('song/MajView.SettingMaster'), value * 100);
      return;
    }
    // 往上拖变亮：BGCover 是“暗度”，所以要加 dy（向上是负数）
    const cover = clamp(gesture.startCover + (dy / BRIGHT_DRAG_PX) * 10, 0, 10);
    applyLive({ BGCover: Math.round(cover) });
    showValueHint(t('song/MajView.SettingBGCover'), cover * 10);
  };

  const finishGesture = (e: ReactPointerEvent<HTMLDivElement>, cancelled: boolean) => {
    const gesture = gestureRef.current;
    if (!gesture || e.pointerId !== gesture.id) return;
    gestureRef.current = null;
    clearLongPress();
    hideSeekHint();
    hideValueHint();
    if (gesture.spedUp) restoreSpeed();
    // 音量和亮度拖动时只改了内存值，松手才写进设置
    if (gesture.mode === 'volume') changeSettings({ Master: settingsRef.current.Master });
    else if (gesture.mode === 'brightness') changeSettings({ BGCover: settingsRef.current.BGCover });
    if (gesture.mode === 'seek') {
      // 画面在拖动时就跟着手指走了，这里只要落定位置，并按原来的状态决定要不要接着播
      seek(gesture.target);
      if (gesture.wasPlaying) void togglePlay();
      return;
    }
    if (cancelled) return;
    if (gesture.moved || gesture.longPressed) return;
    if (gesture.pointerType !== 'touch') {
      // 鼠标：单击播放/暂停，双击切全屏。单击要等一小会儿，确认不是双击再执行
      if (clickTimerRef.current !== null) {
        clearTimeout(clickTimerRef.current);
        clickTimerRef.current = null;
        void toggleFullscreen();
        return;
      }
      clickTimerRef.current = setTimeout(() => {
        clickTimerRef.current = null;
        void togglePlay();
      }, DOUBLE_TAP_MS);
      return;
    }
    // 触摸：双击播放/暂停。全屏时单击切换控制条（点一下出来，再点一下收起）；
    // 单击要等一小会儿，确认不是双击的第一下再切，免得双击时控制条闪一下
    const now = performance.now();
    const last = lastTapRef.current;
    if (last && now - last.at <= DOUBLE_TAP_MS
      && Math.hypot(gesture.x - last.x, gesture.y - last.y) <= DOUBLE_TAP_SLOP_PX) {
      lastTapRef.current = null;
      if (clickTimerRef.current !== null) {
        clearTimeout(clickTimerRef.current);
        clickTimerRef.current = null;
      }
      void togglePlay();
    } else {
      lastTapRef.current = { at: now, x: gesture.x, y: gesture.y };
      if (document.fullscreenElement) {
        if (clickTimerRef.current !== null) clearTimeout(clickTimerRef.current);
        clickTimerRef.current = setTimeout(() => {
          clickTimerRef.current = null;
          toggleControls();
        }, DOUBLE_TAP_MS);
      }
    }
  };

  const handlePointerUp = (e: ReactPointerEvent<HTMLDivElement>) => finishGesture(e, false);
  const handlePointerCancel = (e: ReactPointerEvent<HTMLDivElement>) => finishGesture(e, true);

  // 隐藏音符：交给渲染器，它一帧内自己判断
  useEffect(() => {
    if (boardRef.current) boardRef.current.hideNotes = notesHidden;
    frame();
  }, [notesHidden, frame]);

  // 桌面快捷键：空格播放/暂停；左右键快进快退（暂停时按 0.01 秒步进）；长按右箭头 2 倍速
  useEffect(() => {
    if (!gesturesEnabled) return;
    const isTyping = (target: EventTarget | null) => {
      const node = target as HTMLElement | null;
      return !!node && (node.tagName === 'INPUT' || node.tagName === 'TEXTAREA' || node.tagName === 'SELECT' || node.isContentEditable === true);
    };
    /** 事件来自代码编辑器：除了空格，其它键都让 Monaco 自己处理（否则 Ctrl+方向键会被逐帧步进吃掉） */
    const fromEditor = (target: EventTarget | null) => {
      const node = target as HTMLElement | null;
      return !!node?.closest?.('.editor-code');
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || isTyping(event.target)) return;
      const actions = actionsRef.current;
      actions.pokeControls();
      if (event.code === 'Space') {
        // Ctrl+空格：原来的播放/暂停；Shift+空格：正常输入空格，交给编辑器
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault();
          void actions.togglePlay();
          return;
        }
        if (event.shiftKey) return;
        event.preventDefault();
        void actions.playOrRewind();
        return;
      }
      if (fromEditor(event.target)) return;
      // 上下键调总音量（0.1 一格）
      if (event.code === 'ArrowUp' || event.code === 'ArrowDown') {
        event.preventDefault();
        actions.volumeStep(event.code === 'ArrowUp' ? 0.1 : -0.1);
        return;
      }
      if (event.code !== 'ArrowLeft' && event.code !== 'ArrowRight') return;
      const transport = transportRef.current;
      if (!transport) return;
      event.preventDefault();
      const dir = event.code === 'ArrowRight' ? 1 : -1;
      // 暂停时按 0.01 秒步进，方便逐帧对位；按住可以连续步进
      if (!transport.playing) {
        actions.seekBy(dir * ARROW_STEP_SEC);
        return;
      }
      if (event.repeat) return;
      // 播放中：先不跳，按住右箭头会走快放；真的快进放在 keyup，
      // 这样长按快放就不会先触发一次 5 秒跳转
      if (event.code !== 'ArrowRight') return;
      if (arrowHoldRef.current !== null) clearTimeout(arrowHoldRef.current);
      arrowHoldRef.current = setTimeout(() => {
        arrowHoldRef.current = null;
        if (actions.startFastForward()) arrowFastRef.current = true;
      }, LONG_PRESS_MS);
    };
    const onKeyUp = (event: KeyboardEvent) => {
      if (event.code !== 'ArrowLeft' && event.code !== 'ArrowRight') return;
      if (event.code === 'ArrowRight' && arrowHoldRef.current !== null) {
        clearTimeout(arrowHoldRef.current);
        arrowHoldRef.current = null;
      }
      // 长按快放已经生效过：这次松手不再快进
      if (arrowFastRef.current) {
        arrowFastRef.current = false;
        actionsRef.current.restoreSpeed();
        return;
      }
      const transport = transportRef.current;
      // 暂停时是 keydown 的 0.01 秒步进，这里不重复处理
      if (!transport?.playing) return;
      actionsRef.current.seekBy((event.code === 'ArrowRight' ? 1 : -1) * ARROW_SEEK_SEC);
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      if (arrowHoldRef.current !== null) clearTimeout(arrowHoldRef.current);
      arrowHoldRef.current = null;
      if (arrowFastRef.current) {
        arrowFastRef.current = false;
        actionsRef.current.restoreSpeed();
      }
    };
  }, [gesturesEnabled]);

  const controlClass = 'grid place-items-center hover:bg-white/10 rounded-lg w-9 h-9 text-white/85 hover:text-white transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-default';

  /**
   * 播放控制条（谱面密度 / 时间轴 / 进度 / 按钮）。
   * 默认画在播放器里；编辑器要把它放到自己的格子时传 controlsHost，用 portal 挂过去——
   * 逻辑和 ref 都还属于这个组件，只是换了挂载点。
   */
  /** 时间轴拖动：左右拖动改播放位置，同时把时间报给页面去挪文本光标 */
  const timelineBoxRef = useRef<HTMLDivElement>(null);
  const scrubRef = useRef<{ startX: number; startTime: number; secondsPerPixel: number } | null>(null);
  const onScrubRef = useRef(onTimelineScrub);
  onScrubRef.current = onTimelineScrub;
  const onScrubEndRef = useRef(onTimelineScrubEnd);
  onScrubEndRef.current = onTimelineScrubEnd;

  const onTimelinePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    // 缩放按钮在时间轴里，别把它们当拖动
    if ((event.target as HTMLElement).closest('.majview-zoom')) return;
    const box = timelineBoxRef.current;
    const width = box?.clientWidth ?? 0;
    if (!(width > 0)) return;
    scrubRef.current = {
      startX: event.clientX,
      startTime: transportRef.current?.time ?? previewTimeRef.current,
      // 中线两侧各 timelineZoom 秒，整条宽度就是 2×timelineZoom 秒
      secondsPerPixel: (2 * timelineZoom) / width,
    };
    transportRef.current?.pause();
    setPlaying(false);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onTimelinePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const scrub = scrubRef.current;
    if (!scrub) return;
    const target = scrub.startTime - (event.clientX - scrub.startX) * scrub.secondsPerPixel;
    const seconds = Math.max(beginRef.current, Math.min(target, durationRef.current || target));
    seek(seconds);
    onScrubRef.current?.(seconds);
  };

  const onTimelinePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!scrubRef.current) return;
    scrubRef.current = null;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    onScrubEndRef.current?.();
  };

  /** 波形时间轴：单独一块，可以挂到编辑器自己的格子里 */
  const timelineNode = (
    <div
      className="majview-timeline"
      ref={timelineBoxRef}
      onPointerDown={onTimelinePointerDown}
      onPointerMove={onTimelinePointerMove}
      onPointerUp={onTimelinePointerUp}
      onPointerCancel={onTimelinePointerUp}
    >
      <MajViewVisualizer
        ref={visualizerRef}
        chart={chart}
        waveform={waveform?.data ?? null}
        waveformDuration={waveform?.duration ?? 0}
        analysis={spectrum}
        offset={settings.FirstOffset / 1000}
        zoom={timelineZoom}
        caretTime={caretTime}
        startMark={playStart}
      />
      {/* 时间轴缩放：数字是「中线两侧各显示多少秒」，所以 + 是缩小窗口（放大内容） */}
      <div className="majview-zoom">
        <button type="button" onClick={() => zoomTimeline(-0.5)} aria-label={t('song/MajView.ZoomIn')}>
          <LuPlus aria-hidden="true" />
        </button>
        <button type="button" onClick={() => zoomTimeline(0.5)} aria-label={t('song/MajView.ZoomOut')}>
          <LuMinus aria-hidden="true" />
        </button>
      </div>
    </div>
  );

  const controlsNode = (
    <div className="majview-controls" data-hidden={!controlsShown} onPointerDown={pokeControls}>
      {showAnalyzer && analyzer && analyzer.max > 0 && <MajViewAnalyzer bars={analyzer.bars} />}
      {showTimeline && timelineNode}
      <input
        ref={timelineRef}
        type="range"
        min={begin}
        max={duration || 1}
        step={0.001}
        defaultValue={begin}
        disabled={!canControl}
        onChange={(e) => seek(Number(e.target.value))}
        aria-label={t('song/MajView.Position')}
        className="w-full accent-sky-300"
      />
      <div className="flex items-center gap-1">
        <button type="button" className={controlClass} onClick={togglePlay} disabled={status !== 'ready'} aria-label={playing ? t('song/MajView.Pause') : t('song/MajView.Play')}>
          {playing ? <LuPause aria-hidden="true" className="w-4.5 h-4.5" /> : <LuPlay aria-hidden="true" className="w-4.5 h-4.5" />}
        </button>
        <button type="button" className={controlClass} onClick={() => seek(begin)} disabled={!canControl} aria-label={t('song/MajView.Restart')}>
          <LuRotateCcw aria-hidden="true" className="w-4 h-4" />
        </button>
        <span className="flex-1 px-1 text-white/70 text-xs tabular-nums">
          <span ref={clockRef}>{formatClock(currentTime() - begin)}</span> / {formatClock(duration - begin)}
          <span ref={seekDeltaRef} className="majview-seek-delta" hidden />
        </span>
        <SortMenu
          compact
          icon={null}
          placement="up"
          options={RATES.map((value) => `${value}×`)}
          value={RATES.indexOf(fastForward ? KEY_FAST_RATE : rate)}
          onChange={(index) => changeRate(RATES[index])}
          label={t('song/MajView.Speed')}
          disabled={!canControl}
        />
        <button type="button" className={controlClass} onClick={() => setSettingsOpen((open) => !open)} aria-expanded={settingsOpen} aria-label={t('song/MajView.Settings')}>
          <LuSettings2 aria-hidden="true" className="w-4 h-4" />
        </button>
        {CAN_FULLSCREEN && (
          <button type="button" className={controlClass} onClick={toggleFullscreen} aria-label={t('song/MajView.Fullscreen')}>
            <LuMaximize aria-hidden="true" className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );

  const settingsNode = (
    <MajViewSettings
      settings={settings}
      onChange={changeSettings}
      onClose={() => setSettingsOpen(false)}
      hideHeader={Boolean(settingsHost)}
    />
  );

  return (
    <div ref={rootRef} className="majview" onPointerMove={pokeByMouse} onPointerDown={pokeByMouse}>
      <img className="majview-backdrop" src={cover} alt="" crossOrigin="anonymous" />
      {/* 性能信息覆盖层：设置里打开（或 ?perf=1）后出现 */}
      {perf && <div ref={perfRef} className="majview-perf" aria-hidden="true" />}
      {/* 判定盘所在的区域：比判定盘宽时（桌面），物量贴着这块区域的左边缘，放在判定盘外面的空位里 */}
      <div className="majview-stage">
      {/* 物量分在左上、左下两个角：左上是总数和两种达成率，左下是各类音符已打 / 总数。
          渲染器按播放位置直接改文字 */}
      <div ref={summaryRef} className="majview-counter majview-counter-top" hidden={!chart || !settings.Counter} aria-hidden="true" />
      <div ref={counterRef} className="majview-counter majview-counter-bottom" hidden={!chart || !settings.Counter} aria-hidden="true" />
      <div
        ref={sceneRef}
        className="majview-scene"
        // 开着手势时竖向留给音量/亮度，关掉后才把竖直滚动还给页面
        style={{ touchAction: gesturesEnabled ? 'none' : 'pan-y' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
      >
        <div className="majview-background">
          <img src={showJudge ? DEFAULT_BACKGROUND : cover} alt="" crossOrigin="anonymous" onError={onCoverError} />
          {!showJudge && (
            <video
              ref={videoRef}
              src={attachVideo ? videoUrl : undefined}
              muted
              playsInline
              preload={preloadVideo ? 'auto' : 'none'}
              className={videoVisible ? 'visible' : undefined}
              onLoadedData={() => { setVideoVisible(true); syncVideo(true); }}
              onError={() => setVideoVisible(false)}
            />
          )}
          <div ref={shadeRef} className="majview-shade" style={{ opacity: settings.BGCover / 10 }} />
        </div>
        <div ref={comboRef} className="majview-combo" hidden>
          <span>COMBO</span>
          <strong ref={comboValueRef} />
        </div>
        <div ref={boardHostRef} className="majview-board" />
        {(status !== 'ready' || error.track) && (
          <div className="majview-message" role="status">
            {error.track ? t('song/MajView.TrackFailed') : status === 'error'
              ? `${t('song/MajView.LoadFailed')} ${error.detail ?? ''}`
              : status === 'buffering' ? t('song/MajView.LoadingTrack') : t('song/MajView.Loading')}
          </div>
        )}
        {/* 编辑器里文本编译不过：画面还是上一版。页面给 onTextError 就交给页面显示 */}
        {textError && status === 'ready' && !onTextError && (
          <div className="majview-text-error" role="alert">
            {t('song/MajView.ChartInvalid')} {textError}
          </div>
        )}
        {/* 音量 / 亮度拖动时压在判定盘正中间；进度看时间读数右边的 ±，倍速看控制条 */}
        <div ref={valueHintRef} className="majview-value-hint" hidden aria-hidden="true">
          <span ref={valueHintLabelRef} />
          <strong ref={valueHintValueRef} />
        </div>
      </div>
      </div>

      {/* 编辑器关掉控制条时，时间轴单独挂到页面自己的格子里 */}
      {!showControls && showTimeline && (timelineHost ? createPortal(timelineNode, timelineHost) : timelineNode)}
      {showControls && (controlsHost ? createPortal(controlsNode, controlsHost) : controlsNode)}

      {settingsOpen && (settingsHost ? createPortal(settingsNode, settingsHost) : settingsNode)}
    </div>
  );
}
