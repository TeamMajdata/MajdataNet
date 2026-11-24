// 音频分析：Aurora 的三段分频取色（schematicdnb/Aurora 的 RGBMeter）。
//
// 原实现是时域方案：Linkwitz-Riley 把信号切成低频 / 中频 / 高频，各取 RMS，
// 低频 -3dB、高频 +4.5dB 补偿，乘权重，归一化后按最亮的通道拉满 → 一个饱和色。
// 这里是离线整曲分析，用频域做等价的事：每段求和带内功率再开方，
// 和"滤波后信号的 RMS"只差一个常数，而 Aurora 的归一化会把常数约掉。
//
// 分析放在 12kHz（4:1 降采样）上：Aurora 的分频点最高才 2kHz，Nyquist 6kHz 绰绰有余，
// FFT 成本降到 1/4。窗长 512 点 = 42.7ms，正好等于它 48kHz 下 2048 点的分析窗。

/**
 * Aurora 的参数，除了 `decimate` / `fftSize` / `hop` 是分析精度以外，其它都保持原版默认：
 * 分频点 250Hz / 2kHz，低频 -3dB、高频 +4.5dB，三个通道权重都是 1
 * （见它的 PluginProcessor::createParameterLayout）。
 */
export const AURORA_DEFAULTS = {
  lowCrossover: 250,
  highCrossover: 2000,
  lowGainDb: -3,
  highGainDb: 4.5,
  weights: [1, 1, 1],
  fftSize: 1024,
  hop: 512,
  /** 原始信号 2:1 降到 24kHz 再分析（Nyquist 12kHz） */
  decimate: 2,
  sampleRate: 24000,
};

/** 就地 radix-2 FFT。返回的函数会改写传入的 real/imag。 */
export function makeFft(size) {
  const levels = Math.round(Math.log2(size));
  if (2 ** levels !== size) throw Error('FFT size must be a power of two');
  const reverse = new Uint32Array(size);
  for (let i = 0; i < size; i++) {
    let value = i;
    let result = 0;
    for (let bit = 0; bit < levels; bit++) {
      result = (result << 1) | (value & 1);
      value >>= 1;
    }
    reverse[i] = result;
  }
  const cos = new Float32Array(size / 2);
  const sin = new Float32Array(size / 2);
  for (let i = 0; i < size / 2; i++) {
    const angle = (2 * Math.PI * i) / size;
    cos[i] = Math.cos(angle);
    sin[i] = Math.sin(angle);
  }
  return function transform(real, imag) {
    for (let i = 0; i < size; i++) {
      const j = reverse[i];
      if (j > i) {
        let value = real[i];
        real[i] = real[j];
        real[j] = value;
        value = imag[i];
        imag[i] = imag[j];
        imag[j] = value;
      }
    }
    for (let span = 2; span <= size; span <<= 1) {
      const half = span >> 1;
      const step = size / span;
      for (let start = 0; start < size; start += span) {
        for (let k = 0; k < half; k++) {
          const angle = k * step;
          const wr = cos[angle];
          const wi = -sin[angle];
          const a = start + k;
          const b = a + half;
          const xr = real[b] * wr - imag[b] * wi;
          const xi = real[b] * wi + imag[b] * wr;
          real[b] = real[a] - xr;
          imag[b] = imag[a] - xi;
          real[a] += xr;
          imag[a] += xi;
        }
      }
    }
  };
}

/** Hann 窗。 */
export function hannWindow(size) {
  const window = new Float32Array(size);
  for (let i = 0; i < size; i++) window[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / size);
  return window;
}

/** 盒式平均降采样：分析前把 48kHz 降到 12kHz，顺带当抗混叠低通。 */
export function downsample(samples, factor) {
  if (!(factor > 1)) return samples;
  const length = Math.floor(samples.length / factor);
  const output = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    let sum = 0;
    const from = i * factor;
    for (let k = 0; k < factor; k++) sum += samples[from + k];
    output[i] = sum / factor;
  }
  return output;
}

/**
 * Aurora 的取色（RGBMeter::freqToColour）：三段电平 → dB 补偿 → 权重 → 归一化 →
 * 再按最亮的通道拉满。结果永远是饱和色（至少一个通道是 255）。
 * @param {number} low 低频段电平
 * @param {number} mid 中频段电平
 * @param {number} high 高频段电平
 * @param {{ lowGainDb?: number, highGainDb?: number, weights?: number[] }} [options]
 * @returns {[number, number, number]} 0..255
 */
