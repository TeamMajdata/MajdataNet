import { useState } from 'react';
import { loc } from '@/utils';
import { LanguageSelector } from '@/components';
import { useTheme } from '@/hooks';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUp, Languages, Moon, Sun, X } from 'lucide-react';

/**
 * 浮动按钮组件（v4：白底圆形 + 细边框 + 轻阴影）
 * 包含返回顶部、主题切换和语言设置按钮
 */
export default function FloatingButtons() {
  const [showLanguagePopup, setShowLanguagePopup] = useState(false);
  const { theme, toggleTheme } = useTheme();

  // 共用的按钮基础类名
  const baseButtonClasses =
    "w-12 h-12 bg-surface border border-line shadow-card rounded-full text-ink-2 cursor-pointer flex items-center justify-center font-bold no-underline relative outline-none p-0 m-0 leading-none text-center";

  const hoverStyle = {
    borderColor: 'rgba(92, 141, 193, 0.5)',
    color: 'var(--primary)',
    y: -3,
  };

  const activeStyle = {
    backgroundColor: 'var(--primary-soft)',
    y: -1,
  };

  return (
    <>
      {/* Floating Buttons */}
      <div className="right-8 sm:right-4 md:right-6 bottom-8 sm:bottom-4 md:bottom-6 z-100 fixed flex flex-col items-center gap-3 sm:gap-2 md:gap-3">
        {/* Go to Top Button */}
        <motion.button
          className={baseButtonClasses}
          onClick={() => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          whileHover={hoverStyle}
          whileTap={activeStyle}
          transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
          aria-label="回到顶部"
        >
          <ArrowUp size={20} />
        </motion.button>

        {/* Theme Toggle Button */}
        <motion.button
          className={baseButtonClasses}
          onClick={toggleTheme}
          whileHover={hoverStyle}
          whileTap={activeStyle}
          transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
          aria-label={theme === 'dark' ? '切换到亮色模式' : '切换到暗色模式'}
        >
          {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
        </motion.button>

        {/* Language Settings Button */}
        <motion.button
          className={baseButtonClasses}
          onClick={() => setShowLanguagePopup(!showLanguagePopup)}
          whileHover={hoverStyle}
          whileTap={activeStyle}
          transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
          aria-label={loc('LanguageSettings')}
        >
          <Languages size={20} />
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
              transition={{ duration: 0.15 }}
              className="z-998 fixed inset-0 bg-black/40"
              onClick={() => setShowLanguagePopup(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, x: "-50%", y: "-50%" }}
              animate={{ opacity: 1, scale: 1, x: "-50%", y: "-50%" }}
              exit={{ opacity: 0, scale: 0.95, x: "-50%", y: "-50%" }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="top-1/2 left-1/2 z-999 fixed bg-surface border border-line shadow-card-hover md:mx-4 p-6 md:p-5 rounded-xl min-w-87.5 md:min-w-70 max-w-100 md:max-w-[90vw]"
            >
              <h4 className="m-0 mb-6 font-semibold text-[1.1rem] text-ink text-center">
                {loc('SelectLanguage', 'Language')}
              </h4>
              <button
                className="top-4 right-4 absolute flex justify-center items-center bg-transparent hover:bg-primary-soft p-0 border-0 rounded w-6 h-6 text-ink-3 hover:text-ink transition-colors duration-150 cursor-pointer"
                onClick={() => setShowLanguagePopup(false)}
                aria-label="close"
              >
                <X size={16} />
              </button>
              <LanguageSelector />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
