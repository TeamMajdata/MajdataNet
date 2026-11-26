import { channelGains } from './settings';
import { channels, chartStart, lowerBound, sameEvents, soundEvents } from './timeline.js';

// 解码好的音频按 AudioContext 缓存：切换难度时音乐和音效不用重新下载、解码
const decoded = new WeakMap();
function audioBuffer(context, url, signal) {
  let cache = decoded.get(context);
  if (!cache) decoded.set(context, (cache = new Map()));
  const key = String(url);
  let pending = cache.get(key);
  if (!pending) {
    // 不把调用方的 signal 传下去：一个调用方取消了，别的还可能在等同一份音频
    pending = fetchAudioBuffer(context, url);
    pending.catch(() => cache.delete(key));
    cache.set(key, pending);
  }
  if (!signal) return pending;
  return new Promise((resolve, reject) => {
    const abort = () => reject(signal.reason);
    if (signal.aborted) return abort();
    signal.addEventListener('abort', abort, { once: true });
    pending.then(resolve, reject).finally(() => signal.removeEventListener('abort', abort));
  });
}

/**
 * 换了一个新的 AudioContext（iOS 切后台回来旧的卡死了）时，把旧的解码缓存带过去：
 * AudioBuffer 不绑定 context，不用重新下载、解码。
 */
export function adoptDecoded(from, to) {
  const cache = decoded.get(from);
  if (cache && !decoded.has(to)) decoded.set(to, cache);
}

async function fetchAudioBuffer(context, url, signal) {
  // 以前没带 CORS 加载过的 CDN 响应可能留在缓存里，导致这次请求失败；失败时绕过缓存再试一次
  const r = await fetch(url, { signal }).catch((error) => {
    if (signal?.aborted) throw error;
    return fetch(url, { signal, cache: 'reload' });
  });
  if (!r.ok) throw Error('Audio request failed (' + r.status + ')');
  return context.decodeAudioData(await r.arrayBuffer());
}

// 音效时间在谱面里都是确定的，可以提前很久交给音频线程。提前量大，主线程卡一下也不会漏音；
// 暂停、拖动时会停掉所有已排好的声音，不会多响。
const SCHEDULE_AHEAD_SEC = 3;
const SCHEDULE_INTERVAL_MS = 500;
// 已经错过的事件：晚一点点就在现在补上（听不出来），晚得多就干脆不补——
// 补发的音效会落在错误的拍子上，比少响一声更难受。
const LATE_SKIP_SEC = 0.05;
// 调度间隔突然变得很长（GC、布局、切标签页把定时器拖慢）：说明积压了一批过期事件，
// 直接把游标推到当前时间，而不是一次性补发一串错位的音效。
const STALL_RESYNC_SEC = 0.4;
// 拖动时间轴时的“搓碟”片段长度：太短听不出音高，太长会糊成一片
const SCRATCH_SEC = 0.12;

// DSP 时钟一次音频回调才前进一次（缓冲区大小决定，通常 10ms 级），
// 画面不能直接用：用 performance.now() 外推、再用 DSP 纠偏。
const CLOCK_SNAP_SEC = 0.05; // 误差超过这个值直接对齐（seek / 挂起恢复）
const CLOCK_CORRECTION = 0.1; // 每个音频块纠掉 10% 的误差
const CLOCK_MAX_SLEW = 0.002; // 单次最多纠 2ms，改太快画面会抖

