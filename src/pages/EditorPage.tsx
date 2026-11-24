/**
 * 谱面编辑器。
 *
 * 左侧是 MajView 预览（直接吃内存里的谱面文本，边改边看），右侧是难度页签 + 谱面元信息 + Monaco。
 * 谱面文本只有一个真源 `maidata`：编辑器改的是当前难度的 `&inote_N`，保存时整份写回。
 *
 * 设计依据见 docs/analysis/editor-interaction-spec.md。
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { LuFolderOpen, LuPlay, LuSave } from 'react-icons/lu';
import MajView from '@/components/song/MajView';
import DifficultyTabs from '@/components/editor/DifficultyTabs';
import SimaiCodeEditor from '@/components/editor/SimaiCodeEditor';
import BpmTapWindow from '@/components/editor/BpmTapWindow';
import { useChartFolder } from '@/hooks/useChartFolder';
import {
  filledDifficulties,
  getDesigner,
  getDifficultyText,
  getField,
  getFirst,
  getLevel,
  setDesigner,
  setDifficultyText,
  setFirst,
  setLevel,
} from '@/utils/maidataEdit';
import '@/styles/components/editor.css';

/** 没在播放 / 没有 bg 时用 MajdataView 的默认底图 */
const DEFAULT_COVER = '/majview/skin/Default_Background.png';

const LEVEL_COUNT = 7;

