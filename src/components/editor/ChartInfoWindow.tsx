/**
 * 谱面信息窗：改全局字段（title / artist）和任意 `&k=v` 命令。
 *
 * 上游的 ChartInfoWindow 左边选封面 / 背景视频、右边是标题、曲师和一列命令；
 * 网页版没有"往用户目录里写文件"的权限，所以封面/背景这一块先不做，
 * 只保留能真正改到 maidata.txt 的部分。
 *
 * 所有编辑都作用在一份草稿文本上，确定时才整体交回页面——取消就是丢弃。
 */
import { useState } from 'react';
import { LuPlus, LuX } from 'react-icons/lu';
import EditorWindow from './EditorWindow';
import { getField, listFields, removeField, setField } from '@/utils/maidataEdit';

const FUUMEN_KEY = /^inote_\d+$/;
const KEY_SHAPE = /^[\w-]+$/;

type Props = {
  maidata: string;
  onApply: (next: string) => void;
  onClose: () => void;
};

export default function ChartInfoWindow({ maidata, onApply, onClose }: Props) {
  const [draft, setDraft] = useState(maidata);
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [error, setError] = useState('');

  // title / artist 单独一栏；谱面正文不在这里编辑
  const commands = listFields(draft).filter(
    (field) => !FUUMEN_KEY.test(field.key) && field.key !== 'title' && field.key !== 'artist',
  );

  const write = (key: string, value: string) => setDraft((prev) => setField(prev, key, value));

  const addCommand = () => {
    const key = newKey.trim();
    if (!KEY_SHAPE.test(key)) {
      setError('字段名只能包含字母、数字、下划线和连字符');
      return;
    }
    if (listFields(draft).some((field) => field.key === key)) {
      setError('这个字段已经存在了');
      return;
    }
    setError('');
    setDraft((prev) => setField(prev, key, newValue));
    setNewKey('');
    setNewValue('');
  };

  return (
    <EditorWindow
      title="谱面信息"
      width={560}
      onClose={onClose}
      hint="改动只作用于内存里的 maidata.txt，点「确定」后仍需保存才写回文件"
    >
      <div className="editor-info">
        <label className="editor-info-row">
          <span className="editor-info-label">曲名</span>
          <input value={getField(draft, 'title') ?? ''} onChange={(event) => write('title', event.target.value)} />
        </label>
        <label className="editor-info-row">
          <span className="editor-info-label">曲师</span>
          <input value={getField(draft, 'artist') ?? ''} onChange={(event) => write('artist', event.target.value)} />
        </label>

        <div className="editor-info-head">
          <span>其它字段</span>
          <small>按 `&名称=值` 直接对应 maidata.txt</small>
        </div>

        <div className="editor-info-list">
          {commands.map(({ key, value }) => (
            <div key={key} className="editor-info-row">
              <span className="editor-info-key">&amp;{key}</span>
              <input value={value} onChange={(event) => write(key, event.target.value)} />
              <button
                type="button"
                className="editor-info-remove"
                aria-label={`删除字段 ${key}`}
                onClick={() => setDraft((prev) => removeField(prev, key))}
              >
                <LuX aria-hidden="true" />
              </button>
            </div>
          ))}
          {commands.length === 0 && <p className="editor-info-empty">没有其它字段</p>}
        </div>

        <div className="editor-info-row">
          <span className="editor-info-key">&amp;</span>
          <input placeholder="字段名" value={newKey} onChange={(event) => { setNewKey(event.target.value); setError(''); }} />
          <input placeholder="值" value={newValue} onChange={(event) => setNewValue(event.target.value)} />
          <button type="button" className="editor-info-add" aria-label="添加字段" onClick={addCommand}>
            <LuPlus aria-hidden="true" />
          </button>
        </div>
        {error && <p className="editor-info-error" role="alert">{error}</p>}

        <div className="editor-info-actions">
          <button type="button" onClick={onClose}>取消</button>
          <button type="button" className="is-primary" onClick={() => { onApply(draft); onClose(); }}>确定</button>
        </div>
      </div>
    </EditorWindow>
  );
}
