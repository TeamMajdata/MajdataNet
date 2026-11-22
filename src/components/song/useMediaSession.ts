import { useCallback, useEffect, useRef } from 'react';

/** 1 秒静音的 WAV（8kHz、8 位单声道，8KB 左右），循环播放 */
function silentWavUrl() {
  const rate = 8000;
  const bytes = new Uint8Array(44 + rate);
  const view = new DataView(bytes.buffer);
  const text = (offset: number, value: string) => [...value].forEach((c, i) => view.setUint8(offset + i, c.charCodeAt(0)));
  text(0, 'RIFF');
  view.setUint32(4, 36 + rate, true);
  text(8, 'WAVE');
  text(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // 单声道
  view.setUint32(24, rate, true);
  view.setUint32(28, rate, true);
  view.setUint16(32, 1, true);
  view.setUint16(34, 8, true);
  text(36, 'data');
  view.setUint32(40, rate, true);
  bytes.fill(128, 44); // 8 位 PCM 的静音是 128
  return URL.createObjectURL(new Blob([bytes], { type: 'audio/wav' }));
}

let silentUrl: string | null = null;

const SKIP_SEC = 10;

/**
 * 接上系统的媒体控件（iOS 锁屏 / 控制中心、安卓通知栏）：曲名、曲师、封面、进度，以及播放、暂停、拖动、快进快退。
 *
 * 预览的声音是 Web Audio 排程播放的，浏览器不把它当成“正在播放的媒体”，系统控件不会出现。
 * 所以播放时同时循环一段静音的 <audio>：iOS Safari、安卓 Chrome 认它，才会显示控件、把按钮发给页面。
 * 这个 <audio> 第一次 play() 要在用户点击里（prime），之后的播放 / 暂停跟着 playing 走。
 *
 * 时间都是界面上显示的时间（从第一下 clock 开始算，和进度条一致）。
 */
export function useMediaSession({ title, artist, artwork, playing, duration, rate, getTime, onPlay, onPause, onSeek }: {
  title: string;
  artist?: string;
  artwork?: string;
  playing: boolean;
  /** 总时长（秒），0 表示还不知道 */
  duration: number;
  rate: number;
  /** 当前播放到哪（秒） */
  getTime: () => number;
  onPlay: () => void;
  onPause: () => void;
  onSeek: (time: number) => void;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  // 处理函数每次渲染都是新的，系统回调里读最新的
  const handlers = useRef({ getTime, onPlay, onPause, onSeek, duration });
  useEffect(() => {
    handlers.current = { getTime, onPlay, onPause, onSeek, duration };
  });

  const supported = typeof navigator !== 'undefined' && 'mediaSession' in navigator;

  /** 在点击播放的那一刻调用：让静音 <audio> 开始播放（iOS 只允许在用户操作里第一次播放） */
  const prime = useCallback(() => {
    if (!supported) return;
    if (!audioRef.current) {
      silentUrl ??= silentWavUrl();
      const audio = new Audio(silentUrl);
      audio.loop = true;
      audio.setAttribute('playsinline', '');
      audioRef.current = audio;
    }
    void audioRef.current.play().catch(() => {});
  }, [supported]);

  // 卸载时停掉静音音频、清掉系统控件
  useEffect(() => () => {
    audioRef.current?.pause();
    audioRef.current = null;
    if (!supported) return;
    navigator.mediaSession.metadata = null;
    navigator.mediaSession.playbackState = 'none';
    for (const action of ['play', 'pause', 'seekto', 'seekbackward', 'seekforward'] as const) {
      try { navigator.mediaSession.setActionHandler(action, null); } catch { /* 不支持的动作 */ }
    }
  }, [supported]);

  // 曲名、曲师、封面
  useEffect(() => {
    if (!supported) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title,
      artist: artist ?? '',
      artwork: artwork ? [{ src: new URL(artwork, document.baseURI).href }] : [],
    });
  }, [supported, title, artist, artwork]);

  // 系统按钮 → 播放器
  useEffect(() => {
    if (!supported) return;
    const clampTime = (time: number) => Math.max(0, Math.min(handlers.current.duration || time, time));
    const actions: [MediaSessionAction, MediaSessionActionHandler][] = [
      ['play', () => handlers.current.onPlay()],
      ['pause', () => handlers.current.onPause()],
      ['seekto', (details) => { if (details.seekTime !== undefined) handlers.current.onSeek(clampTime(details.seekTime)); }],
      ['seekbackward', (details) => handlers.current.onSeek(clampTime(handlers.current.getTime() - (details.seekOffset ?? SKIP_SEC)))],
      ['seekforward', (details) => handlers.current.onSeek(clampTime(handlers.current.getTime() + (details.seekOffset ?? SKIP_SEC)))],
    ];
    for (const [action, handler] of actions) {
      try { navigator.mediaSession.setActionHandler(action, handler); } catch { /* 不支持的动作 */ }
    }
  }, [supported]);

  /** 进度变了（拖动、换速度）时调用，系统进度条按 rate 自己往前走 */
  const syncPosition = useCallback(() => {
    if (!supported || !(duration > 0)) return;
    try {
      navigator.mediaSession.setPositionState({
        duration,
        playbackRate: rate,
        position: Math.max(0, Math.min(duration, handlers.current.getTime())),
      });
    } catch { /* 有的浏览器不支持 setPositionState */ }
  }, [supported, duration, rate]);

  // 播放状态：静音 <audio> 跟着播放 / 暂停，系统控件显示对应的按钮
  useEffect(() => {
    if (!supported) return;
    navigator.mediaSession.playbackState = playing ? 'playing' : 'paused';
    const audio = audioRef.current;
    if (audio) {
      if (playing) void audio.play().catch(() => {});
      else audio.pause();
    }
    syncPosition();
  }, [supported, playing, syncPosition]);

  return { prime, syncPosition };
}