export function auroraColor(low, mid, high, options = {}) {
  const {
    lowGainDb = AURORA_DEFAULTS.lowGainDb,
    highGainDb = AURORA_DEFAULTS.highGainDb,
    weights = AURORA_DEFAULTS.weights,
  } = options;
  let r = low * 10 ** (lowGainDb / 20) * weights[0];
  let g = mid * weights[1];
  let b = high * 10 ** (highGainDb / 20) * weights[2];
  const total = r + g + b;
  if (!(total > 0)) return [0, 0, 0];
  r /= total;
  g /= total;
  b /= total;
  const peak = Math.max(r, g, b);
  if (!(peak > 0)) return [0, 0, 0];
  return [Math.floor((r / peak) * 255), Math.floor((g / peak) * 255), Math.floor((b / peak) * 255)];
}

/**
 * 整曲逐帧分析：每帧一个颜色（以及用于调节亮度的总体电平）。
 * @param {Float32Array} samples 单声道采样（建议已降到 12kHz）
 * @param {number} rate 采样率
 * @param {object} [options]
 * @returns {{
 *   hopSeconds: number, frames: number, low: Float32Array, mid: Float32Array,
 *   high: Float32Array, color: Uint8Array, energy: Float32Array, reference: number,
 * }}
 *   `color` 每帧三个字节；`energy` 是三段电平的合成；`reference` 是 energy 的 95 分位，
 *   画的时候用它把能量归一化成透明度（安静段不要被 max 归一化放大成彩色噪点）。
 */
export function analyzeBands(samples, rate, options = {}) {
  const {
    fftSize = AURORA_DEFAULTS.fftSize,
    hop = AURORA_DEFAULTS.hop,
    lowCrossover = AURORA_DEFAULTS.lowCrossover,
    highCrossover = AURORA_DEFAULTS.highCrossover,
    lowGainDb = AURORA_DEFAULTS.lowGainDb,
    highGainDb = AURORA_DEFAULTS.highGainDb,
    weights = AURORA_DEFAULTS.weights,
  } = options;

  const frames = samples.length >= fftSize ? Math.floor((samples.length - fftSize) / hop) + 1 : 0;
  const result = {
    hopSeconds: hop / rate,
    frames,
    low: new Float32Array(frames),
    mid: new Float32Array(frames),
    high: new Float32Array(frames),
    color: new Uint8Array(frames * 3),
    energy: new Float32Array(frames),
    reference: 1,
  };
  if (frames === 0) return result;

  const transform = makeFft(fftSize);
  const real = new Float32Array(fftSize);
  const imag = new Float32Array(fftSize);
  const window = hannWindow(fftSize);
  const bins = fftSize / 2;
  // 每个 bin 属于哪一段，只和频率有关，先算好
  const bandOfBin = new Uint8Array(bins);
  for (let bin = 1; bin < bins; bin++) {
    const frequency = (bin * rate) / fftSize;
    bandOfBin[bin] = frequency < lowCrossover ? 0 : frequency < highCrossover ? 1 : 2;
  }

  const lowFactor = 10 ** (lowGainDb / 20) * weights[0];
  const midFactor = weights[1];
  const highFactor = 10 ** (highGainDb / 20) * weights[2];

  for (let frame = 0; frame < frames; frame++) {
    const start = frame * hop;
    for (let i = 0; i < fftSize; i++) {
      real[i] = samples[start + i] * window[i];
      imag[i] = 0;
    }
    transform(real, imag);

    let lowPower = 0;
    let midPower = 0;
    let highPower = 0;
    for (let bin = 1; bin < bins; bin++) {
      const power = real[bin] * real[bin] + imag[bin] * imag[bin];
      const band = bandOfBin[bin];
      if (band === 0) lowPower += power;
      else if (band === 1) midPower += power;
      else highPower += power;
    }

    // sqrt(带内功率和) 和该段滤波后的 RMS 成正比，常数在归一化时约掉
    const low = Math.sqrt(lowPower);
    const mid = Math.sqrt(midPower);
    const high = Math.sqrt(highPower);
    result.low[frame] = low;
    result.mid[frame] = mid;
    result.high[frame] = high;
    result.energy[frame] = Math.sqrt(low * low + mid * mid + high * high);

    let r = low * lowFactor;
    let g = mid * midFactor;
    let b = high * highFactor;
    const total = r + g + b;
    if (total > 0) {
      r /= total;
      g /= total;
      b /= total;
      const peak = Math.max(r, g, b);
      if (peak > 0) {
        result.color[frame * 3] = Math.floor((r / peak) * 255);
        result.color[frame * 3 + 1] = Math.floor((g / peak) * 255);
        result.color[frame * 3 + 2] = Math.floor((b / peak) * 255);
      }
    }
  }

  result.reference = percentileRange(result.energy, 0.05, 0.95).high || 1;
  return result;
}

/** 取值的百分位（默认去掉最前最后 5%）。 */
export function percentileRange(values, low = 0.05, high = 0.95) {
  const sorted = Float32Array.from(values).sort();
  if (sorted.length === 0) return { low: 0, high: 0 };
  const at = (fraction) => sorted[Math.min(sorted.length - 1, Math.max(0, Math.round((sorted.length - 1) * fraction)))];
  return { low: at(low), high: at(high) };
}
