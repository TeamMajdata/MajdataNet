import { useState } from "react";
import { Link } from "react-router-dom";
import { AiOutlineUser } from "react-icons/ai";
import { useLoc } from "@/hooks";
import {
  HAMBURGER_BUTTON_BASE,
  HAMBURGER_BUTTON_ACTIVE,
  HAMBURGER_BUTTON_HOVER,
} from "./styles";
import Dropdown from "./Dropdown";

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
        <Link
          to="/login"
          className="flex items-center gap-2 hover:bg-[#5C8DC1]/8 px-4 py-2 md:py-3 border border-black/10 hover:border-[#5C8DC1]/25 rounded-full min-h-10 font-medium text-gray-600 hover:text-[#5C8DC1] text-sm no-underline transition-transform hover:scale-105 active:scale-95"
        >
          <span className="text-sm">{loc("Login")}</span>
        </Link>
        <Link
          to="/register"
          className="flex items-center gap-2 bg-[#5C8DC1] hover:bg-[#4A7DAF] px-4 py-2 md:py-3 border border-transparent rounded-full min-h-10 font-medium text-white text-sm no-underline transition-transform hover:scale-105 active:scale-95"
        >
          <span className="text-sm">{loc("Register")}</span>
        </Link>
      </div>

      {/* 移动端：下拉菜单形式 */}
      <div className="md:hidden block relative">
        <button
          className={`${HAMBURGER_BUTTON_BASE} ${isMobileAuthMenuOpen ? HAMBURGER_BUTTON_ACTIVE : HAMBURGER_BUTTON_HOVER}`}
          onClick={() => setIsMobileAuthMenuOpen(!isMobileAuthMenuOpen)}
        >
          <AiOutlineUser className="font-medium text-gray-500 text-base" />
          <span className="text-[0.7rem] text-gray-400">▼</span>
        </button>

        <Dropdown
          isOpen={isMobileAuthMenuOpen}
          onClose={() => setIsMobileAuthMenuOpen(false)}
          
          className="p-4"
        >
          <Link
            to="/login"
            className="flex justify-center items-center gap-3 hover:bg-linear-to-br hover:from-[#5C8DC1]/10 hover:to-[#5C8DC1]/5 bg-none hover:shadow-[0_2px_8px_rgb(92_141_193/15%),0_1px_0_rgb(92_141_193/10%)_inset] px-5 py-4 border-none w-full font-medium text-gray-500 hover:text-[#5C8DC1] text-sm text-center no-underline cursor-pointer"
          >
            <span className="flex-1 w-full text-center">{loc("Login")}</span>
          </Link>
          <Link
            to="/register"
            className="flex justify-center items-center gap-3 bg-[#5C8DC1]/12 hover:bg-[#5C8DC1]/18 px-5 py-4 border-none w-full font-semibold text-[#5C8DC1] hover:text-[#4A7DAF] text-sm text-center no-underline cursor-pointer"
          >
            <span className="flex-1 w-full text-center">{loc("Register")}</span>
          </Link>
        </Dropdown>
      </div>
    </div>
  );
}