export class Transport {
  constructor(context, song, samples, chart, settings) {
    this.context = context;
    this.song = song;
    this.samples = samples;
    this.events = soundEvents(chart);
    this.duration = chart.notes.reduce(
      (end, n) => Math.max(end, n.end + (n.firework ? 1.4 : 0.76)),
      song.duration,
    );
    // 开头的 clock 可能在 0 之前，这时从第一下 clock 开始，音乐延后到 0 才响
    this.begin = chartStart(chart);
    this.offset = this.begin;
    this.rate = 1;
    this.playing = false;
    // 谱面整体平移量（秒）：来自设置里的 First 偏移，音符和打击音一起动，音乐不动
    this.firstOffset = 0;
    // 高精度计时器的锚点：当前值、对应的墙钟时刻、最近一次读到的 DSP 值
    this.anchorTime = this.offset;
    this.anchorWall = performance.now();
    this.lastDsp = this.offset;
    // 调度诊断：late＝晚了但在容忍范围内补发，dropped＝过期丢弃，resync＝卡顿后重新定位
    this.stats = { late: 0, dropped: 0, resync: 0 };
    this.voices = new Set();
    /** 拖时间轴时正在响的那一小段音乐（搓碟） */
    this.scratchVoice = null;
    // 每种音效只有一个声道（同 Play 的 PlayOneShot：同一条流跳回开头重播），新的一响会打断上一响
    this.lastVoice = new Map();
    this.gains = {};
    for (const name of new Set(['BGM', ...Object.values(channels)])) {
      this.gains[name] = context.createGain();
      this.gains[name].connect(context.destination);
    }
    this.setSettings(settings);
  }
  static async load(context, songUrl, chart, settings, signal, sampleBase) {
    const names = new Set(soundEvents(chart).map((e) => e.name));
    const [song, entries] = await Promise.all([
      audioBuffer(context, songUrl, signal),
      Promise.all(
        [...names].map(async (name) => [
          name,
          await audioBuffer(context, new URL(name + '.mp3', new URL(sampleBase, document.baseURI)), signal),
        ]),
      ),
    ]);
    signal.throwIfAborted();
    return new Transport(context, song, Object.fromEntries(entries), chart, settings);
  }
  // 画面跟着“耳朵听到的”时间走：音频时钟减去输出延迟（蓝牙耳机可能有一两百毫秒）。
  // Safari 不一定给出 outputLatency，这时为 0，靠设置里的偏移手动校准。
  get latency() {
    return (this.context.baseLatency || 0) + (this.context.outputLatency || 0);
  }
  /** DSP 时钟换算出的媒体时间：权威，但一次音频回调才更新一次（粒度＝音频缓冲区） */
  get dspTime() {
    if (!this.playing) return this.offset;
    const heard = (this.context.currentTime - this.started - this.latency) * this.rate;
    return Math.min(this.duration, this.offset + Math.max(0, heard));
  }
  /**
   * 谱面时间＝单独的高精度计时器：以 DSP 为锚点，帧与帧之间用 performance.now() 外推。
   * 直接读 DSP 会让画面每 10ms 才动一次（144fps 下约 1/3 的帧是重复的），所以这里做插值，
   * 每收到一个新的 DSP 值就纠一点偏差，长期仍锁定音频。
   */
  get time() {
    if (!this.playing) return this.offset;
    const now = performance.now();
    const dsp = this.dspTime;
    if (dsp <= this.offset && this.anchorTime <= this.offset) {
      // 还没走过输出延迟，声音还没出来，画面先停在起点
      this.anchorTime = this.offset;
      this.anchorWall = now;
      this.lastDsp = dsp;
      return this.offset;
    }
    let value = this.anchorTime + ((now - this.anchorWall) / 1000) * this.rate;
    if (dsp !== this.lastDsp) {
      this.lastDsp = dsp;
      const error = dsp - value;
      value = Math.abs(error) > CLOCK_SNAP_SEC
        ? dsp
        : value + Math.max(-CLOCK_MAX_SLEW, Math.min(CLOCK_MAX_SLEW, error * CLOCK_CORRECTION));
    }
    this.anchorTime = value;
    this.anchorWall = now;
    // 下限是起播点（可以是负数）：开头四拍的 clock 在 0 之前，夹到 0 会让这几拍画面停住
    return Math.min(this.duration, Math.max(this.begin, value));
  }
  setSettings(settings) {
    const gains = channelGains(settings);
    for (const [name, gain] of Object.entries(this.gains)) gain.gain.value = gains[name];
    const offset = settings.Offset / 1000;
    if (this.playing && offset !== this.soundOffset) {
      this.pause();
      this.soundOffset = offset;
      this.start();
    } else this.soundOffset = offset;
  }
  /**
   * 谱面整体平移（秒）：设置在谱面自带 &first 之上，正值让音符和打击音整体晚一点。
   * 已经排进音频线程的音效是按旧偏移算的，所以从当前位置重新起播一次。
   */
  setFirstOffset(seconds) {
    if (seconds === this.firstOffset) return;
    const at = this.time;
    const resume = this.playing;
    if (resume) this.pause();
    this.firstOffset = seconds;
    this.offset = Math.max(this.begin, Math.min(this.duration, at));
    if (resume && this.offset < this.duration) this.start();
  }
  /**
   * 谱面改过（编辑器实时预览、或换了一份谱面）：音效时间表要跟着换。
   * 已经排进音频线程的音效是按旧时间表排的，所以事件或范围变了就按当前位置重新起播一次；
   * 只有文本变了、时间表没变（比如改注释）时什么都不做，避免按键时把音乐掐断。
   */
  setChart(chart) {
    const events = soundEvents(chart);
    const duration = chart.notes.reduce(
      (end, n) => Math.max(end, n.end + (n.firework ? 1.4 : 0.76)),
      this.song.duration,
    );
    const begin = chartStart(chart);
    if (begin === this.begin && duration === this.duration && sameEvents(events, this.events)) return;
    const at = this.time;
    const resume = this.playing;
    if (resume) this.pause();
    this.events = events;
    this.duration = duration;
    this.begin = begin;
    this.offset = Math.max(this.begin, Math.min(this.duration, at));
    if (resume && this.offset < this.duration) this.start();
  }
  /**
   * DJ 搓碟：拖动时间轴时按拖动位置播一小段音乐，让用户边拖边听到自己在哪个位置。
   * 每次拖动都掐掉上一段（几毫秒淡出，不会爆音），速率跟手速走（拖快一点声音就高一点）。
   * 走的是 BGM 的增益节点，所以音量设置照样生效。
   */
  scratch(time, rate = 1) {
    if (!this.song) return;
    if (this.context.state === 'suspended') void this.context.resume();
    const now = this.context.currentTime;
    const length = Math.min(SCRATCH_SEC, Math.max(0, this.song.duration - time));
    if (length <= 0.01) return;
    const offset = Math.max(0, Math.min(time, Math.max(0, this.song.duration - 0.02)));
    this.stopScratch(0.005);
    const source = this.context.createBufferSource();
    source.buffer = this.song;
    source.playbackRate.value = Math.max(0.5, Math.min(2.5, rate));
    const fade = this.context.createGain();
    fade.gain.setValueAtTime(0, now);
    fade.gain.linearRampToValueAtTime(1, now + 0.004);
    fade.gain.setValueAtTime(1, now + Math.max(0.005, length - 0.012));
    fade.gain.linearRampToValueAtTime(0, now + length);
    source.connect(fade);
    fade.connect(this.gains.BGM);
    source.start(now, offset, length);
    source.onended = () => {
      source.disconnect();
      fade.disconnect();
    };
    this.scratchVoice = { source, fade };
  }
  /** 松开时间轴 / 开始正常播放时收掉搓碟声；fadeOut 是淡出时间（秒） */
  stopScratch(fadeOut = 0.01) {
    const scratch = this.scratchVoice;
    if (!scratch) return;
    this.scratchVoice = null;
    const now = this.context.currentTime;
    try {
      scratch.fade.gain.cancelScheduledValues(now);
      scratch.fade.gain.setValueAtTime(scratch.fade.gain.value, now);
      scratch.fade.gain.linearRampToValueAtTime(0, now + fadeOut);
      scratch.source.stop(now + fadeOut);
    } catch {
      /* 已经停了 */
    }
  }
  voice(buffer, channel, when, offset = 0, length = 0, music = false, name = '') {
    if (!buffer || offset >= buffer.duration) return;
    const source = this.context.createBufferSource();
    source.buffer = buffer;
    if (music) {
      source.playbackRate.value = this.rate;
      source.connect(this.gains[channel]);
    } else {
      // 每个音效一个小的增益节点，被打断时用几毫秒淡出，避免“啪”的一声
      source.fade = this.context.createGain();
      source.fade.connect(this.gains[channel]);
      source.connect(source.fade);
      const previous = this.lastVoice.get(name);
      const cut = Math.max(when, this.context.currentTime);
      // 只在上一响到那时还没结束时才打断它。音效是提前几秒排好的：上一响自己定好了结束时间
      // （例如 touchhold 的 riser 到结束判定就停），再调一次 stop() 会把结束时间推迟到这一响开始
      if (previous && this.voices.has(previous) && previous.endsAt > cut) {
        const gain = previous.fade.gain;
        gain.setValueAtTime(1, Math.max(this.context.currentTime, cut - 0.004));
        gain.linearRampToValueAtTime(0, cut);
        previous.stop(cut + 0.001);
        previous.endsAt = cut;
      }
      this.lastVoice.set(name, source);
    }
    this.voices.add(source);
    source.onended = () => {
      source.disconnect();
      source.fade?.disconnect();
      this.voices.delete(source);
      if (this.lastVoice.get(name) === source) this.lastVoice.delete(name);
    };
    source.start(when, offset);
    if (length > 0) source.stop(when + length / this.rate);
    // 这一响会在什么时候结束（音乐的倍速在 playbackRate 里，音效按原速播放）
    source.endsAt = length > 0
      ? when + length / this.rate
      : when + (buffer.duration - offset) / (music ? this.rate : 1);
  }
  start() {
    if (this.playing) return;
    // 正常播放开始，拖时间轴时的搓碟声要收掉
    this.stopScratch(0.005);
    if (this.offset >= this.duration) this.offset = this.begin;
    this.started = this.context.currentTime;
    this.playing = true;
    // 重新起播：计时器从当前位置重新锚定，调度诊断也清零
    this.anchorTime = this.offset;
    this.anchorWall = performance.now();
    this.lastDsp = this.offset;
    this.stats = { late: 0, dropped: 0, resync: 0 };
    this.lastSchedule = this.context.currentTime;
    if (this.offset < 0) this.voice(this.song, 'BGM', this.started - this.offset / this.rate, 0, 0, true);
    else this.voice(this.song, 'BGM', this.started, this.offset, 0, true);
    // 当前媒体位置对应的谱面时间（含 First 偏移和音效偏移）
    const at = this.offset + this.soundOffset - this.firstOffset;
    this.next = lowerBound(this.events, at, (e) => e.time);
    for (const e of this.events.slice(0, this.next)) {
      if (e.length && e.time + e.length > at)
        this.voice(
          this.samples[e.name],
          channels[e.name],
          this.started,
          (at - e.time) / this.rate,
          e.time + e.length - at,
          false,
          e.name,
        );
    }
    this.schedule();
    this.timer = setInterval(() => this.schedule(), SCHEDULE_INTERVAL_MS);
  }
  schedule() {
    const now = this.context.currentTime;
    // 主线程被卡住过（GC、布局、切后台把定时器拖慢）：事件表已经落后一大截，
    // 重新定位游标，避免醒来时一次性补发一串已经过期的音效
    if (this.lastSchedule !== undefined && now - this.lastSchedule > STALL_RESYNC_SEC) {
      const at = this.offset + this.soundOffset - this.firstOffset + (now - this.started) * this.rate;
      const index = lowerBound(this.events, at - LATE_SKIP_SEC, (e) => e.time);
      if (index > this.next) {
        this.stats.resync++;
        this.stats.dropped += index - this.next;
        this.next = index;
      }
    }
    this.lastSchedule = now;
    while (this.next < this.events.length) {
      const e = this.events[this.next];
      const when = this.started + (e.time - this.soundOffset - this.offset + this.firstOffset) / this.rate;
      if (when > now + SCHEDULE_AHEAD_SEC) break;
      const late = now - when;
      if (late <= LATE_SKIP_SEC) {
        if (late > 0) this.stats.late++;
        this.voice(this.samples[e.name], channels[e.name], Math.max(when, now), 0, e.length, false, e.name);
      } else {
        // 已经过期：宁可不响，也不要落在错误的拍子上
        this.stats.dropped++;
      }
      this.next++;
    }
  }
  pause() {
    this.offset = this.time;
    this.playing = false;
    clearInterval(this.timer);
    for (const source of this.voices) {
      source.onended = null;
      source.stop();
      source.disconnect();
      source.fade?.disconnect();
    }
    this.voices.clear();
    this.lastVoice.clear();
  }
  move(time, rate = this.rate) {
    const resume = this.playing;
    this.pause();
    this.offset = Math.max(this.begin, Math.min(this.duration, time));
    this.rate = rate;
    if (resume && this.offset < this.duration) this.start();
  }
  dispose() {
    this.stopScratch(0);
    this.pause();
    Object.values(this.gains).forEach((g) => g.disconnect());
  }
}
