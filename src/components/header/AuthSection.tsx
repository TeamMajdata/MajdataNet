import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AiOutlineUser } from 'react-icons/ai';
import { LuLogIn, LuUserPlus } from 'react-icons/lu';
import { HAMBURGER_BUTTON_BASE, HAMBURGER_BUTTON_ACTIVE, HAMBURGER_BUTTON_HOVER } from './styles';
import Dropdown from './Dropdown';

/**
 * 登录/注册按钮组件（未登录状态）
 */
export default function AuthSection() {
  const { t } = useTranslation();
  const [isMobileAuthMenuOpen, setIsMobileAuthMenuOpen] = useState(false);

  return (
    <div className="relative">
      {/* 桌面端：传统链接形式 */}
      <div className="hidden md:flex items-center gap-2">
        <Link to="/login" className="flex items-center gap-1.5 hover:bg-white/[0.06] px-3 rounded-lg h-9 font-medium text-white/75 hover:text-white text-sm no-underline transition-colors duration-150">
          <LuLogIn aria-hidden="true" className="w-4 h-4" />
          <span className="text-sm">{t("shared/AuthSection.Login")}</span>
        </Link>
        <Link to="/register" className="flex items-center gap-1.5 bg-blue-500 hover:bg-blue-400 shadow-[0_1px_0_rgb(255_255_255/18%)_inset] px-3 rounded-lg h-9 font-medium text-white text-sm no-underline transition-colors duration-150">
          <LuUserPlus aria-hidden="true" className="w-4 h-4" />
          <span className="text-sm">{t("shared/AuthSection.Register")}</span>
        </Link>
      </div>

      {/* 移动端：下拉菜单形式 */}
      <div className="md:hidden block relative">
        <button
          className={`${HAMBURGER_BUTTON_BASE} w-10 px-0 ${isMobileAuthMenuOpen ? HAMBURGER_BUTTON_ACTIVE : HAMBURGER_BUTTON_HOVER}`}
          onClick={() => setIsMobileAuthMenuOpen(!isMobileAuthMenuOpen)}
          aria-expanded={isMobileAuthMenuOpen}
          aria-label={t("shared/AuthSection.AccountActions")}
        >
          <AiOutlineUser aria-hidden="true" className="w-[18px] h-[18px] text-white/85" />
        </button>

        <Dropdown isOpen={isMobileAuthMenuOpen} onClose={() => setIsMobileAuthMenuOpen(false)} position="right" className="p-1.5 w-[min(13rem,calc(100vw-1.5rem))]">
          <Link to="/login" onClick={() => setIsMobileAuthMenuOpen(false)} className="flex items-center gap-2.5 hover:bg-white/[0.06] px-3.5 rounded-lg w-full h-11 font-medium text-white/85 hover:text-white text-sm no-underline transition-colors">
            <LuLogIn aria-hidden="true" className="w-4 h-4" />
            <span>{t("shared/AuthSection.Login")}</span>
          </Link>
          <Link to="/register" onClick={() => setIsMobileAuthMenuOpen(false)} className="flex items-center gap-2.5 bg-blue-500/15 hover:bg-blue-500/25 mt-1 px-3.5 rounded-lg w-full h-11 font-medium text-blue-200 hover:text-white text-sm no-underline transition-colors">
            <LuUserPlus aria-hidden="true" className="w-4 h-4" />
            <span>{t("shared/AuthSection.Register")}</span>
          </Link>
        </Dropdown>
      </div>
    </div>
  );
}
