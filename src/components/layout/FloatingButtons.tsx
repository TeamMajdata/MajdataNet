import { motion } from 'framer-motion';

/**
 * 浮动按钮组件
 * 返回顶部按钮（语言设置已移到顶栏）
 */
export default function FloatingButtons() {
  // 共用的按钮基础类名
  const baseButtonClasses = "w-11 h-11 md:w-[50px] md:h-[50px] bg-[rgba(255,255,255,0.08)] rounded-full text-white cursor-pointer backdrop-blur-[10px] flex items-center justify-center font-bold no-underline relative outline-none p-0 m-0 leading-none text-center shadow-[0_20px_60px_rgba(0,0,0,0.4),0_8px_32px_rgba(0,0,0,0.2),inset_0_2px_0_rgba(255,255,255,0.08)] touch-manipulation";

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
    <div className="right-3 sm:right-4 md:right-6 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] sm:bottom-4 md:bottom-6 z-100 fixed flex flex-col items-center gap-2 md:gap-3">
      {/* Go to Top Button */}
      <motion.button
        className={`${baseButtonClasses} text-base md:text-[1.1rem] select-none`}
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
    </div>
  );
}
