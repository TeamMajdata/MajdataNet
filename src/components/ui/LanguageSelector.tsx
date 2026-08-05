/**
 * 语言选择器组件
 */
import { useI18n } from '@/hooks/useI18n';
import { LANGUAGE_CONFIG } from '@/config/i18n';

export default function LanguageSelector() {
  const { language, changeLanguage, i18n } = useI18n();

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    changeLanguage(e.target.value);
  };

  return (
    <div className="inline-flex items-center gap-2">
      <label htmlFor="language-select" className="font-medium text-gray-700 text-sm">
        {i18n("shared/LanguageSelector.Language", '语言')}:
      </label>
      <select
        id="language-select"
        value={language}
        onChange={handleLanguageChange}
        className="bg-white shadow-sm px-3 py-2 border border-gray-300 hover:border-gray-400 focus:border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700 transition-colors"
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
