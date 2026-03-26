import { useState } from 'react';
import { loc } from '@/utils';
import LanguageSelector from './LanguageSelector';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * 浮动按钮组件
 * 包含返回顶部和语言设置按钮
 */
export default function FloatingButtons() {
  const [showLanguagePopup, setShowLanguagePopup] = useState(false);

  // 共用的按钮基础类名
  const baseButtonClasses = "w-14 h-14 md:w-[50px] md:h-[50px] sm:w-11 sm:h-11 bg-[rgba(255,255,255,0.05)] rounded-full text-white cursor-pointer backdrop-blur-[10px] flex items-center justify-center font-bold no-underline relative outline-none p-0 m-0 leading-none text-center shadow-[0_20px_60px_rgba(0,0,0,0.4),0_8px_32px_rgba(0,0,0,0.2),inset_0_2px_0_rgba(255,255,255,0.08)]";

  const hoverStyle = {
    backgroundColor: 'rgba(45, 45, 50, 0.95)',
    boxShadow: '0 12px 35px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1)',
    y: -3
  };

  const activeStyle = {
    backgroundColor: 'rgba(45, 45, 50, 0.95)',
    boxShadow: '0 6px 20px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.05)',
    y: -1
  };

  return (
    <>
      {/* Floating Buttons */}
      <div className="right-8 sm:right-4 md:right-6 bottom-8 sm:bottom-4 md:bottom-6 z-100 fixed flex flex-col items-center gap-4 sm:gap-2 md:gap-3">
        {/* Go to Top Button */}
        <motion.button
          className={`${baseButtonClasses} text-[1.2rem] md:text-[1.1rem] sm:text-[1rem] select-none`}
          onClick={() => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          whileHover={hoverStyle}
          whileTap={activeStyle}
          transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
          aria-label="回到顶部"
        >
          ↑
        </motion.button>

        {/* Language Settings Button */}
        <motion.button
          className={`${baseButtonClasses} text-[1.2rem] md:text-[1.1rem] sm:text-[1rem]`}
          onClick={() => setShowLanguagePopup(!showLanguagePopup)}
          whileHover={hoverStyle}
          whileTap={activeStyle}
          transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
          aria-label={loc('LanguageSettings')}
        >
          🌐
        </motion.button>
      </div>

      {/* Language Popup */}
      <AnimatePresence>
        {showLanguagePopup && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="z-998 fixed inset-0 bg-black/50"
              onClick={() => setShowLanguagePopup(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, x: "-50%", y: "-50%" }}
              animate={{ opacity: 1, scale: 1, x: "-50%", y: "-50%" }}
              exit={{ opacity: 0, scale: 0.9, x: "-50%", y: "-50%" }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="top-1/2 left-1/2 z-999 fixed bg-[rgba(25,25,30,0.95)] backdrop-blur-[20px] md:mx-4 p-6 md:p-5 border border-white/15 rounded-2xl min-w-87.5 md:min-w-70 max-w-100 md:max-w-[90vw]"
              style={{
                boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5), 0 4px 20px rgba(59, 130, 246, 0.1)',
              }}
            >
              <h4 className="m-0 mb-6 font-semibold text-[1.1rem] text-white text-center">
                {loc('SelectLanguage', 'Language')}
              </h4>
              <button
                className="top-4 right-4 absolute flex justify-center items-center bg-transparent hover:bg-white/10 p-0 border-0 rounded w-6 h-6 text-[#a0a0a0] hover:text-white text-2xl transition-all duration-200 cursor-pointer"
                onClick={() => setShowLanguagePopup(false)}
              >
                ×
              </button>
              <LanguageSelector />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
