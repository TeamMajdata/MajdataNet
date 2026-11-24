// 频谱分析的 Worker：整曲 FFT 大约 200ms，放主线程会卡住画面。
// 主线程只做 4:1 降采样（约 2MB 拷贝），把采样转移进来，这里算完再把颜色转移回去。
import { analyzeBands } from './spectrum.js';

self.onmessage = (event) => {
  const { samples, rate, options } = event.data;
  const analysis = analyzeBands(samples, rate, options);
  self.postMessage(
    { hopSeconds: analysis.hopSeconds, frames: analysis.frames, color: analysis.color },
    [analysis.color.buffer],
  );
};
