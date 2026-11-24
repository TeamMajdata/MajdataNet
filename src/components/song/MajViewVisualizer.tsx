/**
 * 播放器下方的谱面时间轴：移植自 MajdataEdit-Neo 的 SimaiVisualizerControl
 * （Controls/SimaiVisualizerControl.cs）。绘制在 src/majview/visualizer.js，
 * 这个组件只负责建画布、跟尺寸、把内容转给绘制器。
 *
 * 时间由 MajView 的 frame() 每帧推进来（和判定盘同一个时钟），所以没有自己的 rAF。
 * 和原控件一样是纯视图：当前时间固定在正中间，谱面、波形、BPM 和拍线随着播放往左滚。
 */
import { useEffect, useImperativeHandle, useRef, type Ref } from 'react';
import { Visualizer } from '@/majview/visualizer.js';
import { compileChart } from '@/majview/simai.js';

export type VisualizerHandle = { render(time: number): void };

/** 频谱分析的产物（spectrum.worker.js 传回来的那份）：每帧一个颜色。 */
export type SpectrumAnalysis = {
  hopSeconds: number;
  frames: number;
  /** 每帧三个字节：Aurora 三段分频算出来的 RGB */
  color: Uint8Array;
};

type Content = {
  chart: ReturnType<typeof compileChart>;
  waveform: Float32Array | null;
  waveformDuration: number;
  offset: number;
  zoom: number;
  analysis: SpectrumAnalysis | null;
  /** 文本光标所在的时间：时间轴顶部的小三角跟着它走 */
  caretTime: number | null;
};

type Props = {
  chart: ReturnType<typeof compileChart> | null;
  waveform: Float32Array | null;
  /** 音乐本身的长度：波形不会画到这个时间之外 */
  waveformDuration: number;
  /** 频谱颜色；还没算出来时波形是纯绿的 */
  analysis: SpectrumAnalysis | null;
  /** First 偏移（秒）：谱面时间往右挪这么多 */
  offset: number;
  /** 中线两侧各显示多少秒（原控件的 ZoomLevel） */
  zoom?: number;
  /** 文本光标时间（秒）；null 时不画三角 */
  caretTime?: number | null;
  ref?: Ref<VisualizerHandle>;
};

export default function MajViewVisualizer({
  chart,
  waveform,
  waveformDuration,
  analysis,
  offset,
  zoom = 3,
  caretTime = null,
  ref,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const visualizerRef = useRef<Visualizer | null>(null);
  const contentRef = useRef<Content | null>(null);

  // 画布和绘制器只建一次
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const visualizer = new Visualizer(canvas);
    visualizerRef.current = visualizer;
    if (contentRef.current) visualizer.setContent(contentRef.current);
    // 控制条宽度跟着窗口走（全屏、转屏都会变）
    const observer = new ResizeObserver(() => visualizer.resize());
    observer.observe(canvas);
    return () => {
      observer.disconnect();
      visualizerRef.current = null;
    };
  }, []);

  // 谱面 / 波形 / 频谱 / 偏移 / 缩放变了才重建窗口模型
  useEffect(() => {
    const content = chart ? { chart, waveform, waveformDuration, analysis, offset, zoom, caretTime } : null;
    contentRef.current = content;
    visualizerRef.current?.setContent(content);
  }, [chart, waveform, waveformDuration, analysis, offset, zoom, caretTime]);

  useImperativeHandle(ref, () => ({ render: (time: number) => visualizerRef.current?.render(time) }), []);

  return <canvas ref={canvasRef} className="majview-visualizer" aria-hidden="true" />;
}
