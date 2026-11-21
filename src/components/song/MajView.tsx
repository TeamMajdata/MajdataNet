/**
 * 网页版谱面预览（MajView）：PixiJS 画谱面，Web Audio 放音乐和打击音，替代原来的 Unity WebGL 播放器。
 * 引擎在 src/majview/，皮肤和音效在 public/majview/skin/。这个组件只负责加载、播放控制和界面。
 *
 * 打开页面时只加载谱面并停在开头；第一次点播放才下载音乐，免得每次打开谱面页都下载整首歌。
 */
import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { LuMaximize, LuPause, LuPlay, LuRotateCcw, LuSettings2 } from 'react-icons/lu';
import { Board } from '@/majview/renderer.js';
import { Transport } from '@/majview/audio.js';
import { compileChart, readMaidata } from '@/majview/simai.js';
import { chartStart, scoreTimeline } from '@/majview/timeline.js';
import { DOUBLE_TAP_MS, DOUBLE_TAP_SLOP_PX, KEY_SEEK_SECONDS, LONG_PRESS_MS, SCRUB_SLOP_PX, TAP_SLOP_PX, seekTarget, swipeValue } from '@/majview/gestures.js';
import type { ChartMark } from './chartMarks';
import { VIEW_FIELDS, VOLUME_RANGE, loadSettings, saveSettings, type ViewSettings } from '@/majview/settings';
import SortMenu from '@/components/ui/SortMenu';
import MajViewSettings from './MajViewSettings';
import { endpoints } from '@/config/api';
import '@/styles/components/majview.css';

const SKIN_BASE = '/majview/skin/';
const BG_COVER = VIEW_FIELDS.find((field) => field.key === 'BGCover')!;
const RATES = [0.5, 0.75, 1, 1.25, 1.5, 2];

type Chart = ReturnType<typeof compileChart>;
/** loading：加载谱面；ready：可以播放；buffering：第一次播放，正在下载音乐；error：失败 */
type Status = 'loading' | 'ready' | 'buffering' | 'error';

