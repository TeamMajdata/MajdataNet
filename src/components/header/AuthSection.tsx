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
      {/* 桌面端：合并登录/注册按钮 */}
      <div className="hidden md:flex items-center">
        <Link
          to="/login"
          className="flex items-center gap-2 px-5 py-2 md:py-3 min-h-10 font-medium text-white/80 hover:text-white text-sm no-underline transition-all duration-200 hover:scale-105 active:scale-95"
        >
          <AiOutlineUser className="text-white text-base" />
          <span className="text-sm">
            {loc("Login")} / {loc("Register")}
          </span>
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
            className="flex justify-center items-center gap-3 bg-white hover:bg-gray-50 px-5 py-4 border border-gray-200 rounded-xl w-full font-medium text-gray-700 hover:text-gray-900 text-sm text-center no-underline shadow-sm hover:shadow-md cursor-pointer transition-all duration-200"
          >
            <AiOutlineUser className="text-gray-500" />
            <span className="flex-1 w-full text-center">
              {loc("Login")} / {loc("Register")}
            </span>
          </Link>
        </Dropdown>
      </div>
    </div>
  );
}
