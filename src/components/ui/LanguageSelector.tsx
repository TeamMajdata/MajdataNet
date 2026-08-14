/**
 * 语言选择器组件
 */
import { useI18n } from '@/hooks/useI18n';
import { LANGUAGE_CONFIG } from '@/config/i18n';
import { Languages } from 'lucide-react';

export default function LanguageSelector() {
  const { language, changeLanguage, i18n } = useI18n();

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    changeLanguage(e.target.value);
  };

  return (
    <div className="inline-flex items-center gap-2.5">
      <Languages size={18} className="shrink-0 text-ink-2" />
      <select
        id="language-select"
        value={language}
        onChange={handleLanguageChange}
        aria-label={i18n('Language', 'Language')}
        className="bg-surface hover:border-primary/40 px-3 py-2 border border-line rounded-lg text-ink text-sm transition-colors outline-none focus:border-primary"
      >
        {Object.entries(LANGUAGE_CONFIG).map(([code, config]) => (
          <option key={code} value={code}>
            {config.nativeName}
          </option>
        ))}
      </select>
    </div>
  );
}
