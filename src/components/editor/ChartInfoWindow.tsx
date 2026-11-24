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
import { useTranslation } from 'react-i18next';
import { LuPlus, LuX } from 'react-icons/lu';
import EditorWindow from './EditorWindow';
import { getField, listFields, removeField, setField } from '@/utils/maidataEdit';

const FUUMEN_KEY = /^inote_\d+$/;
const KEY_SHAPE = /^[\w-]+$/;
/** 这些字段有自己的专门 UI（标题 / 曲师 / 谱师 / First / 难度），不在「其它字段」里重复出现 */
const STRUCTURED_KEY = /^(title|artist|first|first_\d+|lv_\d+|des_\d+)$/;

type ErrorKey = '' | 'editor/ChartInfoWindow.InvalidKey' | 'editor/ChartInfoWindow.DuplicateKey';

type Props = {
  maidata: string;
  /** 当前难度：谱师取 &des_{level+1} */
  level: number;
  onApply: (next: string) => void;
  onClose: () => void;
};

export default function ChartInfoWindow({ maidata, level, onApply, onClose }: Props) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState(maidata);
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [error, setError] = useState<ErrorKey>('');

  // title / artist / 谱师 单独一栏；谱面正文和结构化字段不在这里编辑
  const commands = listFields(draft).filter(
    (field) => !FUUMEN_KEY.test(field.key) && !STRUCTURED_KEY.test(field.key),
  );
  const designerKey = `des_${level + 1}`;

  const write = (key: string, value: string) => setDraft((prev) => setField(prev, key, value));

  const addCommand = () => {
    const key = newKey.trim();
    if (!KEY_SHAPE.test(key)) {
      setError('editor/ChartInfoWindow.InvalidKey');
      return;
    }
    if (listFields(draft).some((field) => field.key === key)) {
      setError('editor/ChartInfoWindow.DuplicateKey');
      return;
    }
    setError('');
    setDraft((prev) => setField(prev, key, newValue));
    setNewKey('');
    setNewValue('');
  };

  return (
    <EditorWindow
      title={t('editor/ChartInfoWindow.Title')}
      width={560}
      onClose={onClose}
      hint={t('editor/ChartInfoWindow.Hint')}
    >
      <div className="editor-info">
        <label className="editor-info-row">
          <span className="editor-info-label">{t('editor/ChartInfoWindow.ChartTitle')}</span>
          <input value={getField(draft, 'title') ?? ''} onChange={(event) => write('title', event.target.value)} />
        </label>
        <label className="editor-info-row">
          <span className="editor-info-label">{t('editor/ChartInfoWindow.Artist')}</span>
          <input value={getField(draft, 'artist') ?? ''} onChange={(event) => write('artist', event.target.value)} />
        </label>
        <label className="editor-info-row">
          <span className="editor-info-label">{t('editor/ChartInfoWindow.Designer')}</span>
          <input
            value={getField(draft, designerKey) ?? ''}
            onChange={(event) => write(designerKey, event.target.value)}
          />
        </label>

        <div className="editor-info-head">
          <span>{t('editor/ChartInfoWindow.OtherFields')}</span>
          <small>{t('editor/ChartInfoWindow.OtherFieldsHint')}</small>
        </div>

        <div className="editor-info-list">
          {commands.map(({ key, value }) => (
            <div key={key} className="editor-info-row">
              <span className="editor-info-key">&amp;{key}</span>
              <input value={value} onChange={(event) => write(key, event.target.value)} />
              <button
                type="button"
                className="editor-info-remove"
                aria-label={t('editor/ChartInfoWindow.Remove', { key })}
                onClick={() => setDraft((prev) => removeField(prev, key))}
              >
                <LuX aria-hidden="true" />
              </button>
            </div>
          ))}
          {commands.length === 0 && <p className="editor-info-empty">{t('editor/ChartInfoWindow.Empty')}</p>}
        </div>

        <div className="editor-info-row">
          <span className="editor-info-key">&amp;</span>
          <input
            placeholder={t('editor/ChartInfoWindow.KeyPlaceholder')}
            value={newKey}
            onChange={(event) => { setNewKey(event.target.value); setError(''); }}
          />
          <input
            placeholder={t('editor/ChartInfoWindow.ValuePlaceholder')}
            value={newValue}
            onChange={(event) => setNewValue(event.target.value)}
          />
          <button
            type="button"
            className="editor-info-add"
            aria-label={t('editor/ChartInfoWindow.Add')}
            onClick={addCommand}
          >
            <LuPlus aria-hidden="true" />
          </button>
        </div>
        {error && <p className="editor-info-error" role="alert">{t(error)}</p>}

        <div className="editor-info-actions">
          <button type="button" onClick={onClose}>{t('editor/ChartInfoWindow.Cancel')}</button>
          <button type="button" className="is-primary" onClick={() => { onApply(draft); onClose(); }}>
            {t('editor/ChartInfoWindow.Confirm')}
          </button>
        </div>
      </div>
    </EditorWindow>
  );
}
