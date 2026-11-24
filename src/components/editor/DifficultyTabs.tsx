/**
 * 难度页签：七个档位常驻，没有内容的也在。
 * 有未保存改动的档位在名字后面显示一个 `*`。
 */
import { useTranslation } from 'react-i18next';

export const DIFFICULTY_NAMES = ['EASY', 'BASIC', 'ADVANCED', 'EXPERT', 'MASTER', 'RE:MASTER', 'UTAGE'] as const;

type Props = {
  active: number;
  dirty: boolean[];
  onSelect: (level: number) => void;
};

export default function DifficultyTabs({ active, dirty, onSelect }: Props) {
  const { t } = useTranslation();

  return (
    <div className="editor-tabs" role="tablist" aria-label={t('editor/DifficultyTabs.Label')}>
      {DIFFICULTY_NAMES.map((name, level) => (
        <button
          key={name}
          type="button"
          role="tab"
          aria-selected={level === active}
          className={`editor-tab${level === active ? ' is-active' : ''}`}
          onClick={() => onSelect(level)}
        >
          {name}
          {dirty[level] && (
            <span className="editor-tab-dirty" aria-label={t('editor/DifficultyTabs.Dirty')}>*</span>
          )}
        </button>
      ))}
    </div>
  );
}
