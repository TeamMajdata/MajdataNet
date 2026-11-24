/**
 * 可编辑的 simai 编辑器。每个难度一个 Monaco model，所以切页签时各自的撤销栈都在。
 * 组件只负责"文本 → 页面"，不持有业务状态。
 */
import { useEffect, useRef } from 'react';
import { monaco, setupSimai, type SimaiEditor } from '@/components/song/monacoSimai';

type Props = {
  /** 七个难度在挂载时的文本；之后由编辑器自己持有 */
  initialTexts: string[];
  active: number;
  onChange: (level: number, text: string) => void;
  onReady?: (editor: SimaiEditor) => void;
};

export default function SimaiCodeEditor({ initialTexts, active, onChange, onReady }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<SimaiEditor | null>(null);
  const modelsRef = useRef<(monaco.editor.ITextModel | null)[]>(new Array(7).fill(null));

  // 回调/初值走 ref，避免重建编辑器。ref 只在 effect 里更新（渲染期写 ref 会被
  // react-hooks/refs 规则拦下）；初值用 useRef 的初始值捕获，组件按文件夹 key 重建。
  const activeRef = useRef(active);
  const onChangeRef = useRef(onChange);
  const onReadyRef = useRef(onReady);
  const initialRef = useRef(initialTexts);

  useEffect(() => { activeRef.current = active; }, [active]);
  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);
  useEffect(() => { onReadyRef.current = onReady; }, [onReady]);

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
    });
    editorRef.current = editor;

    const subscription = editor.onDidChangeModelContent(() => {
      onChangeRef.current(activeRef.current, editor.getValue());
    });
    onReadyRef.current?.(editor);

    return () => {
      subscription.dispose();
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
  }, [active]);

  return <div ref={hostRef} className="editor-code" />;
}
