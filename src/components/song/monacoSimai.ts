/**
 * Monaco 的 simai 语言注册：worker、Monarch 语法、暗色主题。
 *
 * 只需要编辑器内核，所以从 `monaco-editor/editor/editor.api.js` 引入；注意 monaco 0.57 的
 * package exports 把 `./*` 映射到 `./esm/vs/*.js`，网上常见的 `monaco-editor/esm/vs/...` 写法
 * 在 Vite 里会解析失败。worker 用 Vite 的 `?worker` 引入，构建时会单独产出 chunk。
 */
import * as monaco from 'monaco-editor/editor/editor.api.js';
import EditorWorker from 'monaco-editor/editor/editor.worker.js?worker';
import { SIMAI_TOKEN_RULES } from '@/utils/simaiMonarch';

export const SIMAI_LANGUAGE_ID = 'simai';
export const SIMAI_THEME_ID = 'majdata';

export type SimaiEditor = monaco.editor.IStandaloneCodeEditor;

// 不配 worker 时编辑器能显示，但控制台会报错、部分功能降级（快速建议、链接等）
(self as unknown as { MonacoEnvironment?: { getWorker: () => Worker } }).MonacoEnvironment = {
  getWorker: () => new EditorWorker(),
};

let initialized = false;

/** 注册 simai 语言和主题；重复调用无副作用（页签切来切去会多次创建编辑器） */
export function setupSimai() {
  if (initialized) return;
  initialized = true;

  // HMR 重新执行这个模块时语言可能已经注册过，重复注册 Monaco 会报警告
  if (!monaco.languages.getLanguages().some(({ id }) => id === SIMAI_LANGUAGE_ID)) {
    monaco.languages.register({ id: SIMAI_LANGUAGE_ID });
  }
  monaco.languages.setMonarchTokensProvider(SIMAI_LANGUAGE_ID, {
    tokenizer: {
      // 规则顺序即优先级（Monarch 取第一个匹配），详见 simaiMonarch.ts
      root: SIMAI_TOKEN_RULES.map(([regex, token]): [RegExp, string] => [regex, token]),
    },
  });

  monaco.editor.defineTheme(SIMAI_THEME_ID, {
    base: 'vs-dark',
    inherit: true,
    // defineTheme 必须带 rules，只传 colors 会在运行时抛 "reading 'fontStyle'"
    // 颜色参照时间轴（visualizer.js 的 VISUALIZER_COLORS）：tap/hold 粉、slide 天蓝、
    // touch 深天蓝、break 橙红、each 金、BPM/节拍黄，注释和分隔符压暗
    rules: [
      { token: 'comment', foreground: '6B7280', fontStyle: 'italic' },
      { token: 'bpm', foreground: 'FFFF00' },
      { token: 'measure', foreground: 'FDE047' },
      { token: 'period', foreground: '5EEAD4' },
      { token: 'speed', foreground: 'A3E635' },
      { token: 'end', foreground: '9CA3AF' },
      { token: 'touch', foreground: '00BFFF' },
      { token: 'hold', foreground: 'FF9EC4' },
      { token: 'slide', foreground: '87CEEB' },
      { token: 'break', foreground: 'FF4500' },
      { token: 'tap', foreground: 'FFB6C1' },
      { token: 'each', foreground: 'FFD700' },
      { token: 'modifier', foreground: 'A3A3A3' },
      { token: 'delimiter', foreground: '4B5563' },
    ],
    colors: {
      'editor.background': '#0e1218',
      'editor.foreground': '#e6edf3',
      'editorLineNumber.foreground': '#3f4a5a',
      'editorLineNumber.activeForeground': '#94a3b8',
      'editor.lineHighlightBackground': '#00000000',
      'editor.selectionBackground': '#60a5fa59',
      'editor.inactiveSelectionBackground': '#60a5fa33',
      'editorCursor.foreground': '#00000000',
      'editorGutter.background': '#0e1218',
      'editorOverviewRuler.border': '#00000000',
      'editorIndentGuide.background1': '#00000000',
      'editorIndentGuide.activeBackground1': '#00000000',
      'scrollbarSlider.background': '#ffffff14',
      'scrollbarSlider.hoverBackground': '#ffffff24',
      'scrollbarSlider.activeBackground': '#ffffff33',
      'editorWidget.background': '#161b22',
      'editorWidget.border': '#30363d',
      'input.background': '#0d1117',
      'input.border': '#30363d',
    },
  });
}

export { monaco };
