import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '@/i18n';
import { LANGUAGE_CONFIG, SUPPORTED_LANGUAGES } from '@/config/i18n';
import Dropdown from './Dropdown';

/** 顶栏右上角的语言切换菜单 */
export default function LanguageMenu() {
  const { t, i18n } = useTranslation();
  const language = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        className={`flex items-center gap-1.5 px-2.5 border rounded-xl h-10 md:h-9 font-medium text-white/75 hover:text-white text-sm transition-colors duration-150 cursor-pointer touch-manipulation ${
          isOpen ? 'bg-white/10 border-white/20 text-white' : 'border-transparent hover:bg-white/[0.06]'
        }`}
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label={t("shared/LanguageSelector.Language")}
      >
        <svg aria-hidden="true" viewBox="0 0 20 20" className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="10" cy="10" r="7.25" />
          <path d="M2.75 10h14.5M10 2.75c2 2.1 3 4.5 3 7.25s-1 5.15-3 7.25c-2-2.1-3-4.5-3-7.25s1-5.15 3-7.25Z" strokeLinejoin="round" />
        </svg>
        <span className="hidden lg:inline">{LANGUAGE_CONFIG[language].nativeName}</span>
      </button>

      <Dropdown
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        position="right"
        containerRef={containerRef}
        className="p-1.5 min-w-40!"
      >
        <ul className="flex flex-col gap-0.5 m-0 p-0 list-none" role="menu">
          {SUPPORTED_LANGUAGES.map((code) => {
            const selected = code === language;
            return (
              <li key={code} role="none">
                <button
                  type="button"
                  role="menuitemradio"
                  aria-checked={selected}
                  lang={LANGUAGE_CONFIG[code].locale}
                  className={`flex justify-between items-center gap-3 px-3 rounded-lg w-full h-10 text-sm text-left transition-colors cursor-pointer ${
                    selected ? 'bg-blue-400/10 text-blue-100' : 'text-white/75 hover:bg-white/[0.06] hover:text-white'
                  }`}
                  onClick={() => {
                    void i18n.changeLanguage(code);
                    setIsOpen(false);
                  }}
                >
                  {LANGUAGE_CONFIG[code].nativeName}
                  {selected && (
                    <svg aria-hidden="true" viewBox="0 0 16 16" className="w-4 h-4 text-blue-300" fill="none">
                      <path d="m3.5 8.5 3 3 6-7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </Dropdown>
    </div>
  );
}
