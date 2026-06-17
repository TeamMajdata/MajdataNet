import { useState, useRef } from "react";
import { Link } from "react-router-dom";
import { useLoc } from "@/hooks";
import { handleLogout as logoutUtil } from "@/utils";
import { endpoints } from "@/config/api";
import { DIVIDER } from "./styles";
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
        className={`flex rounded-full items-center gap-2 md:gap-3 pl-1 pr-3 cursor-pointer text-gray-600 text-sm font-medium h-10 md:h-12 bg-black/5 border border-black/10 backdrop-blur-[10px] ${
          isOpen
            ? "bg-linear-to-br from-[#5C8DC1]/12 to-[#5C8DC1]/6 border-[#5C8DC1]/25 shadow-[0_8px_25px_rgb(0_0_0/10%),0_1px_0_rgb(92_141_193/15%)_inset]"
            : "hover:bg-linear-to-br hover:from-[#5C8DC1]/10 hover:to-[#5C8DC1]/5 hover:border-[#5C8DC1]/20 hover:shadow-[0_8px_25px_rgb(0_0_0/8%),0_1px_0_rgb(92_141_193/10%)_inset]"
        }`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <img
          className={`w-7 h-7 md:w-9 md:h-9 rounded-full border-2 object-cover ${isOpen ? "border-[#5C8DC1]/40" : "border-black/10 hover:border-[#5C8DC1]/40"}`}
          src={endpoints.account.icon(username)}
          alt={username}
        />
        <span className="hidden md:inline max-w-30 overflow-hidden font-medium text-ellipsis whitespace-nowrap">
          {username}
        </span>
      </button>

      <Dropdown
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        position="right"
        className="w-full"
        containerRef={containerRef}
      >
        <Link
          to={`/space?id=${username}`}
          className="flex justify-center items-center gap-3 hover:bg-linear-to-br hover:from-[#5C8DC1]/10 hover:to-[#5C8DC1]/5 bg-none hover:shadow-[0_2px_8px_rgb(92_141_193/15%),0_1px_0_rgb(92_141_193/10%)_inset] px-5 py-4 border-none w-full font-medium text-gray-500 hover:text-[#5C8DC1] text-sm text-center no-underline cursor-pointer"
        >
          <span className="w-full font-medium text-center">
            {loc("PersonalHomePage")}
          </span>
        </Link>
        <Link
          to="/user/scores"
          className="flex justify-center items-center gap-3 hover:bg-linear-to-br hover:from-[#5C8DC1]/10 hover:to-[#5C8DC1]/5 bg-none hover:shadow-[0_2px_8px_rgb(92_141_193/15%),0_1px_0_rgb(92_141_193/10%)_inset] px-5 py-4 border-none w-full font-medium text-gray-500 hover:text-[#5C8DC1] text-sm text-center no-underline cursor-pointer"
        >
          <span className="w-full font-medium text-center">
            {loc("PersonalScores")}
          </span>
        </Link>
        <Link
          to="/user/charts"
          className="flex justify-center items-center gap-3 hover:bg-linear-to-br hover:from-[#5C8DC1]/10 hover:to-[#5C8DC1]/5 bg-none hover:shadow-[0_2px_8px_rgb(92_141_193/15%),0_1px_0_rgb(92_141_193/10%)_inset] px-5 py-4 border-none w-full font-medium text-gray-500 hover:text-[#5C8DC1] text-sm text-center no-underline cursor-pointer"
        >
          <span className="w-full font-medium text-center">
            {loc("ChartsManagement")}
          </span>
        </Link>
        <Link
          to="/user/collections"
          className="flex justify-center items-center gap-3 hover:bg-linear-to-br hover:from-[#5C8DC1]/10 hover:to-[#5C8DC1]/5 bg-none hover:shadow-[0_2px_8px_rgb(92_141_193/15%),0_1px_0_rgb(92_141_193/10%)_inset] px-5 py-4 border-none w-full font-medium text-gray-500 hover:text-[#5C8DC1] text-sm text-center no-underline cursor-pointer"
        >
          <span className="w-full font-medium text-center">
            {loc("MyCollections", "我的歌单")}
          </span>
        </Link>
        <Link
          to="/user/profile"
          className="flex justify-center items-center gap-3 hover:bg-linear-to-br hover:from-[#5C8DC1]/10 hover:to-[#5C8DC1]/5 bg-none hover:shadow-[0_2px_8px_rgb(92_141_193/15%),0_1px_0_rgb(92_141_193/10%)_inset] px-5 py-4 border-none w-full font-medium text-gray-500 hover:text-[#5C8DC1] text-sm text-center no-underline cursor-pointer"
        >
          <span className="w-full font-medium text-center">
            {loc("AccountSetting")}
          </span>
        </Link>
        <div className={DIVIDER}></div>
        <button
          onClick={handleLogout}
          className="flex justify-center items-center gap-3 hover:bg-linear-to-br hover:from-[rgb(239_68_68/10%)] hover:to-[rgb(220_38_38/5%)] bg-none hover:shadow-[0_2px_8px_rgb(239_68_68/15%),0_1px_0_rgb(255_255_255/10%)_inset] px-5 py-4 border-none w-full font-medium text-gray-500 hover:text-red-500 text-sm text-center no-underline cursor-pointer"
        >
          <span className="w-full font-medium text-center">
            {loc("Logout")}
          </span>
        </button>
      </Dropdown>
    </div>
  );
}
