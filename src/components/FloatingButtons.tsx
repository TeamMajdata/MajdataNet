import { useState } from 'react';
import { loc } from '@/utils';
import LanguageSelector from './LanguageSelector';

/**
 * 浮动按钮组件
 * 包含返回顶部和语言设置按钮
 */
export default function FloatingButtons() {
  const [showLanguagePopup, setShowLanguagePopup] = useState(false);
  const [isHoveringTop, setIsHoveringTop] = useState(false);
  const [isHoveringLang, setIsHoveringLang] = useState(false);
  const [isActiveTop, setIsActiveTop] = useState(false);
  const [isActiveLang, setIsActiveLang] = useState(false);

  // 共用的按钮基础类名
  const baseButtonClasses = "w-14 h-14 md:w-[50px] md:h-[50px] sm:w-11 sm:h-11 bg-[rgba(255,255,255,0.05)] rounded-full text-white cursor-pointer transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] backdrop-blur-[10px] flex items-center justify-center font-bold no-underline relative outline-none p-0 m-0 leading-none text-center";
  
  const getButtonStyle = (isHovering: boolean, isActive: boolean) => ({
    boxShadow: isActive 
      ? '0 6px 20px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.05)'
      : isHovering
      ? '0 12px 35px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1)'
      : '0 20px 60px rgba(0, 0, 0, 0.4), 0 8px 32px rgba(0, 0, 0, 0.2), 0 2px 0 rgba(255, 255, 255, 0.08) inset',
    background: isHovering ? 'rgba(45, 45, 50, 0.95)' : 'rgba(255, 255, 255, 0.05)',
    transform: isActive ? 'translateY(-1px)' : isHovering ? 'translateY(-3px)' : 'translateY(0)',
  });

  return (
    <>
      {/* Floating Buttons */}
      <div className="right-8 sm:right-4 md:right-6 bottom-8 sm:bottom-4 md:bottom-6 z-100 fixed flex flex-col items-center gap-4 sm:gap-2 md:gap-3">
        {/* Go to Top Button */}
        <button
          className={`${baseButtonClasses} text-[1.2rem] md:text-[1.1rem] sm:text-[1rem] select-none`}
          style={getButtonStyle(isHoveringTop, isActiveTop)}
          onClick={() => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          onMouseEnter={() => setIsHoveringTop(true)}
          onMouseLeave={() => setIsHoveringTop(false)}
          onMouseDown={() => setIsActiveTop(true)}
          onMouseUp={() => setIsActiveTop(false)}
          aria-label="回到顶部"
        >
          ↑
        </button>

        {/* Language Settings Button */}
        <button
          className={`${baseButtonClasses} text-[1.2rem] md:text-[1.1rem] sm:text-[1rem]`}
          style={getButtonStyle(isHoveringLang, isActiveLang)}
          onClick={() => setShowLanguagePopup(!showLanguagePopup)}
          onMouseEnter={() => setIsHoveringLang(true)}
          onMouseLeave={() => setIsHoveringLang(false)}
          onMouseDown={() => setIsActiveLang(true)}
          onMouseUp={() => setIsActiveLang(false)}
          aria-label={loc('LanguageSettings')}
        >
          🌐
        </button>
      </div>

      {/* Language Popup */}
      {showLanguagePopup && (
        <>
          <div
            className="z-998 fixed inset-0 bg-black/50"
            onClick={() => setShowLanguagePopup(false)}
          />
          <div 
            className="top-1/2 left-1/2 z-999 fixed bg-[rgba(25,25,30,0.95)] backdrop-blur-[20px] md:mx-4 p-6 md:p-5 border border-white/15 rounded-2xl min-w-87.5 md:min-w-70 max-w-100 md:max-w-[90vw] -translate-x-1/2 -translate-y-1/2"
            style={{
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5), 0 4px 20px rgba(59, 130, 246, 0.1)',
              animation: 'popupFadeIn 0.2s ease-out'
            }}
          >
            <h4 className="m-0 mb-6 font-semibold text-[1.1rem] text-white text-center">
              {loc('SelectLanguage')} / Language
            </h4>
            <button
              className="top-4 right-4 absolute flex justify-center items-center bg-transparent hover:bg-white/10 p-0 border-0 rounded w-6 h-6 text-[#a0a0a0] hover:text-white text-2xl transition-all duration-200 cursor-pointer"
              onClick={() => setShowLanguagePopup(false)}
            >
              ×
            </button>
            <LanguageSelector />
          </div>
        </>
      )}

      {/* Animation keyframes */}
      <style>{`
        @keyframes popupFadeIn {
          from {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.9);
          }
          to {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }
        }
      `}</style>
    </>
  );
}
