import { channelGains } from './settings';
import { channels, chartStart, lowerBound, soundEvents } from './timeline.js';

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
const SCHEDULE_AHEAD_SEC = 1.5;
const SCHEDULE_INTERVAL_MS = 250;
const LATE_LIMIT_SEC = 0.25;

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
    this.voices = new Set();
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
  get time() {
    if (!this.playing) return this.offset;
    const heard = (this.context.currentTime - this.started - this.latency) * this.rate;
    return Math.min(this.duration, this.offset + Math.max(0, heard));
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
      if (previous && this.voices.has(previous)) {
        const cut = Math.max(when, this.context.currentTime);
        const gain = previous.fade.gain;
        gain.setValueAtTime(1, Math.max(this.context.currentTime, cut - 0.004));
        gain.linearRampToValueAtTime(0, cut);
        previous.stop(cut + 0.001);
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
  }
  start() {
    if (this.playing) return;
    if (this.offset >= this.duration) this.offset = this.begin;
    this.started = this.context.currentTime;
    this.playing = true;
    if (this.offset < 0) this.voice(this.song, 'BGM', this.started - this.offset / this.rate, 0, 0, true);
    else this.voice(this.song, 'BGM', this.started, this.offset, 0, true);
    const at = this.offset + this.soundOffset;
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
    while (this.next < this.events.length) {
      const e = this.events[this.next];
      const when = this.started + (e.time - this.soundOffset - this.offset) / this.rate;
      if (when > now + SCHEDULE_AHEAD_SEC) break;
      // 定时器被拖慢时（手机、主线程忙）宁可晚一点响也不要漏掉；只有晚太多（比如切回前台）才跳过
      if (when >= now - LATE_LIMIT_SEC)
        this.voice(this.samples[e.name], channels[e.name], Math.max(when, now), 0, e.length, false, e.name);
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
    this.pause();
    Object.values(this.gains).forEach((g) => g.disconnect());
  }
}
