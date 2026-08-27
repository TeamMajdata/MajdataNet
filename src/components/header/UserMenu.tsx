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
 * 用户下拉菜单组件（v4：白底扁平面板）
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
        className="cursor-pointer border-none bg-none p-0 transition-transform hover:scale-105 active:scale-95"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={username}
      >
        <img
          className={`w-9 h-9 rounded-full object-cover border transition-all ${
            isOpen ? "border-primary" : "border-line hover:border-primary"
          }`}
          src={endpoints.account.icon(username)}
          alt={username}
        />
      </button>

      <Dropdown
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        variant="user"
        className="w-56"
        containerRef={containerRef}
      >
        <div className="flex flex-col p-1.5 gap-0.5">
          {/* 用户信息头部 */}
          <div className="flex items-center gap-3 px-3 py-3 mb-1">
            <img
              className="w-10 h-10 rounded-full object-cover border border-line"
              src={endpoints.account.icon(username)}
              alt={username}
            />
            <span className="font-semibold text-ink truncate">{username}</span>
          </div>
          <Link to={`/space?id=${username}`} className={DESKTOP_DROPDOWN_ITEM}>
            <User className="w-4 h-4" />
            <span>{loc("PersonalHomePage")}</span>
          </Link>
          <Link to="/user/scores" className={DESKTOP_DROPDOWN_ITEM}>
            <BarChart3 className="w-4 h-4" />
            <span>{loc("PersonalScores")}</span>
          </Link>
          <Link to="/user/charts" className={DESKTOP_DROPDOWN_ITEM}>
            <Music className="w-4 h-4" />
            <span>{loc("ChartsManagement")}</span>
          </Link>
          <Link to="/user/collections" className={DESKTOP_DROPDOWN_ITEM}>
            <FolderHeart className="w-4 h-4" />
            <span>{loc("MyCollections", "我的歌单")}</span>
          </Link>
          <Link to="/user/profile" className={DESKTOP_DROPDOWN_ITEM}>
            <Settings className="w-4 h-4" />
            <span>{loc("AccountSetting")}</span>
          </Link>
          <div className={DIVIDER}></div>
          <button onClick={handleLogout} className={DESKTOP_DROPDOWN_ITEM}>
            <LogOut className="w-4 h-4 text-danger" />
            <span className="text-danger">{loc("Logout")}</span>
          </button>
        </div>
      </Dropdown>
    </div>
  );
}
