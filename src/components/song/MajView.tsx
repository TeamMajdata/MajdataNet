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
import { useTranslation } from 'react-i18next';
import { LuMaximize, LuPause, LuPlay, LuRotateCcw, LuSettings2 } from 'react-icons/lu';
import { Board } from '@/majview/renderer.js';
import { Transport } from '@/majview/audio.js';
import { compileChart, readMaidata } from '@/majview/simai.js';
import { chartStart, scoreTimeline } from '@/majview/timeline.js';
import { DOUBLE_TAP_MS, DOUBLE_TAP_SLOP_PX, LONG_PRESS_MS, SCRUB_SLOP_PX, TAP_SLOP_PX, seekTarget } from '@/majview/gestures.js';
import { createPerf, perfForced } from '@/majview/perf.js';
import { loadChartText } from '@/majview/chartCache';
import type { ChartMark } from './chartMarks';
import { loadSettings, saveSettings, type ViewSettings } from '@/majview/settings';
import SortMenu from '@/components/ui/SortMenu';
import MajViewSettings from './MajViewSettings';
import { endpoints } from '@/config/api';
import '@/styles/components/majview.css';

const SKIN_BASE = '/majview/skin/';
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

/** 一根手指在判定盘上的手势状态：点按、长按 2 倍速、横向拖动进度都从 pointerdown 开始区分 */
type BoardGesture = {
  id: number;
  x: number;
  y: number;
  moved: boolean;
  longPressed: boolean;
  scrubbing: boolean;
  spedUp: boolean;
  /** 拖动开始时的时间：目标时间相对它算，不跟着画面走 */
  startTime: number;
  target: number;
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

export default function MajView({ songId, level, cover, onCoverError, active = true, jump, onMarkRange }: {
  songId: string;
  level: number;
  cover: string;
  onCoverError?: () => void;
  /** 页签切走时为 false：播放器保留（不用重新加载），但停止播放 */
  active?: boolean;
  /** 评论里点了时间 / combo；key 每次点击都不同，同一个位置也能再跳 */
  jump?: (ChartMark & { key: number }) | null;
  /** 告诉页面当前谱面的范围，用来判断评论里的时间 / combo 是否有效 */
  onMarkRange?: (range: { length: number; maxCombo: number } | null) => void;
}) {
  const { t } = useTranslation();
  const rootRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<HTMLDivElement>(null);
  const boardHostRef = useRef<HTMLDivElement>(null);
  const comboRef = useRef<HTMLDivElement>(null);
  const comboValueRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const timelineRef = useRef<HTMLInputElement>(null);
  const clockRef = useRef<HTMLSpanElement>(null);

  const boardRef = useRef<Board | null>(null);
  const contextRef = useRef<AudioContext | null>(null);
  const chartRef = useRef<Chart | null>(null);
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
  const [settingsOpen, setSettingsOpen] = useState(false);
  const rafRef = useRef(0);

  // 性能信息：设置里的开关（默认关闭），?perf=1 可以强制打开
  const perfOn = settings.Perf || perfForced();
  const perf = useMemo(() => (perfOn ? createPerf(`majview ${songId}#${level}`) : null), [perfOn, songId, level]);
  const perfRef = useRef<HTMLDivElement>(null);
  const perfPaintRef = useRef(0);
  const perfFirstFrameRef = useRef(false);

  // 判定盘手势：同一时间只跟踪一根手指，定时器保存长按
  const gestureRef = useRef<BoardGesture | null>(null);
  const longPressRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTapRef = useRef<{ at: number; x: number; y: number } | null>(null);
  const seekHintRef = useRef<HTMLDivElement>(null);
  const seekHintTimeRef = useRef<HTMLElement>(null);
  const seekHintDeltaRef = useRef<HTMLSpanElement>(null);
  const speedHintRef = useRef<HTMLDivElement>(null);

  const [boardReady, setBoardReady] = useState(false);
  const [chart, setChart] = useState<Chart | null>(null);
  const [status, setStatus] = useState<Status>('loading');
  // 错误只记原因，文案在渲染时翻译
  const [error, setError] = useState<{ track?: boolean; detail?: string }>({});
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  // 开头 clock 在 0 之前时，进度条从第一下 clock 开始，显示的时间和总长也把这段算进去
  const [begin, setBegin] = useState(0);
  const beginRef = useRef(0);
  const [rate, setRate] = useState(1);
  const [videoVisible, setVideoVisible] = useState(false);
  // 背景 PV 在第一次点播放前不挂 src：否则打开页面就把整段视频下下来了
  const [videoArmed, setVideoArmed] = useState(false);
  // 手势回调在两次渲染之间触发，读 ref 才能拿到当前总长和倍速
  const durationRef = useRef(0);
  const rateRef = useRef(1);
  durationRef.current = duration;
  rateRef.current = rate;

  const chartUrl = endpoints.maichart.prefix('') + songId;

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
    // 时间文字一秒才变一次，没变就不碰 DOM
    const clock = formatClock(time - beginRef.current);
    if (clockRef.current && clockRef.current.textContent !== clock) clockRef.current.textContent = clock;
    // 诊断覆盖层：5Hz 刷新，不跟着每帧写 DOM
    if (perf && perfRef.current && performance.now() - perfPaintRef.current > 200) {
      perfPaintRef.current = performance.now();
      perfRef.current.textContent = perf.overlay();
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
    Board.create(host, 'webgl', SKIN_BASE, { combo: comboRef.current, comboValue: comboValueRef.current })
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
    };
  }, [dropTransport]);

  /** 下载并解码音乐、准备音效；同一个谱面只做一次。失败时返回 null，下次点播放再试 */
  const prepareTrack = useCallback((target: Chart) => {
    if (trackRef.current?.chart === target) return trackRef.current.promise;
    trackRef.current?.controller.abort();
    // 还没有用户操作时创建的 AudioContext 处于暂停状态，但已经可以解码；点播放时再 resume
    contextRef.current ??= new AudioContext({ latencyHint: 'interactive' });
    const context = contextRef.current;
    const controller = new AbortController();
    const promise = Transport.load(context, chartUrl + '/track', target, settingsRef.current, controller.signal, SKIN_BASE)
      .then((transport) => {
        if (controller.signal.aborted || target !== chartRef.current) {
          transport.dispose();
          return null;
        }
        transport.setFirstOffset(firstOffsetRef.current);
        transport.move(previewTimeRef.current);
        transportRef.current = transport;
        setDuration(transport.duration);
        mark('majview:track-ready');
        return transport;
      })
      .catch(() => {
        if (trackRef.current?.controller === controller) trackRef.current = null;
        return null;
      });
    trackRef.current = { chart: target, controller, promise };
    return promise;
  }, [chartUrl]);

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
    if (seekHintRef.current) seekHintRef.current.hidden = true;
    if (speedHintRef.current) speedHintRef.current.hidden = true;
    setChart(null);
    setPlaying(false);
    setRate(1);
    setStatus('loading');
    setError({});

    async function load() {
      try {
        mark('majview:chart-request');
        const text = await loadChartText(chartUrl + '/chart', signal);
        if (signal.aborted) return;
        mark('majview:chart-response');
        const compiled = compileChart(readMaidata(text), level);
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
        setStatus('error');
      }
    }
    void load();
    return () => controller.abort();
  }, [chartUrl, level, dropTransport, prepareTrack, scheduleTrack]);

  // 和渲染器里的 combo 计数用同一份时间表：第 n 个元素结束时 combo 变成 n
  const scores = useMemo(() => chart ? scoreTimeline(chart.notes) as { time: number }[] : [], [chart]);

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
    if (!video || !videoArmed) return;
    video.load();
    const started = video.play();
    if (started) started.catch(() => { /* 还没解码完也没关系，syncVideo 会接着播 */ });
  }, [videoArmed, chartUrl]);

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
      };
    };
    target.__majviewDebug = {
      get transport() { return transportRef.current; },
      get board() { return boardRef.current; },
      get chart() { return chartRef.current; },
      get firstOffset() { return firstOffsetRef.current; },
    };
    return () => {
      delete target.__majviewDebug;
    };
  }, [perf]);

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
    contextRef.current ??= new AudioContext({ latencyHint: 'interactive' });
    const resumed = contextRef.current.resume();
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
    await resumed.catch(() => {});
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
  };

  const changeRate = (value: number) => {
    setRate(value);
    const transport = transportRef.current;
    if (transport) transport.move(transport.time, value);
    syncVideo(true);
    frame();
  };

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
  }, []);

  // iOS 上长按偶尔还是会走进文本选择或上下文菜单，除了 CSS 再兜一层底
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    const prevent = (e: Event) => e.preventDefault();
    const events = ['selectstart', 'contextmenu', 'dragstart'];
    for (const name of events) scene.addEventListener(name, prevent);
    return () => {
      for (const name of events) scene.removeEventListener(name, prevent);
    };
  }, []);

  const canControl = status === 'ready' || status === 'buffering';

  const hideSeekHint = () => {
    if (seekHintRef.current) seekHintRef.current.hidden = true;
  };

  const showSeekHint = (target: number, start: number) => {
    const hint = seekHintRef.current;
    if (!hint) return;
    hint.hidden = false;
    if (seekHintTimeRef.current) seekHintTimeRef.current.textContent = formatClock(target - beginRef.current);
    if (seekHintDeltaRef.current) {
      const delta = target - start;
      seekHintDeltaRef.current.textContent = `${delta >= 0 ? '+' : '-'}${formatClock(Math.abs(delta))}`;
    }
  };

  const setSpeedHint = (visible: boolean) => {
    if (speedHintRef.current) speedHintRef.current.hidden = !visible;
  };

  const clearLongPress = () => {
    if (longPressRef.current !== null) clearTimeout(longPressRef.current);
    longPressRef.current = null;
  };

  // 长按的 2 倍速不写进设置，松手就恢复成原来选的倍速
  const restoreSpeed = () => {
    const transport = transportRef.current;
    if (transport) transport.move(transport.time, rateRef.current);
    setSpeedHint(false);
  };

  const handlePointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    // 只处理触摸：鼠标的双击 / 长按不应该意外控制播放
    if (e.pointerType !== 'touch' || !canControl || gestureRef.current) return;
    const gesture: BoardGesture = {
      id: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      moved: false,
      longPressed: false,
      scrubbing: false,
      spedUp: false,
      startTime: currentTime(),
      target: 0,
    };
    gestureRef.current = gesture;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch { /* 指针已经抬起时部分浏览器会抛错 */ }
    clearLongPress();
    longPressRef.current = setTimeout(() => {
      longPressRef.current = null;
      if (gestureRef.current !== gesture || gesture.moved) return;
      gesture.longPressed = true;
      const transport = transportRef.current;
      // 暂停时按住不加速，但这一下仍然算长按，松手不会被当成点按
      if (!transport?.playing) return;
      transport.move(transport.time, 2);
      gesture.spedUp = true;
      setSpeedHint(true);
    }, LONG_PRESS_MS);
  };

  const handlePointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const gesture = gestureRef.current;
    if (!gesture || e.pointerId !== gesture.id) return;
    const dx = e.clientX - gesture.x;
    const dy = e.clientY - gesture.y;
    // 已经在 2 倍速：手指挪动不改成拖动进度
    if (gesture.longPressed) return;
    if (!gesture.moved) {
      if (Math.hypot(dx, dy) <= TAP_SLOP_PX) return;
      gesture.moved = true;
      clearLongPress();
      // 竖向移动交给页面滚动；横向要超过阈值才算拖动
      if (Math.abs(dx) < SCRUB_SLOP_PX || Math.abs(dx) <= Math.abs(dy)) return;
      gesture.scrubbing = true;
    }
    if (!gesture.scrubbing) return;
    gesture.target = seekTarget(gesture.startTime, dx, e.currentTarget.clientWidth, beginRef.current, durationRef.current);
    showSeekHint(gesture.target, gesture.startTime);
  };

  const finishGesture = (e: ReactPointerEvent<HTMLDivElement>, cancelled: boolean) => {
    const gesture = gestureRef.current;
    if (!gesture || e.pointerId !== gesture.id) return;
    gestureRef.current = null;
    clearLongPress();
    hideSeekHint();
    if (gesture.spedUp) restoreSpeed();
    if (cancelled) return;
    if (gesture.scrubbing) {
      // 拖动时只显示时间，松手才真的跳过去
      seek(gesture.target);
      return;
    }
    if (gesture.moved) return;
    if (gesture.longPressed) return;
    // 点按：300ms 内第二次点在同一片区域算双击
    const now = performance.now();
    const last = lastTapRef.current;
    if (last && now - last.at <= DOUBLE_TAP_MS
      && Math.hypot(gesture.x - last.x, gesture.y - last.y) <= DOUBLE_TAP_SLOP_PX) {
      lastTapRef.current = null;
      void togglePlay();
    } else {
      lastTapRef.current = { at: now, x: gesture.x, y: gesture.y };
    }
  };

  const handlePointerUp = (e: ReactPointerEvent<HTMLDivElement>) => finishGesture(e, false);
  const handlePointerCancel = (e: ReactPointerEvent<HTMLDivElement>) => finishGesture(e, true);

  const controlClass = 'grid place-items-center hover:bg-white/10 rounded-lg w-9 h-9 text-white/85 hover:text-white transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-default';

  return (
    <div ref={rootRef} className="majview">
      <img className="majview-backdrop" src={cover} alt="" crossOrigin="anonymous" />
      {/* 性能信息覆盖层：设置里打开（或 ?perf=1）后出现 */}
      {perf && <div ref={perfRef} className="majview-perf" aria-hidden="true">…</div>}
      <div
        ref={sceneRef}
        className="majview-scene"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
      >
        <div className="majview-background">
          <img src={cover} alt="" crossOrigin="anonymous" onError={onCoverError} />
          <video
            ref={videoRef}
            src={videoArmed ? chartUrl + '/video' : undefined}
            muted
            playsInline
            preload="none"
            className={videoVisible ? 'visible' : undefined}
            onLoadedData={() => { setVideoVisible(true); syncVideo(true); }}
            onError={() => setVideoVisible(false)}
          />
          <div className="majview-shade" style={{ opacity: settings.BGCover / 10 }} />
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
        {/* 拖动进度时显示目标时间；长按 2 倍速时显示倍率。都用 ref 直接改文字，避免每一帧重新渲染 */}
        <div ref={seekHintRef} className="majview-seek-hint" hidden aria-hidden="true">
          <strong ref={seekHintTimeRef} />
          <span ref={seekHintDeltaRef} />
        </div>
        <div ref={speedHintRef} className="majview-speed-hint" hidden aria-hidden="true">2×</div>
      </div>

      <div className="majview-controls">
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
          </span>
          <SortMenu
            compact
            icon={null}
            placement="up"
            options={RATES.map((value) => `${value}×`)}
            value={RATES.indexOf(rate)}
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

      {settingsOpen && <MajViewSettings settings={settings} onChange={changeSettings} onClose={() => setSettingsOpen(false)} />}
    </div>
  );
}
