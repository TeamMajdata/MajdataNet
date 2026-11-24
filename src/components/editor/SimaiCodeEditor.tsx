/**
 * 可编辑的 simai 编辑器。每个难度一个 Monaco model，所以切页签时各自的撤销栈都在。
 * 组件只负责"文本 → 页面"，不持有业务状态。
 */
import { useEffect, useRef } from 'react';
// 项目引的是 monaco 的 editor.api（只要内核），查找控件要单独注册进来，
// 菜单里的「查找替换」才能用 editor.getAction('actions.find')。
import 'monaco-editor/editor/contrib/find/browser/findController.js';
// 查找窗的按钮图标走 codicon 字体：@font-face 和基础样式必须自己引，
// 否则那些按钮会显示成空白方块（glyph 规则是 Monaco 运行时注入的，不受影响）
import 'monaco-codicon/codicon.css';
import { monaco, setupSimai, type SimaiEditor } from '@/components/song/monacoSimai';

type Props = {
  /** 七个难度在挂载时的文本；之后由编辑器自己持有 */
  initialTexts: string[];
  active: number;
  onChange: (level: number, text: string) => void;
  onReady?: (editor: SimaiEditor) => void;
  /** 选区是否非空——编辑菜单的变换只在有选区时才生效 */
  onSelectionChange?: (hasSelection: boolean) => void;
  /** 光标位置变化（line / column 均 1-based） */
  onCursorLineChange?: (line: number, column: number) => void;
  /** Ctrl / Cmd + 点击文本：跳到光标所在的那一行 */
  onCtrlClickLine?: (line: number, column: number) => void;
};

export default function SimaiCodeEditor({
  initialTexts, active, onChange, onReady, onSelectionChange, onCursorLineChange, onCtrlClickLine,
}: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<SimaiEditor | null>(null);
  const modelsRef = useRef<(monaco.editor.ITextModel | null)[]>(new Array(7).fill(null));

  // 回调/初值走 ref，避免重建编辑器。ref 只在 effect 里更新（渲染期写 ref 会被
  // react-hooks/refs 规则拦下）；初值用 useRef 的初始值捕获，组件按文件夹 key 重建。
  const activeRef = useRef(active);
  const onChangeRef = useRef(onChange);
  const onReadyRef = useRef(onReady);
  const initialRef = useRef(initialTexts);
  const onSelectionChangeRef = useRef(onSelectionChange);
  const onCursorLineChangeRef = useRef(onCursorLineChange);
  const onCtrlClickLineRef = useRef(onCtrlClickLine);

  useEffect(() => { activeRef.current = active; }, [active]);
  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);
  useEffect(() => { onReadyRef.current = onReady; }, [onReady]);
  useEffect(() => { onSelectionChangeRef.current = onSelectionChange; }, [onSelectionChange]);
  useEffect(() => { onCursorLineChangeRef.current = onCursorLineChange; }, [onCursorLineChange]);
  useEffect(() => { onCtrlClickLineRef.current = onCtrlClickLine; }, [onCtrlClickLine]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    setupSimai();

    const editor = monaco.editor.create(host, {
      theme: 'majdata',
      automaticLayout: true,
      minimap: { enabled: false },
      folding: false,
      glyphMargin: false,
      lineNumbers: 'on',
      lineNumbersMinChars: 3,
      lineDecorationsWidth: 10,
      scrollBeyondLastLine: false,
      renderLineHighlight: 'none',
      overviewRulerBorder: false,
      hideCursorInOverviewRuler: true,
      stickyScroll: { enabled: false },
      guides: { indentation: false },
      bracketPairColorization: { enabled: false },
      unicodeHighlight: { ambiguousCharacters: false },
      fixedOverflowWidgets: true,
      scrollbar: { verticalScrollbarSize: 8, horizontalScrollbarSize: 8 },
      fontSize: 13,
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
      padding: { top: 12, bottom: 12 },
      // Ctrl+点击留给我们自己做「跳到那一刻」，不要变成多光标
      multiCursorModifier: 'alt',
    });
    editorRef.current = editor;

    const subscription = editor.onDidChangeModelContent(() => {
      onChangeRef.current(activeRef.current, editor.getValue());
    });
    const selectionSubscription = editor.onDidChangeCursorSelection(() => {
      const selection = editor.getSelection();
      onSelectionChangeRef.current?.(Boolean(selection && !selection.isEmpty()));
      const position = editor.getPosition();
      if (position) onCursorLineChangeRef.current?.(position.lineNumber, position.column);
    });
    onReadyRef.current?.(editor);

    return () => {
      subscription.dispose();
      selectionSubscription.dispose();
      editor.dispose();
      for (const model of modelsRef.current) model?.dispose();
      modelsRef.current = new Array(7).fill(null);
      editorRef.current = null;
    };
  }, []);

  // 切难度：换 model（没有就按初值建一个）
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    let model = modelsRef.current[active];
    if (!model) {
      model = monaco.editor.createModel(initialRef.current[active] ?? '', 'simai');
      modelsRef.current[active] = model;
    }
    if (editor.getModel() !== model) editor.setModel(model);
    // 换 model 之后选区一定是空的
    onSelectionChangeRef.current?.(false);
  }, [active]);

  return (
    <div
      ref={hostRef}
      className="editor-code"
      // Ctrl/Cmd + 点击：等 Monaco 把光标挪到点击处之后再读行号
      onMouseDownCapture={(event) => {
        if (!(event.ctrlKey || event.metaKey)) return;
        const editor = editorRef.current;
        if (!editor) return;
        setTimeout(() => {
          const position = editor.getPosition();
          if (!position) return;
          // Monaco 可能把这次点击当成拖选的起点，先把选区收起来
          editor.setSelection({
            startLineNumber: position.lineNumber,
            startColumn: position.column,
            endLineNumber: position.lineNumber,
            endColumn: position.column,
          });
          onCtrlClickLineRef.current?.(position.lineNumber, position.column);
        }, 0);
      }}
    />
  );
}