/** 一根手指在判定盘上的手势状态：点按、长按 2 倍速、横向拖动进度、竖向调音量 / 亮度都从 pointerdown 开始区分 */
type BoardGesture = {
  id: number;
  x: number;
  y: number;
  moved: boolean;
  longPressed: boolean;
  scrubbing: boolean;
  /** 竖向拖动在调的设置：右半边调音乐音量，左半边调背景暗度 */
  adjust: 'BGM' | 'BGCover' | null;
  /** 竖向拖动开始时的设置值：目标值相对它算 */
  startValue: number;
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
  const [settingsOpen, setSettingsOpen] = useState(false);
  const rafRef = useRef(0);

  // 判定盘手势：同一时间只跟踪一根手指，定时器保存长按
  const gestureRef = useRef<BoardGesture | null>(null);
  const longPressRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTapRef = useRef<{ at: number; x: number; y: number } | null>(null);
  const seekHintRef = useRef<HTMLDivElement>(null);
  const seekHintTimeRef = useRef<HTMLElement>(null);
  const seekHintDeltaRef = useRef<HTMLSpanElement>(null);
  const speedHintRef = useRef<HTMLDivElement>(null);
  const seekHintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // 鼠标双击全屏，触摸的双击是播放 / 暂停：记下最近一次按下用的是什么
  const pointerTypeRef = useRef('');

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
  // 手势回调在两次渲染之间触发，读 ref 才能拿到当前总长和倍速
  const durationRef = useRef(0);
  const rateRef = useRef(1);
  durationRef.current = duration;
  rateRef.current = rate;

  const chartUrl = endpoints.maichart.prefix('') + songId;

  const currentTime = () => transportRef.current?.time ?? previewTimeRef.current;

  // 视频跟着音频时钟走，差太多才校正（视频差几十毫秒看不出来）
  const syncVideo = useCallback((force = false) => {
    const video = videoRef.current;
    if (!video || video.readyState < 1 || !Number.isFinite(video.duration)) return;
    const transport = transportRef.current;
    const time = transport?.time ?? previewTimeRef.current;
    const target = Math.max(0, Math.min(time, video.duration));
    const drift = Math.abs(video.currentTime - target);
    if ((force || drift > 0.15) && drift > 0.015) video.currentTime = target;
    if (transport && video.playbackRate !== transport.rate) video.playbackRate = transport.rate;
    if (transport?.playing && time >= 0 && time < video.duration) {
      if (video.paused) video.play().catch(() => {});
    } else if (!video.paused) video.pause();
  }, []);

  const frame = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    const board = boardRef.current;
    if (!board || !chartRef.current) return;
    const transport = transportRef.current;
    const time = transport?.time ?? previewTimeRef.current;
    if (transport?.playing && time >= transport.duration) {
      transport.pause();
      setPlaying(false);
    }
    board.render(time);
    if (timelineRef.current) timelineRef.current.value = String(time);
    // 时间文字一秒才变一次，没变就不碰 DOM
    const clock = formatClock(time - beginRef.current);
    if (clockRef.current && clockRef.current.textContent !== clock) clockRef.current.textContent = clock;
    syncVideo();
    if (transport?.playing) rafRef.current = requestAnimationFrame(frame);
  }, [syncVideo]);

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
        transport.move(previewTimeRef.current);
        transportRef.current = transport;
        setDuration(transport.duration);
        return transport;
      })
      .catch(() => {
        if (trackRef.current?.controller === controller) trackRef.current = null;
        return null;
      });
    trackRef.current = { chart: target, controller, promise };
    return promise;
  }, [chartUrl]);

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
        const response = await fetch(chartUrl + '/chart', { signal });
        if (!response.ok) throw Error(`Chart request failed (${response.status})`);
        const compiled = compileChart(readMaidata(await response.text()), level);
        if (signal.aborted) return;
        chartRef.current = compiled;
        previewTimeRef.current = chartStart(compiled);
        beginRef.current = previewTimeRef.current;
        setBegin(previewTimeRef.current);
        setChart(compiled);
        setDuration(chartDuration(compiled));
        void prepareTrack(compiled);
      } catch (err) {
        if (signal.aborted) return;
        setError({ detail: (err as Error).message });
        setStatus('error');
      }
    }
    void load();
    return () => controller.abort();
  }, [chartUrl, level, dropTransport, prepareTrack]);

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
      // 稍微过一点，画面上 combo 正好显示成这个数
      time = entry.time + 0.001;
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

  // 谱面和渲染器都好了才画出来
  useEffect(() => {
    if (!boardReady || !chart) return;
    boardRef.current?.setChart(chart, settingsRef.current);
    setStatus('ready');
    frame();
  }, [boardReady, chart, frame]);

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
    if (seekHintTimerRef.current !== null) clearTimeout(seekHintTimerRef.current);
    seekHintTimerRef.current = null;
    if (seekHintRef.current) seekHintRef.current.hidden = true;
  };

  /** 提示框上显示一个数值和它的说明（调音量、亮度时用） */
  const showValueHint = (value: string, label: string) => {
    const hint = seekHintRef.current;
    if (!hint) return;
    hint.hidden = false;
    if (seekHintTimeRef.current) seekHintTimeRef.current.textContent = value;
    if (seekHintDeltaRef.current) seekHintDeltaRef.current.textContent = label;
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
    pointerTypeRef.current = e.pointerType;
    if (e.pointerType !== 'touch' || !canControl || gestureRef.current) return;
    const gesture: BoardGesture = {
      id: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      moved: false,
      longPressed: false,
      scrubbing: false,
      adjust: null,
      startValue: 0,
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
    // 已经在 2 倍速：手指挪动不改成拖动
    if (gesture.longPressed) return;
    if (!gesture.moved) {
      if (Math.hypot(dx, dy) <= TAP_SLOP_PX) return;
      gesture.moved = true;
      clearLongPress();
    }
    if (!gesture.scrubbing && !gesture.adjust) {
      // 挪够一段距离再看方向：横向拖进度，竖向按起点在哪半边调音量或亮度
      if (Math.hypot(dx, dy) < SCRUB_SLOP_PX) return;
      if (Math.abs(dx) > Math.abs(dy)) gesture.scrubbing = true;
      else {
        const rect = e.currentTarget.getBoundingClientRect();
        gesture.adjust = gesture.x - rect.left > rect.width / 2 ? 'BGM' : 'BGCover';
        gesture.startValue = settingsRef.current[gesture.adjust];
      }
    }
    const height = e.currentTarget.clientHeight;
    if (gesture.adjust === 'BGM') {
      const value = swipeValue(gesture.startValue, dy, height, VOLUME_RANGE.min, VOLUME_RANGE.max, VOLUME_RANGE.step);
      if (value !== settingsRef.current.BGM) changeSettings({ BGM: value });
      showValueHint(value.toFixed(1), t('song/MajView.SettingBGM'));
    } else if (gesture.adjust === 'BGCover') {
      // 往上拖更亮，也就是暗度变小
      const value = swipeValue(gesture.startValue, -dy, height, BG_COVER.min, BG_COVER.max, 1);
      if (value !== settingsRef.current.BGCover) changeSettings({ BGCover: value });
      showValueHint(`${value * 10}%`, t('song/MajView.SettingBGCover'));
    } else {
      gesture.target = seekTarget(gesture.startTime, dx, e.currentTarget.clientWidth, beginRef.current, durationRef.current);
      showSeekHint(gesture.target, gesture.startTime);
    }
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

  // 键盘快捷键在 window 上监听，回调读这里拿到当前这次渲染的函数
  const keyActionsRef = useRef({ togglePlay, seek, canControl, showSeekHint, hideSeekHint, setSpeedHint, restoreSpeed });
  keyActionsRef.current = { togglePlay, seek, canControl, showSeekHint, hideSeekHint, setSpeedHint, restoreSpeed };

  // 空格播放 / 暂停，左右方向键后退 / 前进 5 秒，按住右方向键 2 倍速（松开恢复）。
  // 只在预览页签显示、播放器至少有一部分在屏幕上，并且焦点不在输入框和按钮上时生效
  useEffect(() => {
    if (!active) return;
    let holdTimer: ReturnType<typeof setTimeout> | null = null;
    let holding = false;
    let spedUp = false;
    const ignored = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return true;
      const target = e.target as HTMLElement | null;
      if (target?.isContentEditable || target?.closest('input, textarea, select, button, a, [role="menu"]')) return true;
      const rect = rootRef.current?.getBoundingClientRect();
      return !rect || rect.bottom <= 0 || rect.top >= window.innerHeight || !keyActionsRef.current.canControl;
    };
    const flashSeek = (delta: number) => {
      const actions = keyActionsRef.current;
      const start = transportRef.current?.time ?? previewTimeRef.current;
      const target = Math.min(durationRef.current, Math.max(beginRef.current, start + delta));
      actions.seek(target);
      actions.showSeekHint(target, start);
      if (seekHintTimerRef.current !== null) clearTimeout(seekHintTimerRef.current);
      seekHintTimerRef.current = setTimeout(() => keyActionsRef.current.hideSeekHint(), 700);
    };
    const down = (e: KeyboardEvent) => {
      if (ignored(e)) return;
      if (e.key === ' ') {
        e.preventDefault();
        if (!e.repeat) void keyActionsRef.current.togglePlay();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        flashSeek(-KEY_SEEK_SECONDS);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        if (e.repeat || holding) return;
        holding = true;
        holdTimer = setTimeout(() => {
          holdTimer = null;
          const transport = transportRef.current;
          if (!transport?.playing) return;
          transport.move(transport.time, 2);
          spedUp = true;
          keyActionsRef.current.setSpeedHint(true);
        }, LONG_PRESS_MS);
      }
    };
    const releaseRight = (seekIfShort: boolean) => {
      if (!holding) return;
      holding = false;
      if (holdTimer !== null) {
        clearTimeout(holdTimer);
        holdTimer = null;
        // 没按到长按的时间：当成一次前进
        if (seekIfShort) flashSeek(KEY_SEEK_SECONDS);
      }
      if (spedUp) {
        spedUp = false;
        keyActionsRef.current.restoreSpeed();
      }
    };
    const up = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') releaseRight(true);
    };
    const blur = () => releaseRight(false);
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', blur);
    return () => {
      releaseRight(false);
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', blur);
    };
  }, [active]);

  const controlClass = 'grid place-items-center hover:bg-white/10 rounded-lg w-9 h-9 text-white/85 hover:text-white transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-default';

  return (
    <div ref={rootRef} className="majview">
      <img className="majview-backdrop" src={cover} alt="" crossOrigin="anonymous" />
      <div
        ref={sceneRef}
        className="majview-scene"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onDoubleClick={() => {
          // 触摸的双击已经在手势里当成播放 / 暂停
          if (pointerTypeRef.current === 'mouse' && CAN_FULLSCREEN) void toggleFullscreen();
        }}
      >
        <div className="majview-background">
          <img src={cover} alt="" crossOrigin="anonymous" onError={onCoverError} />
          <video
            ref={videoRef}
            src={chartUrl + '/video'}
            muted
            playsInline
            preload="auto"
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
        {chart && (
          <div className="majview-note-count">
            {t('song/MajView.NoteCount')} <strong>{scores.length}</strong>
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
