/**
 * 谱面文件页签：用 Monaco 只读展示当前难度的 simai 谱面（maidata.txt 里的 &inote_N= 字段）。
 *
 * 谱面文本走和侧栏 BPM / 预览相同的 SWR key，页面打开时已经取过，切到这个页签不会再发请求。
 * Monaco 体积大（约 700 KB gzip），所以本组件由 SongPage 懒加载，只有打开页签时才下载。
 */
import { useEffect, useMemo, useRef } from 'react';
import useSWR from 'swr';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { LuCopy } from 'react-icons/lu';
import { endpoints } from '@/config/api';
import { loadChartText } from '@/majview/chartCache';
import { extractDifficulty } from '@/utils/simaiSection';
import SectionLoading from '@/components/ui/SectionLoading';
import { monaco, setupSimai, type SimaiEditor } from './monacoSimai';
import '@/styles/components/simai-code.css';

const fetchChart = (url: string) => loadChartText(url);

const ACTION_BUTTON = 'inline-flex items-center gap-1.5 bg-white/[0.06] hover:bg-white/10 px-3 border border-white/10 hover:border-white/20 rounded-lg h-8 font-medium text-white/85 hover:text-white text-xs whitespace-nowrap transition-colors cursor-pointer';

export default function ChartFile({ songId, level }: {
  songId: string;
  /** 0-based 难度下标，对应 maidata 里的 &inote_{level+1} */
  level?: number;
}) {
  const { t } = useTranslation();
  // 和 useChartMeta 用同一个 key：命中 SWR 缓存，不会重复下载谱面
  const { data: text, error, isLoading, mutate } = useSWR(
    endpoints.maichart.prefix(songId) + '/chart',
    fetchChart,
    { revalidateOnFocus: false, shouldRetryOnError: false },
  );
  const chart = useMemo(
    () => (text && level !== undefined ? extractDifficulty(text, level) : ''),
    [text, level],
  );

  async function copy() {
    try {
      await navigator.clipboard.writeText(chart);
      toast.success(t('song/ChartFile.Copied'));
    } catch {
      toast.error(t('song/ChartFile.CopyFailed'));
    }
  }

  if (isLoading) return <SectionLoading />;

  if (error) {
    return (
      <div className="flex flex-col justify-center items-center gap-3 py-16" role="alert">
        <p className="m-0 text-white/60 text-sm">{t('song/ChartFile.LoadFailed')}</p>
        <button type="button" className={ACTION_BUTTON} onClick={() => void mutate()}>
          {t('song/ChartFile.Retry')}
        </button>
      </div>
    );
  }

  if (!chart) {
    return <p className="m-0 py-16 text-white/45 text-sm text-center">{t('song/ChartFile.EmptyLevel')}</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-between items-center gap-3">
        <code className="font-mono text-white/70 text-xs">
          &amp;inote_{level === undefined ? '?' : level + 1}
        </code>
        <button type="button" className={ACTION_BUTTON} onClick={() => void copy()}>
          <LuCopy aria-hidden="true" className="w-3.5 h-3.5" />{t('song/ChartFile.Copy')}
        </button>
      </div>
      <ChartEditor value={chart} label={t('song/ChartFile.Title')} />
    </div>
  );
}

/** 一次只读 Monaco 实例；换难度时重建，组件卸载时连同 model 一起释放 */
function ChartEditor({ value, label }: { value: string; label: string }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<SimaiEditor | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    setupSimai();
    const model = monaco.editor.createModel(value, 'simai');
    const editor = monaco.editor.create(host, {
      model,
      theme: 'majdata',
      readOnly: true,
      domReadOnly: true,
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
    return () => {
      editor.dispose();
      if (!model.isDisposed()) model.dispose();
      editorRef.current = null;
    };
  }, [value]);

  // 语言切换时只更新读屏名称，不重建编辑器
  useEffect(() => {
    editorRef.current?.updateOptions({ ariaLabel: label });
  }, [label]);

  return <div ref={hostRef} className="chart-file-editor" role="group" aria-label={label} />;
}
