/**
 * MajView 帧率诊断（开发期打桩；线上默认不启用）。
 *
 * 记录三样东西：
 *  1. 每次 requestAnimationFrame 的间隔 —— 掉帧就是间隔明显超过一帧；
 *  2. board.render() 的耗时，以及这一帧画了多少音符 / 精灵；
 *  3. 长帧的上下文，直接打到 console，并汇总成 summary 供外部读取。
 */

/** 采样窗口：约 4 秒（60fps） */
const HISTORY = 240;
/** 超过两帧（33ms）算掉帧 */
const LONG_FRAME_MS = 33;
/** 长帧最多留多少条 */
const MAX_SPIKES = 40;

const now = () => performance.now();

function percentile(sorted, p) {
  if (!sorted.length) return 0;
  const i = Math.min(sorted.length - 1, Math.max(0, Math.round((sorted.length - 1) * p)));
  return sorted[i];
}

export function createPerf(label = 'majview') {
  const deltas = []; // 最近的 rAF 间隔
  const renders = []; // 最近的 render 耗时
  const lags = []; // rAF 回调比计划晚了多少（主线程被占用的直接证据）
  const steps = []; // 每帧音频时钟前进了多少：接近 0 说明画面在重复同一帧
  const dspDeltas = []; // 谱面时间（高精度计时器）与 DSP 时钟的差，单位 ms
  const videoDeltas = []; // 谱面时间与背景视频时间的差，单位 ms
  const longTasks = []; // 主线程长任务（>50ms）
  const spikes = []; // 长帧明细
  // 最近一帧的上下文，markRender 时更新
  const info = { delta: 0, lag: 0, render: 0, notes: 0, sprites: 0, time: 0, step: 0, playing: false, rate: 1, audio: null };
  let lastTime = null;
  let lastRaf = 0;
  let frames = 0;
  let started = now();
  let cachedAt = 0;
  let cached = null;
  // 运行环境：GPU 渲染器、画布尺寸、视频丢帧等，用来区分“代码问题”和“机器/浏览器问题”
  const scene = {};

  // 主线程长任务：掉帧真正的原因通常在这里，而不是在 render 里
  let observer = null;
  if (typeof PerformanceObserver !== 'undefined') {
    try {
      observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          longTasks.push({ at: Math.round(entry.startTime), ms: +entry.duration.toFixed(1) });
          if (longTasks.length > MAX_SPIKES) longTasks.shift();
          console.warn(`[${label} perf] long task ${entry.duration.toFixed(1)}ms at ${Math.round(entry.startTime)}ms`);
        }
      });
      observer.observe({ entryTypes: ['longtask'] });
    } catch {
      observer = null;
    }
  }

  function markFrame(timestamp = now()) {
    if (lastRaf) {
      info.delta = timestamp - lastRaf;
      deltas.push(info.delta);
      if (deltas.length > HISTORY) deltas.shift();
      frames++;
    }
    // 回调比 rAF 计划时间晚多少：>2ms 说明主线程在帧开始前被别的任务占住了
    info.lag = Math.max(0, now() - timestamp);
    lags.push(info.lag);
    if (lags.length > HISTORY) lags.shift();
    lastRaf = timestamp;
    return info.delta;
  }

  function markRender(ms, stats = {}) {
    renders.push(ms);
    if (renders.length > HISTORY) renders.shift();
    info.render = ms;
    if (stats.notes != null) info.notes = stats.notes;
    if (stats.sprites != null) info.sprites = stats.sprites;
    if (stats.time != null) info.time = stats.time;
    if (stats.playing != null) info.playing = stats.playing;
    if (stats.rate != null) info.rate = stats.rate;
    if (stats.audio) info.audio = stats.audio;
    // 音频时钟每帧前进了多少：一直约等于 0 表示画面在重复同一帧（看着卡但 rAF 很快）
    if (stats.time != null && lastTime != null) {
      info.step = stats.time - lastTime;
      steps.push(info.step);
      if (steps.length > HISTORY) steps.shift();
    }
    if (stats.time != null) lastTime = stats.time;
    // 谱面时间 vs DSP 时间 / 视频时间：用来确认高精度计时器有没有跟音频、视频跑偏
    if (stats.dsp != null && stats.time != null) {
      dspDeltas.push((stats.time - stats.dsp) * 1000);
      if (dspDeltas.length > HISTORY) dspDeltas.shift();
    }
    if (stats.video != null && stats.time != null) {
      videoDeltas.push((stats.time - stats.video) * 1000);
      if (videoDeltas.length > HISTORY) videoDeltas.shift();
    }

    if (info.delta > LONG_FRAME_MS) {
      spikes.push({
        at: Math.round(now() - started),
        delta: +info.delta.toFixed(1),
        render: +ms.toFixed(1),
        notes: info.notes,
        sprites: info.sprites,
        time: +info.time.toFixed(2),
        playing: info.playing,
        rate: info.rate,
      });
      if (spikes.length > MAX_SPIKES) spikes.shift();
      console.warn(
        `[${label} perf] long frame ${info.delta.toFixed(1)}ms | render ${ms.toFixed(1)}ms | ` +
          `notes ${info.notes} | sprites ${info.sprites} | t=${info.time.toFixed(2)}s | ` +
          `playing=${info.playing} rate=${info.rate}`,
      );
    }
  }

  /** 每 250ms 重算一次，避免每帧排序 */
  function summary() {
    if (cached && now() - cachedAt < 250) return cached;
    cachedAt = now();
    const sorted = [...deltas].sort((a, b) => a - b);
    const rs = [...renders].sort((a, b) => a - b);
    const ls = [...lags].sort((a, b) => a - b);
    const mean = sorted.length ? sorted.reduce((a, b) => a + b, 0) / sorted.length : 0;
    cached = {
      fps: mean ? +(1000 / mean).toFixed(1) : 0,
      frames,
      window: sorted.length,
      frameMedian: +percentile(sorted, 0.5).toFixed(2),
      frameP95: +percentile(sorted, 0.95).toFixed(2),
      frameMax: +(sorted.at(-1) ?? 0).toFixed(2),
      renderMedian: +percentile(rs, 0.5).toFixed(2),
      renderP95: +percentile(rs, 0.95).toFixed(2),
      renderMax: +(rs.at(-1) ?? 0).toFixed(2),
      lagP95: +percentile(ls, 0.95).toFixed(2),
      lagMax: +(ls.at(-1) ?? 0).toFixed(2),
      stepMedian: +percentile([...steps].sort((a, b) => a - b), 0.5).toFixed(3),
      frozen: steps.filter((s) => Math.abs(s) < 0.0005).length,
      dspDeltaMedian: dspDeltas.length ? +percentile([...dspDeltas].sort((a, b) => a - b), 0.5).toFixed(2) : null,
      dspDeltaMax: dspDeltas.length ? +Math.max(...dspDeltas.map(Math.abs)).toFixed(2) : null,
      videoDeltaMedian: videoDeltas.length ? +percentile([...videoDeltas].sort((a, b) => a - b), 0.5).toFixed(1) : null,
      videoDeltaMax: videoDeltas.length ? +Math.max(...videoDeltas.map(Math.abs)).toFixed(1) : null,
      longTasks: longTasks.length,
      longTaskMax: +(longTasks.reduce((m, t) => Math.max(m, t.ms), 0)).toFixed(1),
      audioLate: info.audio?.late ?? 0,
      audioDropped: info.audio?.dropped ?? 0,
      audioResync: info.audio?.resync ?? 0,
      longFrames: spikes.length,
      notes: info.notes,
      sprites: info.sprites,
      playing: info.playing,
    };
    return cached;
  }

  /** 覆盖层文字（在渲染循环里直接写 DOM，不走 React） */
  function overlay() {
    const s = summary();
    const gpu = scene.gpu
      ? String(scene.gpu).replace(/^ANGLE \(/, '').split(',')[0].slice(0, 26)
      : (scene.renderer ?? '?');
    const dsp = s.dspDeltaMedian == null ? '—' : `${s.dspDeltaMedian.toFixed(1)}/${s.dspDeltaMax.toFixed(1)}`;
    const video = s.videoDeltaMedian == null ? '—' : `${s.videoDeltaMedian.toFixed(1)}/${s.videoDeltaMax.toFixed(1)}`;
    return (
      `${s.fps.toFixed(0)} fps · p95 ${s.frameP95.toFixed(1)}ms · render ${s.renderMedian.toFixed(1)}/${s.renderP95.toFixed(1)}ms · ` +
      `notes ${s.notes} · sprites ${s.sprites} · ${gpu}\n` +
      `step ${(s.stepMedian * 1000).toFixed(1)}ms · frozen ${s.frozen}/${s.window} · ` +
      `Δdsp ${dsp}ms · Δvideo ${video}ms\n` +
      `audio late ${s.audioLate} · dropped ${s.audioDropped} · resync ${s.audioResync} · long task ${s.longTaskMax}ms`
    );
  }

  return {
    markFrame,
    markRender,
    summary,
    overlay,
    setScene(patch) {
      Object.assign(scene, patch);
      cached = null;
    },
    get scene() {
      return { ...scene };
    },
    reset() {
      deltas.length = 0;
      renders.length = 0;
      lags.length = 0;
      steps.length = 0;
      dspDeltas.length = 0;
      videoDeltas.length = 0;
      longTasks.length = 0;
      spikes.length = 0;
      frames = 0;
      started = now();
      lastRaf = 0;
      lastTime = null;
      cached = null;
    },
    report() {
      const s = summary();
      console.info(`[${label} perf]`, { ...s, scene: { ...scene } }, spikes.slice(-15));
      return { ...s, scene: { ...scene } };
    },
  };
}

/** ?perf=1 强制打开性能信息（正式开关在播放器设置里） */
export function perfForced() {
  try {
    return new URLSearchParams(location.search).get('perf') === '1';
  } catch {
    return false;
  }
}
