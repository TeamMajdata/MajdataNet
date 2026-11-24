/**
 * BPM Tap：逻辑照抄 MajdataEdit-Neo 的 BpmTapWindow.axaml.cs
 * —— 每两次点击算 60/Δt，超过 20 个就去掉一个最小和一个最大，结果直接显示在按钮上。
 */
import { useCallback, useRef, useState } from 'react';
import EditorWindow from './EditorWindow';

export default function BpmTapWindow({ onClose }: { onClose: () => void }) {
  const tapsRef = useRef<number[]>([]);
  const lastRef = useRef<number | null>(null);
  const [bpm, setBpm] = useState<number | null>(null);

  const tap = useCallback(() => {
    const now = performance.now();
    const last = lastRef.current;
    lastRef.current = now;
    if (last === null) return;

    const delta = (now - last) / 1000;
    if (delta <= 0.05) return; // 手抖的连点，忽略

    const list = [...tapsRef.current, 60 / delta];
    if (list.length > 20) {
      list.splice(list.indexOf(Math.min(...list)), 1);
      list.splice(list.indexOf(Math.max(...list)), 1);
    }
    tapsRef.current = list;
    setBpm(list.reduce((sum, value) => sum + value, 0) / list.length);
  }, []);

  const reset = useCallback(() => {
    tapsRef.current = [];
    lastRef.current = null;
    setBpm(null);
  }, []);

  return (
    <EditorWindow title="BPM Tap" onClose={onClose} hint="拖动标题栏可移动 · 编辑器仍可继续输入">
      <button type="button" className="editor-bpm-tap" onClick={tap}>
        {bpm === null ? 'Tap' : bpm.toFixed(1)}
      </button>
      <button type="button" className="editor-bpm-reset" onClick={reset}>Reset</button>
    </EditorWindow>
  );
}
