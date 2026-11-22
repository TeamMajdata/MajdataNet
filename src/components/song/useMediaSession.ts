import { useCallback, useEffect, useRef } from 'react';

/**
 * 和谱面一样长的静音 WAV：8kHz、16 位单声道（每分钟约 1MB）。
 * 以前用 4kHz、8 位省体积，但 iOS 不一定播得了这种格式：静音 <audio> 没播起来，系统就拿 Web Audio 当正在播放的媒体，
 * 没有长度，锁屏 / 控制中心的进度条是灰的、拖不动
 */
function silentWavUrl(seconds: number) {
  const rate = 8000;
  const samples = Math.max(1, Math.ceil(seconds * rate));
  const dataBytes = samples * 2;
  const bytes = new Uint8Array(44 + dataBytes); // 16 位 PCM 的静音就是 0
  const view = new DataView(bytes.buffer);
  const text = (offset: number, value: string) => [...value].forEach((c, i) => view.setUint8(offset + i, c.charCodeAt(0)));
  text(0, 'RIFF');
  view.setUint32(4, 36 + dataBytes, true);
  text(8, 'WAVE');
  text(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // 单声道
  view.setUint32(24, rate, true);
  view.setUint32(28, rate * 2, true); // 每秒字节数
  view.setUint16(32, 2, true); // 每个采样的字节数
  view.setUint16(34, 16, true);
  text(36, 'data');
  view.setUint32(40, dataBytes, true);
  return URL.createObjectURL(new Blob([bytes], { type: 'audio/wav' }));
}

const SKIP_SEC = 10;
const ACTIONS = ['play', 'pause', 'seekto', 'seekbackward', 'seekforward'] as const;

/**
 * 接上系统的媒体控件（iOS 锁屏 / 控制中心、安卓通知栏）：曲名、曲师、封面、进度，以及播放、暂停、拖动、快进快退。
 *
 * 预览的声音是 Web Audio 排程播放的，浏览器不把它当成“正在播放的媒体”，系统控件不会出现。
 * 所以播放时同时放一段静音的 <audio>：iOS Safari、安卓 Chrome 认它，才会显示控件、把按钮发给页面。
 * iOS 的进度条和拖动直接取这个 <audio> 自己的位置和长度（不看 setPositionState），所以它和谱面一样长，
 * 播放位置、速度、播放 / 暂停都跟预览保持一致；第一次 play() 要在用户点击里（prime）。
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
  const supported = typeof navigator !== 'undefined' && 'mediaSession' in navigator;
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlRef = useRef<string | null>(null);
  // 处理函数每次渲染都是新的，系统回调里读最新的
  const handlers = useRef({ getTime, onPlay, onPause, onSeek, duration });
  useEffect(() => {
    handlers.current = { getTime, onPlay, onPause, onSeek, duration };
  });

  /** 静音 <audio> 换成 length 秒长 */
  const setLength = useCallback((audio: HTMLAudioElement, length: number) => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = silentWavUrl(length);
    audio.setAttribute('src', urlRef.current);
  }, []);

  /** 静音 <audio> 对到预览当前的位置和速度 */
  const align = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const time = Math.max(0, handlers.current.getTime());
    if (Math.abs(audio.currentTime - time) > 0.25) audio.currentTime = time;
    audio.playbackRate = rate;
  }, [rate]);

  /** 在点击播放的那一刻调用：静音 <audio> 的第一次 play() 必须在用户操作里（iOS） */
  const prime = useCallback(() => {
    if (!supported) return;
    let audio = audioRef.current;
    if (!audio) {
      audio = new Audio();
      audio.setAttribute('playsinline', '');
      audio.setAttribute('preload', 'auto');
      // 还不知道时长就先给 10 分钟，知道后由下面的 effect 换成准确长度
      setLength(audio, duration > 0 ? duration : 600);
      audioRef.current = audio;
    }
    align();
    void audio.play().catch(() => {});
  }, [supported, duration, setLength, align]);

  // 时长知道了 / 换了难度：静音 <audio> 换成一样长，位置和播放状态接着对上
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !(duration > 0)) return;
    setLength(audio, duration);
    align();
    if (playing) void audio.play().catch(() => {});
    // 只在时长变化时换；播放状态和位置由下面的 effect 负责
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duration]);

  // 卸载时停掉静音音频、清掉系统控件
  useEffect(() => () => {
    audioRef.current?.pause();
    audioRef.current = null;
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = null;
    if (!supported) return;
    navigator.mediaSession.metadata = null;
    navigator.mediaSession.playbackState = 'none';
    for (const action of ACTIONS) {
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
    const seekTo = (time: number) => handlers.current.onSeek(Math.max(0, Math.min(handlers.current.duration || time, time)));
    const handlersByAction: Record<typeof ACTIONS[number], MediaSessionActionHandler> = {
      play: () => handlers.current.onPlay(),
      pause: () => handlers.current.onPause(),
      seekto: (details) => { if (details.seekTime !== undefined) seekTo(details.seekTime); },
      seekbackward: (details) => seekTo(handlers.current.getTime() - (details.seekOffset ?? SKIP_SEC)),
      seekforward: (details) => seekTo(handlers.current.getTime() + (details.seekOffset ?? SKIP_SEC)),
    };
    for (const action of ACTIONS) {
      try { navigator.mediaSession.setActionHandler(action, handlersByAction[action]); } catch { /* 不支持的动作 */ }
    }
  }, [supported]);

  /** 进度变了（拖动、换速度、播放 / 暂停）时调用：静音 <audio> 跟过去，系统进度条按 rate 自己往前走 */
  const syncPosition = useCallback(() => {
    align();
    if (!supported || !(duration > 0)) return;
    navigator.mediaSession.setPositionState?.({
      duration,
      playbackRate: rate,
      position: Math.max(0, Math.min(duration, handlers.current.getTime())),
    });
  }, [supported, duration, rate, align]);

  // 播放状态：静音 <audio> 跟着播放 / 暂停（先停再对位置，暂停时系统显示的才是预览停下的位置）
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