function formatClock(seconds: number) {
  const total = Math.max(0, Math.floor(seconds));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

/**
 * 谱面编译本身只有 1–2ms，这里不做防抖：预览必须和输入同步，
 * 防抖反而会让"打开文件夹"后的首帧拿到空文本。
 */
export default function EditorPage() {
  const { folder, error, busy, open, download } = useChartFolder();
  const [maidata, setMaidata] = useState('');
  const [origin, setOrigin] = useState('');
  const [active, setActive] = useState(4);
  const [fileMenuOpen, setFileMenuOpen] = useState(false);
  const [bpmOpen, setBpmOpen] = useState(false);
  const [time, setTime] = useState(0);
  const [saving, setSaving] = useState(false);
  const lastSecondRef = useRef(-1);

  // 打开文件夹：整份文本作为新的真源，并跳到第一个有内容的难度
  useEffect(() => {
    if (!folder) return;
    setMaidata(folder.maidata);
    setOrigin(folder.maidata);
    const filled = filledDifficulties(folder.maidata);
    const first = filled.findIndex(Boolean);
    setActive(first === -1 ? 4 : first);
    lastSecondRef.current = -1;
    setTime(0);
  }, [folder]);

  // 编辑器只在挂载时取一次初值，之后自己持有每个难度的 model
  const initialTexts = useMemo(
    () => Array.from({ length: LEVEL_COUNT }, (_, level) => getDifficultyText(folder?.maidata ?? '', level)),
    [folder],
  );

  const dirty = useMemo(() => {
    const perLevel = Array.from({ length: LEVEL_COUNT }, (_, level) =>
      getDifficultyText(maidata, level) !== getDifficultyText(origin, level)
      || getLevel(maidata, level) !== getLevel(origin, level)
      || getDesigner(maidata, level) !== getDesigner(origin, level));
    const globalChanged = ['title', 'artist', 'first']
      .some((key) => getField(maidata, key) !== getField(origin, key));
    return { perLevel, global: globalChanged };
  }, [maidata, origin]);
  const anyDirty = dirty.perLevel.some(Boolean) || dirty.global;

  const handleEditorChange = useCallback((level: number, text: string) => {
    setMaidata((prev) => setDifficultyText(prev, level, text));
  }, []);

  const handleTime = useCallback((value: number) => {
    const second = Math.floor(value);
    if (second === lastSecondRef.current) return;
    lastSecondRef.current = second;
    setTime(value);
  }, []);

  const save = useCallback(async () => {
    if (!folder) return;
    setSaving(true);
    try {
      if (folder.save) await folder.save(maidata);
      else download(maidata);
      setOrigin(maidata);
    } finally {
      setSaving(false);
    }
  }, [folder, maidata, download]);

  // 点菜单外面收起
  useEffect(() => {
    if (!fileMenuOpen) return;
    const close = () => setFileMenuOpen(false);
    window.addEventListener('pointerdown', close);
    return () => window.removeEventListener('pointerdown', close);
  }, [fileMenuOpen]);

  const title = getField(maidata, 'title') ?? folder?.name ?? '';
  const artist = getField(maidata, 'artist') ?? '';
  const cover = folder?.coverUrl ?? DEFAULT_COVER;

  return (
    <>
      <Helmet>
        <title>{folder ? `${title} · 谱面编辑器 | Majdata.Net` : '谱面编辑器 | Majdata.Net'}</title>
      </Helmet>

      <div className="editor-app">
        <header className="editor-menubar">
          <Link to="/" className="editor-brand">Majdata.Net</Link>

          <div className="editor-menu-wrap">
            <button
              type="button"
              className={`editor-top-item${fileMenuOpen ? ' is-open' : ''}`}
              onClick={(event) => { event.stopPropagation(); setFileMenuOpen((open2) => !open2); }}
            >
              文件
            </button>
            {fileMenuOpen && (
              <div className="editor-menu" onPointerDown={(event) => event.stopPropagation()}>
                <button type="button" onClick={() => { setFileMenuOpen(false); void open(); }} disabled={busy}>
                  <LuFolderOpen aria-hidden="true" />打开文件夹…
                </button>
                <button type="button" onClick={() => { setFileMenuOpen(false); void save(); }} disabled={!folder || saving}>
                  <LuSave aria-hidden="true" />保存
                </button>
              </div>
            )}
          </div>

          <button type="button" className="editor-top-item" onClick={() => setBpmOpen(true)}>BPM Tap</button>

          <span className="editor-spacer" />

          {folder && (
            <span className={`editor-save${anyDirty ? ' is-dirty' : ' is-saved'}`}>
              <i aria-hidden="true" />
              {anyDirty ? '未保存' : '已保存'}
            </span>
          )}
        </header>

        {!folder ? (
          <div className="editor-empty">
            <h1>谱面编辑器</h1>
            <p>选择一个本地谱面文件夹，包含 maidata.txt（以及可选的 track、bg、pv）。文件不会被上传。</p>
            <button type="button" className="editor-open-button" onClick={() => void open()} disabled={busy}>
              <LuFolderOpen aria-hidden="true" />{busy ? '打开中…' : '打开文件夹'}
            </button>
            {error && <p className="editor-error" role="alert">{error}</p>}
          </div>
        ) : (
          <main className="editor-main">
            <section className="editor-stage">
              {/* 文本还没就位时先不挂播放器，否则首帧会带着空谱面进错误态 */}
              {maidata && (
                <MajView
                  key={folder.name}
                  chartText={maidata}
                  trackUrl={folder.trackUrl ?? ''}
                  videoUrl={folder.videoUrl}
                  title={title}
                  artist={artist}
                  level={active}
                  cover={cover}
                  onTime={handleTime}
                />
              )}
            </section>

            <section className="editor-side">
              <DifficultyTabs active={active} dirty={dirty.perLevel} onSelect={setActive} />

              <div className="editor-controls">
                <div className="editor-clock">
                  <b>{formatClock(time)}</b>
                  <small>{folder.name}</small>
                </div>

                <label className="editor-field">
                  <span>难度</span>
                  <input
                    value={getLevel(maidata, active)}
                    onChange={(event) => setMaidata((prev) => setLevel(prev, active, event.target.value))}
                    placeholder="14+"
                  />
                </label>

                <label className="editor-field">
                  <span>制谱人</span>
                  <input
                    value={getDesigner(maidata, active)}
                    onChange={(event) => setMaidata((prev) => setDesigner(prev, active, event.target.value))}
                    placeholder="designer"
                  />
                </label>

                <label className="editor-field">
                  <span>First</span>
                  <input
                    key={`${folder.name}-${active}`}
                    type="number"
                    step="0.01"
                    defaultValue={getFirst(maidata)}
                    onBlur={(event) => {
                      const value = Number(event.target.value);
                      if (Number.isFinite(value)) setMaidata((prev) => setFirst(prev, value));
                    }}
                  />
                </label>

                <div className="editor-controls-hint">
                  <LuPlay aria-hidden="true" />
                  播放控制在预览下方
                </div>
              </div>

              <div className="editor-editor">
                <SimaiCodeEditor
                  key={folder.name}
                  initialTexts={initialTexts}
                  active={active}
                  onChange={handleEditorChange}
                />
              </div>
            </section>
          </main>
        )}

        {bpmOpen && <BpmTapWindow onClose={() => setBpmOpen(false)} />}
      </div>
    </>
  );
}
