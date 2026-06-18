import { useState, useRef } from "react";
import { Link } from "react-router-dom";
import { useLoc } from "@/hooks";
import {
  User,
  BarChart3,
  Music,
  FolderHeart,
  Settings,
  LogOut,
} from "lucide-react";
import { handleLogout as logoutUtil } from "@/utils";
import { endpoints } from "@/config/api";
import { DIVIDER, DESKTOP_DROPDOWN_ITEM } from "./styles";
import Dropdown from "./Dropdown";

interface UserMenuProps {
  username: string;
}

/**
 * 用户下拉菜单组件
 */
export default function UserMenu({ username }: UserMenuProps) {
  const loc = useLoc();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleLogout = async () => {
    await logoutUtil(
      () => {
        setIsOpen(false);
        window.location.href = "/";
      },
      (error) => {
        console.error(loc("LogoutFailed"), error);
        setIsOpen(false);
        window.location.href = "/";
      },
    );
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        className="cursor-pointer border-none bg-none p-0 transition-transform hover:scale-110 active:scale-95"
        onClick={() => setIsOpen(!isOpen)}
      >
        <img
          className={`w-9 h-9 rounded-full object-cover ring-2 ring-offset-1 transition-all ${
            isOpen
              ? "ring-[#5C8DC1] ring-offset-[#5C8DC1]/15"
              : "ring-black/10 ring-offset-transparent hover:ring-[#5C8DC1]/50"
          }`}
          src={endpoints.account.icon(username)}
          alt={username}
        />
      </button>

      <Dropdown
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        variant="auto"
        className="w-full"
        containerRef={containerRef}
      >
        <div className="hidden xl:flex flex-row items-end gap-1 absolute bottom-4 left-4">
          <img
            className="w-20 h-20 rounded-full object-cover ring-2 ring-white border-4 border-[#5C8DC1]"
            src={endpoints.account.icon(username)}
            alt={username}
          />
          <span className="font-semibold text-white text-6xl">{username}</span>
        </div>
        <Link to={`/space?id=${username}`} className={DESKTOP_DROPDOWN_ITEM}>
          <User className="w-8 h-8 text-white" />
          <span className="text-2xl font-black text-white/50 group-hover:text-white [-webkit-text-stroke:0.4px_rgba(255,255,255,0.5)] group-hover:[-webkit-text-stroke:0] transition-all duration-300">
            {loc("PersonalHomePage")}
          </span>
        </Link>
        <Link to="/user/scores" className={DESKTOP_DROPDOWN_ITEM}>
          <BarChart3 className="w-8 h-8 text-white" />
          <span className="text-2xl font-black text-white/50 group-hover:text-white [-webkit-text-stroke:0.4px_rgba(255,255,255,0.5)] group-hover:[-webkit-text-stroke:0] transition-all duration-300">
            {loc("PersonalScores")}
          </span>
        </Link>
        <Link to="/user/charts" className={DESKTOP_DROPDOWN_ITEM}>
          <Music className="w-8 h-8 text-white" />
          <span className="text-2xl font-black text-white/50 group-hover:text-white [-webkit-text-stroke:0.4px_rgba(255,255,255,0.5)] group-hover:[-webkit-text-stroke:0] transition-all duration-300">
            {loc("ChartsManagement")}
          </span>
        </Link>
        <Link to="/user/collections" className={DESKTOP_DROPDOWN_ITEM}>
          <FolderHeart className="w-8 h-8 text-white" />
          <span className="text-2xl font-black text-white/50 group-hover:text-white [-webkit-text-stroke:0.4px_rgba(255,255,255,0.5)] group-hover:[-webkit-text-stroke:0] transition-all duration-300">
            {loc("MyCollections", "我的歌单")}
          </span>
        </Link>
        <Link to="/user/profile" className={DESKTOP_DROPDOWN_ITEM}>
          <Settings className="w-8 h-8 text-white" />
          <span className="text-2xl font-black text-white/50 group-hover:text-white [-webkit-text-stroke:0.4px_rgba(255,255,255,0.5)] group-hover:[-webkit-text-stroke:0] transition-all duration-300">
            {loc("AccountSetting")}
          </span>
        </Link>
        <div className={DIVIDER}></div>
        <button onClick={handleLogout} className={DESKTOP_DROPDOWN_ITEM}>
          <LogOut className="w-8 h-8 text-red-300" />
          <span className="text-2xl font-black text-red-300/50 group-hover:text-red-300 [-webkit-text-stroke:0.4px_rgba(252,165,165,0.5)] group-hover:[-webkit-text-stroke:0] transition-all duration-300">
            {loc("Logout")}
          </span>
        </button>
      </Dropdown>
    </div>
  );
}
