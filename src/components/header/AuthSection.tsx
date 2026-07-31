import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AiOutlineUser } from 'react-icons/ai';
import { useLoc } from '@/hooks';
import { HAMBURGER_BUTTON_BASE, HAMBURGER_BUTTON_ACTIVE, HAMBURGER_BUTTON_HOVER } from './styles';
import Dropdown from './Dropdown';

/**
 * 登录/注册按钮组件（未登录状态）
 */
export default function AuthSection() {
  const loc = useLoc();
  const [isMobileAuthMenuOpen, setIsMobileAuthMenuOpen] = useState(false);

  return (
    <div className="relative">
      {/* 桌面端：传统链接形式 */}
      <div className="hidden md:flex items-center gap-2">
        <Link to="/login" className="flex items-center gap-2 hover:bg-white/10 px-4 py-2 md:py-3 border border-white/10 hover:border-white/30 rounded-[10px] min-h-10 font-medium text-white/85 hover:text-white text-sm no-underline">
          <span className="text-sm">{loc('Login')}</span>
        </Link>
        <Link to="/register" className="flex items-center gap-2 bg-linear-to-br from-[#10b981] hover:from-[#059669] to-[#059669] hover:to-[#047857] px-4 py-2 md:py-3 border border-transparent rounded-[10px] min-h-10 font-medium text-white text-sm no-underline">
          <span className="text-sm">{loc('Register')}</span>
        </Link>
      </div>

      {/* 移动端：下拉菜单形式 */}
      <div className="md:hidden block relative">
        <button
          className={`${HAMBURGER_BUTTON_BASE} ${isMobileAuthMenuOpen ? HAMBURGER_BUTTON_ACTIVE : HAMBURGER_BUTTON_HOVER}`}
          onClick={() => setIsMobileAuthMenuOpen(!isMobileAuthMenuOpen)}
          aria-expanded={isMobileAuthMenuOpen}
          aria-label={loc('AccountActions', '账户操作')}
        >
          <AiOutlineUser className="font-medium text-white/85 text-base" />
          <span className="text-[0.7rem] text-white/60">▼</span>
        </button>

        <Dropdown isOpen={isMobileAuthMenuOpen} onClose={() => setIsMobileAuthMenuOpen(false)} position="right" className="p-2 w-[min(15rem,calc(100vw-1.5rem))]">
          <Link to="/login" onClick={() => setIsMobileAuthMenuOpen(false)} className="flex justify-center items-center gap-3 hover:bg-linear-to-br hover:from-white/12 hover:to-white/8 bg-none hover:shadow-[0_2px_8px_rgb(255_255_255/10%),0_1px_0_rgb(255_255_255/10%)_inset] px-5 py-4 border-none w-full min-h-11 font-medium text-white/85 hover:text-white text-sm text-center no-underline cursor-pointer">
            <span className="flex-1 w-full text-center">{loc('Login')}</span>
          </Link>
          <Link to="/register" onClick={() => setIsMobileAuthMenuOpen(false)} className="flex justify-center items-center gap-3 bg-linear-to-br from-[rgb(16_185_129/20%)] hover:from-[rgb(16_185_129/30%)] to-[rgb(5_150_105/15%)] hover:to-[rgb(5_150_105/25%)] px-5 py-4 border-none w-full min-h-11 font-semibold text-[#10b981] hover:text-[#34d399] text-sm text-center no-underline cursor-pointer">
            <span className="flex-1 w-full text-center">{loc('Register')}</span>
          </Link>
        </Dropdown>
      </div>
    </div>
  );
}
